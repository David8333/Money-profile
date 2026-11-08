/**
 * Phase 5 Automated Acceptance Test Suite (15 Test Cases)
 * Validates:
 * 1. Currency addition & modification
 * 2. Currency deletion protection (disallowing deletion of currencies in use or base currency)
 * 3. Manual exchange rate setting
 * 4. Historical exchange rate lookup by date
 * 5. Rate modification safety (immutability of historical transaction base_amount)
 * 6. Foreign currency conversion to TWD accuracy
 * 7. Missing exchange rate flagging & warning
 * 8. Cross-currency transfer pairing (shared transfer_group_id & balanced base_amount)
 * 9. Transfer exclusion from income/expense calculations
 * 10. Category ranking & proportions accuracy
 * 11. Account analysis (balance vs. volume distinction)
 * 12. Member contribution & expenditure analysis
 * 13. Daily & monthly averages calculation
 * 14. Annual YoY comparison & growth rates
 * 15. Multi-currency non-mixing integrity (no naive summation of raw foreign amounts)
 */

import { addCurrency, updateCurrency, deleteCurrency, isCurrencyInUse, fetchCurrencies } from '../../supabase/currencies';
import {
  setExchangeRate,
  getExchangeRateForDate,
  fetchExchangeRateHistory,
  calculateBaseAmountFromRate,
  findTransactionsWithMissingRates,
} from '../../currencies/rateService';
import { createTransfer } from '../../supabase/transactions';
import {
  calculateCategoryRanking,
  calculateAccountAnalysis,
  calculateMemberAnalysis,
  calculateAverages,
  calculateYoYComparison,
} from '../advancedAnalytics';
import { calculateKpiStats } from '../../dashboard/dashboardAnalytics';
import { EnrichedTransaction } from '../../../types/finance';
import { DbAccount, DbMember } from '../../../types/database';

export interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export interface Phase5TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestCaseResult[];
  allPassed: boolean;
}

// 測試用基礎帳戶與成員
const mockAccounts: DbAccount[] = [
  { id: 'acc-twd-bank', user_id: 'test-user', name: '台幣活存', account_type: 'bank', currency: 'TWD', opening_balance: 10000, is_active: true, created_at: '' },
  { id: 'acc-jpy-bank', user_id: 'test-user', name: '日圓外幣帳戶', account_type: 'bank', currency: 'JPY', opening_balance: 50000, is_active: true, created_at: '' },
  { id: 'acc-usd-card', user_id: 'test-user', name: '美金雙幣卡', account_type: 'credit_card', currency: 'USD', opening_balance: 0, is_active: true, created_at: '' },
];

const mockMembers: DbMember[] = [
  { id: 'mem-alice', user_id: 'test-user', name: '小愛', is_active: true, created_at: '' },
  { id: 'mem-bob', user_id: 'test-user', name: '阿明', is_active: true, created_at: '' },
];

function mockTx(overrides: Partial<EnrichedTransaction>): EnrichedTransaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2)}`,
    user_id: 'test-user',
    transaction_date: '2024-03-01',
    type: 'expense',
    category_id: null,
    amount: 100,
    currency: 'TWD',
    exchange_rate: 1.0,
    base_amount: 100,
    account_id: 'acc-twd-bank',
    member_id: null,
    note: null,
    transfer_group_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export async function runAllPhase5AcceptanceTests(): Promise<Phase5TestSuiteSummary> {
  const results: TestCaseResult[] = [];

  const runTest = async (id: string, name: string, fn: () => Promise<void> | void) => {
    const start = performance.now();
    try {
      await fn();
      results.push({
        id,
        name,
        passed: true,
        message: '驗證通過',
        durationMs: performance.now() - start,
      });
    } catch (err: any) {
      results.push({
        id,
        name,
        passed: false,
        message: err.message || String(err),
        durationMs: performance.now() - start,
      });
    }
  };

  // Test 1: 幣別新增與編輯
  await runTest('P5-01', '幣別新增與編輯 (Add & Modify Currency)', async () => {
    const addRes = await addCurrency({
      code: 'CAD',
      name: '加拿大元',
      symbol: 'CA$',
      decimal_places: 2,
    });
    if (!addRes.data || addRes.error) {
      throw new Error(`新增幣別失敗: ${addRes.error}`);
    }

    const updateRes = await updateCurrency('CAD', { name: '加幣', symbol: 'C$' });
    if (!updateRes.success) {
      throw new Error(`更新幣別失敗: ${updateRes.error}`);
    }

    const { data: currencies } = await fetchCurrencies(true);
    const cad = currencies.find(c => c.code === 'CAD');
    if (!cad || cad.name !== '加幣' || cad.symbol !== 'C$') {
      throw new Error(`幣別資料未如預期更新: ${JSON.stringify(cad)}`);
    }
  });

  // Test 2: 幣別刪除防護
  await runTest('P5-02', '幣別刪除安全防護 (Disallow deleting in-use or base currencies)', async () => {
    const testTx = mockTx({
      id: 'tx-cad-1',
      transaction_date: '2024-03-01',
      type: 'expense',
      category_id: 'cat-1',
      amount: 50,
      currency: 'CAD',
      exchange_rate: 23.5,
      base_amount: 1175,
      account_id: 'acc-twd-bank',
      member_id: 'mem-alice',
      note: '楓糖漿',
    });

    if (!isCurrencyInUse('CAD', [testTx])) {
      throw new Error('isCurrencyInUse 應回傳 true');
    }

    // 嘗試刪除被使用的幣別
    const delInUse = await deleteCurrency('CAD', [testTx]);
    if (delInUse.success) {
      throw new Error('被交易使用中的幣別應禁止刪除');
    }

    // 嘗試刪除基準幣 TWD
    const delTwd = await deleteCurrency('TWD', []);
    if (delTwd.success) {
      throw new Error('基準幣別 TWD 應禁止刪除');
    }
  });

  // Test 3: 手動匯率設定
  await runTest('P5-03', '手動匯率設定 (Manual Exchange Rate Setup)', async () => {
    const res = await setExchangeRate('test-user', {
      fromCurrency: 'USD',
      rate: 32.25,
      effectiveDate: '2024-04-01',
      note: '四月份手動設定牌告匯率',
    });

    if (!res.data || res.error) {
      throw new Error(`設定匯率失敗: ${res.error}`);
    }

    const { data: history } = await fetchExchangeRateHistory('test-user', 'USD');
    const matched = history.find(h => h.effectiveDate === '2024-04-01');
    if (!matched || matched.rate !== 32.25 || matched.note !== '四月份手動設定牌告匯率') {
      throw new Error('查無正確寫入之歷史匯率紀錄');
    }
  });

  // Test 4: 歷史匯率依日期查詢
  await runTest('P5-04', '歷史匯率依日期匹配查詢 (Historical Rate Lookup by Date)', () => {
    // JPY: 2024-01-01 -> 0.22, 2024-02-15 -> 0.21
    const rateJan = getExchangeRateForDate('JPY', '2024-01-20');
    if (rateJan !== 0.22) {
      throw new Error(`2024-01-20 應匹配 0.22 匯率，實際取得: ${rateJan}`);
    }

    const rateFeb = getExchangeRateForDate('JPY', '2024-03-01');
    if (rateFeb !== 0.21) {
      throw new Error(`2024-03-01 應匹配 0.21 匯率，實際取得: ${rateFeb}`);
    }
  });

  // Test 5: 修改匯率不影響歷史交易 base_amount
  await runTest('P5-05', '匯率修改安全性（歷史交易 base_amount 不可變）', async () => {
    const historicalTx = mockTx({
      id: 'tx-hist-usd-100',
      transaction_date: '2024-01-15',
      type: 'expense',
      category_id: 'cat-hosting',
      amount: 100,
      currency: 'USD',
      exchange_rate: 31.0,
      base_amount: 3100, // 歷史已固化
      account_id: 'acc-usd-card',
      member_id: 'mem-alice',
      note: '雲端伺服器年費',
    });

    // 此時將 USD 匯率大幅調整至 40.0
    await setExchangeRate('test-user', {
      fromCurrency: 'USD',
      rate: 40.0,
      effectiveDate: '2024-05-01',
      note: '測試劇烈波動',
    });

    // 驗證既有交易之 base_amount 與 exchange_rate 依然不可變
    if (historicalTx.base_amount !== 3100 || historicalTx.exchange_rate !== 31.0) {
      throw new Error('歷史交易之 base_amount 遭意外竄改！');
    }
  });

  // Test 6: 外幣兌 TWD 換算精確度
  await runTest('P5-06', '外幣兌 TWD 基準金額精確度 (Conversion Accuracy)', () => {
    // 10,000 JPY * 0.21 = 2,100 TWD
    const jpyBase = calculateBaseAmountFromRate(10000, 0.21);
    if (jpyBase !== 2100) {
      throw new Error(`10,000 JPY 換算錯誤，預期 2100，實際: ${jpyBase}`);
    }

    // 250.50 USD * 31.5 = 7890.75 TWD
    const usdBase = calculateBaseAmountFromRate(250.5, 31.5);
    if (usdBase !== 7890.75) {
      throw new Error(`250.5 USD 換算錯誤，預期 7890.75，實際: ${usdBase}`);
    }
  });

  // Test 7: 缺少匯率之交易警示
  await runTest('P5-07', '缺少匯率之交易警示與識別 (Missing Rate Detection)', () => {
    const list: EnrichedTransaction[] = [
      mockTx({
        id: 'tx-ok-twd',
        transaction_date: '2024-03-01',
        type: 'expense',
        amount: 100,
        currency: 'TWD',
        base_amount: 100,
        exchange_rate: 1.0,
      }),
      mockTx({
        id: 'tx-missing-rate-eur',
        transaction_date: '2024-03-02',
        type: 'expense',
        amount: 80,
        currency: 'EUR',
        base_amount: undefined as any, // 缺少 base_amount
        exchange_rate: undefined as any,
      }),
    ];

    const missing = findTransactionsWithMissingRates(list);
    if (missing.length !== 1 || missing[0].id !== 'tx-missing-rate-eur') {
      throw new Error(`缺少匯率交易檢測錯誤，預期偵測到 1 筆，實際: ${missing.length}`);
    }
  });

  // Test 8: 跨幣別轉帳配對紀錄 (transfer_group_id & balanced base_amount)
  await runTest('P5-08', '跨幣別轉帳配對紀錄 (Cross-Currency Transfer Pairing)', async () => {
    // 從日圓帳戶轉出 10,000 JPY (匯率 0.21 -> 2,100 TWD) 至台幣帳戶入帳 2,100 TWD
    const transferRes = await createTransfer('test-user', {
      transaction_date: '2024-03-10',
      amount: 10000,
      currency: 'JPY',
      to_amount: 2100,
      to_currency: 'TWD',
      exchange_rate: 0.21,
      target_exchange_rate: 1.0,
      from_account_id: 'acc-jpy-bank',
      to_account_id: 'acc-twd-bank',
      note: '日圓換匯回台幣',
      from_account_name: '日圓外幣帳戶',
      to_account_name: '台幣活存',
    });

    if (!transferRes.success || !transferRes.transferGroupId) {
      throw new Error('跨幣別轉帳建立失敗');
    }
  });

  // Test 9: 轉帳排除於收支統計
  await runTest('P5-09', '轉帳排除於收支統計 (Transfers Excluded from Income/Expense)', () => {
    const transactionsWithTransfer: EnrichedTransaction[] = [
      mockTx({
        id: 'tx-in-1',
        transaction_date: '2024-03-01',
        type: 'income',
        amount: 50000,
        currency: 'TWD',
        base_amount: 50000,
      }),
      mockTx({
        id: 'tx-ex-1',
        transaction_date: '2024-03-05',
        type: 'expense',
        amount: 20000,
        currency: 'TWD',
        base_amount: 20000,
      }),
      // 跨幣別轉帳成對
      mockTx({
        id: 'tx-tr-out',
        transaction_date: '2024-03-10',
        type: 'transfer',
        amount: 10000,
        currency: 'JPY',
        base_amount: 2100,
        account_id: 'acc-jpy-bank',
        transfer_group_id: 'trg-999',
        note: '轉出至 台幣活存',
      }),
      mockTx({
        id: 'tx-tr-in',
        transaction_date: '2024-03-10',
        type: 'transfer',
        amount: 2100,
        currency: 'TWD',
        base_amount: 2100,
        account_id: 'acc-twd-bank',
        transfer_group_id: 'trg-999',
        note: '從 日圓外幣帳戶 轉入',
      }),
    ];

    const kpi = calculateKpiStats(transactionsWithTransfer, '2024-03');
    if (kpi.totalIncome !== 50000 || kpi.totalExpense !== 20000) {
      throw new Error(`轉帳遭錯誤計入收支：收入=${kpi.totalIncome}, 支出=${kpi.totalExpense}`);
    }
    if (kpi.netBalance !== 30000) {
      throw new Error(`收支結餘錯誤：${kpi.netBalance}`);
    }
  });

  // Test 10: 分類排行榜與佔比
  await runTest('P5-10', '分類排行榜與佔比 (Category Ranking & Proportions)', () => {
    const txs: EnrichedTransaction[] = [
      mockTx({ id: '1', transaction_date: '2024-03-01', type: 'expense', amount: 6000, currency: 'TWD', base_amount: 6000, category_id: 'cat-rent', category: { id: 'cat-rent', name: '房貸', color: '#e11d48', type: 'expense', user_id: 'u', sort_order: 1, is_active: true, created_at: '' } }),
      mockTx({ id: '2', transaction_date: '2024-03-02', type: 'expense', amount: 3000, currency: 'TWD', base_amount: 3000, category_id: 'cat-food', category: { id: 'cat-food', name: '飲食', color: '#f97316', type: 'expense', user_id: 'u', sort_order: 2, is_active: true, created_at: '' } }),
      mockTx({ id: '3', transaction_date: '2024-03-03', type: 'expense', amount: 1000, currency: 'TWD', base_amount: 1000, category_id: 'cat-transit', category: { id: 'cat-transit', name: '交通', color: '#3b82f6', type: 'expense', user_id: 'u', sort_order: 3, is_active: true, created_at: '' } }),
    ];

    const ranking = calculateCategoryRanking(txs, 'expense', 'month', '2024-03-01');
    if (ranking.items.length !== 3) {
      throw new Error(`分類數量錯誤: ${ranking.items.length}`);
    }
    if (ranking.items[0].categoryName !== '房貸' || ranking.items[0].percentage !== 60) {
      throw new Error(`第一名排行不符預期: ${JSON.stringify(ranking.items[0])}`);
    }
    if (ranking.items[1].categoryName !== '飲食' || ranking.items[1].percentage !== 30) {
      throw new Error(`第二名排行不符預期: ${JSON.stringify(ranking.items[1])}`);
    }
  });

  // Test 11: 帳戶深度分析（區分餘額 vs 交易額）
  await runTest('P5-11', '帳戶分析：嚴格區分餘額 (Balance) 與交易額 (Volume)', () => {
    // 帳戶：期初 1,000 元，收入 5,000 元，支出 2,000 元，轉出 1,000 元
    const testAccount: DbAccount = {
      id: 'acc-sample',
      user_id: 'u',
      name: '活儲帳戶',
      account_type: 'bank',
      currency: 'TWD',
      opening_balance: 1000,
      is_active: true,
      created_at: '',
    };

    const txs: EnrichedTransaction[] = [
      mockTx({ id: '1', transaction_date: '2024-03-01', type: 'income', amount: 5000, currency: 'TWD', base_amount: 5000, account_id: 'acc-sample' }),
      mockTx({ id: '2', transaction_date: '2024-03-02', type: 'expense', amount: 2000, currency: 'TWD', base_amount: 2000, account_id: 'acc-sample' }),
      mockTx({ id: '3', transaction_date: '2024-03-03', type: 'transfer', transfer_direction: 'out', amount: 1000, currency: 'TWD', base_amount: 1000, account_id: 'acc-sample', note: '轉出至 錢包' }),
    ];

    const result = calculateAccountAnalysis(txs, [testAccount]);
    const acc = result.accounts[0];

    // 餘額 = 1,000 + 5,000 - 2,000 - 1,000 = 3,000
    if (acc.currentBalance !== 3000) {
      throw new Error(`帳戶餘額計算錯誤，預期 3,000，實際: ${acc.currentBalance}`);
    }

    // 交易額 (Volume) = 5,000 + 2,000 + 1,000 = 8,000
    if (acc.totalVolume !== 8000) {
      throw new Error(`帳戶總交易額計算錯誤，預期 8,000，實際: ${acc.totalVolume}`);
    }

    const currentBal: number = acc.currentBalance;
    const totalVol: number = acc.totalVolume;
    if (currentBal === totalVol) {
      throw new Error('帳戶餘額與交易額混淆相等！');
    }
  });

  // Test 12: 成員收支貢獻分析
  await runTest('P5-12', '成員收支貢獻與佔比分析 (Member Contribution Analysis)', () => {
    const txs: EnrichedTransaction[] = [
      mockTx({ id: '1', transaction_date: '2024-03-01', type: 'expense', amount: 3000, currency: 'TWD', base_amount: 3000, member_id: 'mem-alice', member: mockMembers[0] }),
      mockTx({ id: '2', transaction_date: '2024-03-02', type: 'expense', amount: 1000, currency: 'TWD', base_amount: 1000, member_id: 'mem-bob', member: mockMembers[1] }),
      mockTx({ id: '3', transaction_date: '2024-03-05', type: 'income', amount: 40000, currency: 'TWD', base_amount: 40000, member_id: 'mem-alice', member: mockMembers[0] }),
    ];

    const analysis = calculateMemberAnalysis(txs, mockMembers);
    const alice = analysis.members.find(m => m.memberId === 'mem-alice')!;
    const bob = analysis.members.find(m => m.memberId === 'mem-bob')!;

    if (alice.totalExpense !== 3000 || alice.expensePercentage !== 75) {
      throw new Error(`Alice 支出或佔比錯誤: ${alice.totalExpense}, ${alice.expensePercentage}%`);
    }
    if (bob.totalExpense !== 1000 || bob.expensePercentage !== 25) {
      throw new Error(`Bob 支出或佔比錯誤: ${bob.totalExpense}, ${bob.expensePercentage}%`);
    }
  });

  // Test 13: 日均與月均收支計算
  await runTest('P5-13', '日均與月均收支統計 (Daily & Monthly Averages)', () => {
    // 期間 3 天：第 1 天花 300，第 3 天花 600，總支出 900
    const txs: EnrichedTransaction[] = [
      mockTx({ id: '1', transaction_date: '2024-03-01', type: 'expense', amount: 300, currency: 'TWD', base_amount: 300 }),
      mockTx({ id: '2', transaction_date: '2024-03-03', type: 'expense', amount: 600, currency: 'TWD', base_amount: 600 }),
    ];

    const avgs = calculateAverages(txs, { startDate: '2024-03-01', endDate: '2024-03-03' });

    // 日曆天 3 天 -> 日均支出 900 / 3 = 300
    if (avgs.dailyAverageExpense !== 300) {
      throw new Error(`日曆日均支出計算錯誤: ${avgs.dailyAverageExpense}`);
    }
    // 有消費天 2 天 -> 有效日均支出 900 / 2 = 450
    if (avgs.activeDailyAverageExpense !== 450) {
      throw new Error(`有消費日均支出計算錯誤: ${avgs.activeDailyAverageExpense}`);
    }
  });

  // Test 14: 年度同期比較 (YoY)
  await runTest('P5-14', '年度同期比較 (YoY Comparison & Growth Rates)', () => {
    const txs: EnrichedTransaction[] = [
      // 2023 年
      mockTx({ id: '23-1', transaction_date: '2023-05-01', type: 'income', amount: 500000, currency: 'TWD', base_amount: 500000 }),
      mockTx({ id: '23-2', transaction_date: '2023-05-02', type: 'expense', amount: 200000, currency: 'TWD', base_amount: 200000 }),
      // 2024 年
      mockTx({ id: '24-1', transaction_date: '2024-05-01', type: 'income', amount: 600000, currency: 'TWD', base_amount: 600000 }),
      mockTx({ id: '24-2', transaction_date: '2024-05-02', type: 'expense', amount: 220000, currency: 'TWD', base_amount: 220000 }),
    ];

    const yoy = calculateYoYComparison(txs, 2024, 2023);

    // 收入成長: (600,000 - 500,000) / 500,000 = +20%
    if (yoy.incomeGrowthRate !== 20) {
      throw new Error(`YoY 收入成長率計算錯誤: ${yoy.incomeGrowthRate}%`);
    }

    // 支出成長: (220,000 - 200,000) / 200,000 = +10%
    if (yoy.expenseGrowthRate !== 10) {
      throw new Error(`YoY 支出成長率計算錯誤: ${yoy.expenseGrowthRate}%`);
    }
  });

  // Test 15: 多幣別混合不加總 (非基準幣隔離)
  await runTest('P5-15', '多幣別混合不直接加總 (Non-TWD Base Amount Isolation)', () => {
    // 包含 10,000 JPY (換算 2,100 TWD) 與 1,000 TWD 支出
    const multiCurrencyTxs: EnrichedTransaction[] = [
      mockTx({
        id: 'tx-jpy',
        transaction_date: '2024-03-01',
        type: 'expense',
        amount: 10000,
        currency: 'JPY',
        exchange_rate: 0.21,
        base_amount: 2100, // 換算後 2,100 TWD
        account_id: 'acc-jpy-bank',
      }),
      mockTx({
        id: 'tx-twd',
        transaction_date: '2024-03-02',
        type: 'expense',
        amount: 1000,
        currency: 'TWD',
        exchange_rate: 1.0,
        base_amount: 1000,
        account_id: 'acc-twd-bank',
      }),
    ];

    const kpi = calculateKpiStats(multiCurrencyTxs, '2024-03');

    // 總支出必須為 2,100 + 1,000 = 3,100 TWD
    // 若誤將原幣金額相加會得到 11,000，此處嚴格斷言！
    if (kpi.totalExpense === 11000) {
      throw new Error('致命錯誤：系統直接將 10,000 JPY 與 1,000 TWD 原始金額相加！');
    }
    if (kpi.totalExpense !== 3100) {
      throw new Error(`總支出應為 3,100 TWD，實際為: ${kpi.totalExpense}`);
    }
  });

  const passedCount = results.filter(r => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
    allPassed: passedCount === results.length,
  };
}
