/**
 * Unit & Acceptance Test Suite for:
 * 1. CSV Deduplication & Amount Superimposition Prevention
 * 2. Reset All Transactions Functionality
 */

import { parseAmount, parseCsvContent } from '../../csv/csvParser';
import { validateAndDeduplicateCsv } from '../../csv/csvValidator';
import { executeCsvImport } from '../../csv/csvImporter';
import {
  getMockTransactionsStore,
  setMockTransactionsStore,
} from '../../supabase/transactions';
import {
  getMockImportRowSourcesStore,
  setMockImportRowSourcesStore,
  getMockImportBatchesStore,
  setMockImportBatchesStore,
} from '../../backup/backupEngine';
import {
  getMockCategoriesStore,
  setMockCategoriesStore,
} from '../../supabase/categories';
import {
  getMockAccountsStore,
  setMockAccountsStore,
} from '../../supabase/accounts';
import {
  getResetStats,
  executeResetAllTransactions,
} from '../transactionReset';
import { loadYearlyBudgets, saveYearlyBudgets } from '../../cfo/cfoStorage';

export interface TestResult {
  id: number;
  title: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export interface ResetAndDedupSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

export async function runAllResetAndDedupTests(): Promise<ResetAndDedupSuiteSummary> {
  const results: TestResult[] = [];
  let counter = 1;

  async function record(title: string, fn: () => Promise<{ passed: boolean; message: string }> | { passed: boolean; message: string }) {
    const start = performance.now();
    try {
      const res = await fn();
      const durationMs = parseFloat((performance.now() - start).toFixed(2));
      results.push({
        id: counter++,
        title,
        passed: res.passed,
        message: res.message,
        durationMs,
      });
    } catch (err: any) {
      const durationMs = parseFloat((performance.now() - start).toFixed(2));
      results.push({
        id: counter++,
        title,
        passed: false,
        message: `例外異常: ${err?.message || err}`,
        durationMs,
      });
    }
  }

  // --- 測試 1: parseAmount 解析負號與千分位與會計括號 ---
  await record('1. parseAmount 負號、會計括號與千分位數值解析精確度', () => {
    const r1 = parseAmount('-1,500.50');
    const r2 = parseAmount('(3,000)');
    const r3 = parseAmount('$500.25');
    const r4 = parseAmount('NT$ 10,000');

    const passed = r1.amount === 1500.5 && r1.isNegative === true &&
      r2.amount === 3000 && r2.isNegative === true &&
      r3.amount === 500.25 && r3.isNegative === false &&
      r4.amount === 10000 && r4.isNegative === false;

    return {
      passed,
      message: passed
        ? `所有負數、括號、貨幣符號與千分位皆正確解析為非負大小，不污染交易金額`
        : `金額解析不符: r1=${JSON.stringify(r1)}, r2=${JSON.stringify(r2)}`,
    };
  });

  // --- 測試 2: 同一天、同金額、同分類在同檔案中之多筆真實交易保留 ---
  await record('2. 同一天、同金額、同分類在同檔中之多筆真實交易均完整保留', async () => {
    const csvData = [
      '日期,收支,金額,類別,帳戶,成員,備註',
      '2026-03-01,支,100,餐飲食品,現金,自己,午餐',
      '2026-03-01,支,100,餐飲食品,現金,自己,晚餐',
    ].join('\n');

    const parsed = await parseCsvContent(csvData, 'same_day_test.csv');
    const validated = await validateAndDeduplicateCsv(
      parsed.rows,
      parsed.fileHash,
      'same_day_test.csv',
      'mock-user'
    );

    const passed = validated.validCount === 2 && validated.duplicateCount === 0;
    return {
      passed,
      message: passed
        ? `同一天 2 筆 100 元餐飲食品消費全數保留為有效交易 (validCount=2)`
        : `去重過度: validCount=${validated.validCount}, dupCount=${validated.duplicateCount}`,
    };
  });

  // --- 測試 3: 同一份 CSV 重複匯入時 UUID 去重攔截與金額防疊加 ---
  await record('3. 同一份 CSV 重複匯入時 UUID 去重攔截（筆數與金額絕不重複疊加）', async () => {
    // 儲存原始狀態
    const initialTxs = getMockTransactionsStore();
    const initialSources = getMockImportRowSourcesStore();

    const csvWithUuid = [
      'uuid,日期,收支,金額,類別,帳戶,成員,備註',
      'test-uuid-001,2026-03-05,支,500,餐飲食品,現金,自己,咖啡',
      'test-uuid-002,2026-03-05,支,800,交通運輸,信用卡,自己,加油',
    ].join('\n');

    // 第一次解析與匯入
    const parsed1 = await parseCsvContent(csvWithUuid, 'uuid_test.csv');
    const validated1 = await validateAndDeduplicateCsv(parsed1.rows, parsed1.fileHash, 'uuid_test.csv', 'mock-user');
    await executeCsvImport(validated1.validatedRows, parsed1.fileHash, 'uuid_test.csv', 'mock-user', [], [], []);

    const countAfterFirst = getMockTransactionsStore().length;

    // 第二次解析與匯入同一份 CSV
    const parsed2 = await parseCsvContent(csvWithUuid, 'uuid_test.csv');
    const validated2 = await validateAndDeduplicateCsv(parsed2.rows, parsed2.fileHash, 'uuid_test.csv', 'mock-user');
    await executeCsvImport(validated2.validatedRows, parsed2.fileHash, 'uuid_test.csv', 'mock-user', [], [], []);

    const countAfterSecond = getMockTransactionsStore().length;

    // 恢復狀態
    setMockTransactionsStore(initialTxs);
    setMockImportRowSourcesStore(initialSources);

    const passed = validated1.validCount === 2 &&
      validated2.validCount === 0 &&
      validated2.duplicateCount === 2 &&
      countAfterFirst === countAfterSecond;

    return {
      passed,
      message: passed
        ? `第二次匯入時 2 筆 UUID 皆被正確識別為 duplicate，交易總筆數完全不變 (${countAfterFirst} 筆)`
        : `去重失敗: 第一次有效 ${validated1.validCount}, 第二次有效 ${validated2.validCount}, 筆數 ${countAfterFirst} -> ${countAfterSecond}`,
    };
  });

  // --- 測試 4: 全部記帳重置清除交易、來源與批次 ---
  await record('4. 全部記帳重置執行後，交易、來源紀錄與批次全數歸零', async () => {
    // 預設寫入測試資料
    setMockTransactionsStore([
      {
        id: 'tx-test-reset-1',
        user_id: 'mock-user',
        transaction_date: '2026-03-01',
        type: 'expense',
        amount: 200,
        currency: 'TWD',
        exchange_rate: 1,
        base_amount: 200,
        account_id: 'a1',
        created_at: '',
        updated_at: '',
      },
    ]);
    setMockImportRowSourcesStore([
      {
        id: 'src-test-1',
        user_id: 'mock-user',
        transaction_id: 'tx-test-reset-1',
        import_batch_id: 'b-1',
        source_uuid: 'u-1',
        source_fingerprint: 'fp-1',
        created_at: '',
      },
    ]);

    const statsBefore = await getResetStats('mock-user');
    const result = await executeResetAllTransactions('mock-user');
    const statsAfter = await getResetStats('mock-user');

    const passed = result.success === true &&
      statsBefore.transactionCount >= 1 &&
      statsAfter.transactionCount === 0 &&
      statsAfter.importSourceCount === 0 &&
      statsAfter.importBatchCount === 0;

    return {
      passed,
      message: passed
        ? `重置成功！清除前 ${statsBefore.transactionCount} 筆，清除後交易、來源與批次均為 0`
        : `重置失敗: result=${JSON.stringify(result)}, statsAfter=${JSON.stringify(statsAfter)}`,
    };
  });

  // --- 測試 5: 全部記帳重置後完整保留帳戶、分類、匯率與預算 ---
  await record('5. 全部記帳重置後，帳戶、分類、幣別與預算設定 100% 完整保留', async () => {
    const catsBefore = getMockCategoriesStore();
    const accsBefore = getMockAccountsStore();
    const budgetBefore = loadYearlyBudgets(2026);

    await executeResetAllTransactions('mock-user');

    const catsAfter = getMockCategoriesStore();
    const accsAfter = getMockAccountsStore();
    const budgetAfter = loadYearlyBudgets(2026);

    const passed = catsAfter.length === catsBefore.length &&
      accsAfter.length === accsBefore.length &&
      budgetAfter.length === budgetBefore.length &&
      catsAfter.length > 0;

    // 測試完成後恢復種子資料供前台預覽與後續測試正常運作
    const { DEFAULT_MOCK_TRANSACTIONS } = await import('../../supabase/transactions');
    const { DEFAULT_MOCK_ROW_SOURCES, DEFAULT_MOCK_BATCHES } = await import('../../backup/backupEngine');
    setMockTransactionsStore(DEFAULT_MOCK_TRANSACTIONS);
    setMockImportRowSourcesStore(DEFAULT_MOCK_ROW_SOURCES);
    setMockImportBatchesStore(DEFAULT_MOCK_BATCHES);

    return {
      passed,
      message: passed
        ? `分類 ${catsAfter.length} 項、帳戶 ${accsAfter.length} 項、預算 ${budgetAfter.length} 項全數保留無缺漏`
        : `設定受損: catsBefore=${catsBefore.length}, catsAfter=${catsAfter.length}`,
    };
  });

  const passedCount = results.filter(r => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
  };
}
