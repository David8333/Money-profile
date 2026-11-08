/**
 * JSON Restore Engine and Integrity Validator
 * Enforces schema version validation, strict user isolation, transfer pairing checks,
 * pre-restore audit preview, safe merge restore, and protected full restore.
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import {
  BACKUP_SCHEMA_VERSION,
  FinanceBackupFile,
  FinanceBackupTables,
  RestoreMode,
  RestoreOptions,
  RestorePreviewAnalysis,
  RestoreResult,
} from '../../types/backup';
import {
  DbAccount,
  DbCategory,
  DbCurrency,
  DbExchangeRate,
  DbImportBatch,
  DbImportRowSource,
  DbMember,
  DbTransaction,
} from '../../types/database';
import { EnrichedTransaction } from '../../types/finance';
import {
  getMockCurrenciesStore,
  setMockCurrenciesStore,
} from '../supabase/currencies';
import {
  getMockExchangeRateHistory,
  setMockExchangeRateHistory,
} from '../currencies/rateService';
import {
  getMockCategoriesStore,
  setMockCategoriesStore,
} from '../supabase/categories';
import {
  getMockAccountsStore,
  setMockAccountsStore,
} from '../supabase/accounts';
import {
  getMockMembersStore,
  setMockMembersStore,
} from '../supabase/members';
import {
  getMockTransactionsStore,
  setMockTransactionsStore,
} from '../supabase/transactions';
import {
  getMockImportBatchesStore,
  setMockImportBatchesStore,
  getMockImportRowSourcesStore,
  setMockImportRowSourcesStore,
  generateBackupData,
  downloadBackupFile,
} from './backupEngine';

/**
 * 驗證並深度解析 JSON 備份內容
 */
export function validateAndAnalyzeBackupJson(
  jsonString: string,
  currentUserId: string
): { isValid: boolean; analysis?: RestorePreviewAnalysis; error?: string } {
  // 1. JSON 語法解析
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    return {
      isValid: false,
      error: `JSON 格式錯誤：無法解析檔案內容 (${err.message})`,
    };
  }

  // 2. 根層級必要欄位檢驗
  if (!parsed || typeof parsed !== 'object') {
    return { isValid: false, error: 'JSON 根節點必須為物件' };
  }

  const { schema_version, app_version, exported_at, base_currency, user_id, data } = parsed;

  if (!schema_version) {
    return { isValid: false, error: '缺少必要欄位 [schema_version]，非合法備份格式' };
  }

  // 3. Schema 版本相容性驗證 (僅支援 1.x.x)
  const [major] = String(schema_version).split('.');
  const [supportedMajor] = BACKUP_SCHEMA_VERSION.split('.');
  if (major !== supportedMajor) {
    return {
      isValid: false,
      error: `不支援的 schema_version: "${schema_version}"。目前系統僅支援 ${supportedMajor}.x.x 格式。`,
    };
  }

  if (!user_id) {
    return { isValid: false, error: '備份檔缺少 [user_id] 識別碼，無法進行帳號權限隔離校驗' };
  }

  // 4. 使用者 ID 權限隔離驗證 (嚴格阻止不同使用者之備份互通)
  const normalizedCurrent = currentUserId ? currentUserId.trim() : '';
  const normalizedBackupUser = String(user_id).trim();

  if (
    normalizedCurrent &&
    normalizedCurrent !== normalizedBackupUser &&
    // 特殊測試環境容許：若兩者皆為 mock 相關則放行，否則一律嚴格拒絕
    !(normalizedCurrent === 'mock-user' && normalizedBackupUser === 'mock-user')
  ) {
    return {
      isValid: false,
      error: `帳號不符安全攔截：該備份檔歸屬於使用者 [${normalizedBackupUser}]，無法匯入目前帳號 [${normalizedCurrent}]。為防範資料越權污染，系統已拒絕還原。`,
    };
  }

  if (!data || typeof data !== 'object') {
    return { isValid: false, error: '備份檔缺少 [data] 資料主體物件' };
  }

  // 5. 資料表陣列存在性檢驗
  const requiredTables: (keyof FinanceBackupTables)[] = [
    'currencies',
    'exchange_rates',
    'categories',
    'accounts',
    'members',
    'transactions',
    'import_batches',
    'import_row_sources',
  ];

  for (const tbl of requiredTables) {
    if (!Array.isArray(data[tbl])) {
      return { isValid: false, error: `備份資料主體缺少必要資料表 [${tbl}] 陣列` };
    }
  }

  const backupData = data as FinanceBackupTables;
  const errors: string[] = [];
  const warnings: string[] = [];

  // 6. 統計各資料表筆數
  const tableCounts = {
    currencies: backupData.currencies.length,
    exchange_rates: backupData.exchange_rates.length,
    categories: backupData.categories.length,
    accounts: backupData.accounts.length,
    members: backupData.members.length,
    transactions: backupData.transactions.length,
    import_batches: backupData.import_batches.length,
    import_row_sources: backupData.import_row_sources.length,
  };

  // 7. 交易明細稽核與分類統計
  let incomeCount = 0;
  let expenseCount = 0;
  let transferCount = 0;
  let legacyTransferMissingDirectionCount = 0;
  let missingRateCount = 0;
  let unmatchedCategoryCount = 0;
  let unmatchedAccountCount = 0;
  let unmatchedMemberCount = 0;

  const categoryIdSet = new Set(backupData.categories.map((c) => c.id));
  const accountIdSet = new Set(backupData.accounts.map((a) => a.id));
  const memberIdSet = new Set(backupData.members.map((m) => m.id));

  // 轉帳組成對性追蹤: transfer_group_id -> tx list
  const transferGroups = new Map<string, DbTransaction[]>();

  backupData.transactions.forEach((tx, idx) => {
    if (tx.type === 'income') incomeCount++;
    else if (tx.type === 'expense') expenseCount++;
    else if (tx.type === 'transfer') {
      transferCount++;
      if (!tx.transfer_direction) {
        legacyTransferMissingDirectionCount++;
      }
      if (tx.transfer_group_id) {
        const list = transferGroups.get(tx.transfer_group_id) || [];
        list.push(tx);
        transferGroups.set(tx.transfer_group_id, list);
      } else {
        warnings.push(`交易 (ID: ${tx.id || idx}) 為轉帳類型但缺少 transfer_group_id`);
      }
    }

    // 匯率稽核 (外幣交易必須具備 exchange_rate 與 base_amount)
    if (tx.currency && tx.currency !== 'TWD') {
      if (!tx.exchange_rate || tx.exchange_rate <= 0 || tx.base_amount === undefined || tx.base_amount === null) {
        missingRateCount++;
      }
    }

    // 外鍵關聯稽核
    if (tx.category_id && !categoryIdSet.has(tx.category_id)) {
      unmatchedCategoryCount++;
    }
    if (tx.account_id && !accountIdSet.has(tx.account_id)) {
      unmatchedAccountCount++;
    }
    if (tx.member_id && !memberIdSet.has(tx.member_id)) {
      unmatchedMemberCount++;
    }
  });

  // 轉帳成對性檢查
  transferGroups.forEach((groupTxs, groupId) => {
    if (groupTxs.length !== 2) {
      warnings.push(`轉帳群組 [${groupId}] 筆數異常 (目前 ${groupTxs.length} 筆，應成對 2 筆)`);
    } else {
      const hasOut = groupTxs.some((t) => t.transfer_direction === 'out');
      const hasIn = groupTxs.some((t) => t.transfer_direction === 'in');
      if (!hasOut || !hasIn) {
        // 若缺少明確 direction，可能為舊格式轉帳
        const hasLegacy = groupTxs.some((t) => !t.transfer_direction);
        if (!hasLegacy) {
          warnings.push(`轉帳群組 [${groupId}] 雙向方向未正確成對 (out/in 缺失)`);
        }
      }
    }
  });

  if (legacyTransferMissingDirectionCount > 0) {
    warnings.push(`發現 ${legacyTransferMissingDirectionCount} 筆舊版轉帳缺少明確 transfer_direction，還原時將完整保留為 null，不自動猜測方向。`);
  }
  if (missingRateCount > 0) {
    warnings.push(`發現 ${missingRateCount} 筆外幣交易缺少匯率或換算金額，還原後建議重新指派匯率。`);
  }

  // 8. 衝突檢測 (比對現有記憶體/快取資料)
  const existingTxIds = new Set(getMockTransactionsStore().map((t) => t.id));
  const duplicateTransactionUuids = backupData.transactions.filter((t) => existingTxIds.has(t.id)).length;

  const analysis: RestorePreviewAnalysis = {
    isValid: errors.length === 0,
    errors,
    warnings,
    backupMetadata: {
      schema_version,
      app_version,
      exported_at,
      base_currency: base_currency || 'TWD',
      user_id: normalizedBackupUser,
      generator: parsed.metadata?.generator || '未知產生器',
      summary: parsed.metadata?.summary,
    },
    tableCounts,
    transactionBreakdown: {
      total: backupData.transactions.length,
      incomeCount,
      expenseCount,
      transferCount,
      legacyTransferMissingDirectionCount,
      missingRateCount,
      unmatchedCategoryCount,
      unmatchedAccountCount,
      unmatchedMemberCount,
    },
    existingConflictCounts: {
      duplicateTransactionUuids,
      existingExchangeRatesCount: 0,
      existingCategoriesCount: 0,
      existingAccountsCount: 0,
      existingMembersCount: 0,
    },
  };

  return {
    isValid: true,
    analysis,
  };
}

/**
 * 強制重綁定所有使用者資料列之 user_id 為當前登入者 (Sanitization)
 * 排除全域共用字典表 currencies，防範偽造 JSON 內部資料列之越權寫入
 */
export function sanitizeBackupDataUserId(
  backup: FinanceBackupFile,
  currentUserId: string
): FinanceBackupFile {
  const targetUserId = currentUserId.trim();
  const d = backup.data;

  return {
    ...backup,
    user_id: targetUserId,
    data: {
      currencies: [...d.currencies], // 全域表不具 user_id
      categories: d.categories.map((c) => ({ ...c, user_id: targetUserId })),
      accounts: d.accounts.map((a) => ({ ...a, user_id: targetUserId })),
      members: d.members.map((m) => ({ ...m, user_id: targetUserId })),
      exchange_rates: d.exchange_rates.map((r) => ({ ...r, user_id: targetUserId })),
      import_batches: d.import_batches.map((b) => ({ ...b, user_id: targetUserId })),
      transactions: d.transactions.map((t) => ({ ...t, user_id: targetUserId })),
      import_row_sources: d.import_row_sources.map((s) => ({ ...s, user_id: targetUserId })),
    },
  };
}

/**
 * 執行資料還原（支援合併還原與受保護的完整覆蓋還原）
 */
export async function executeRestore(
  backup: FinanceBackupFile,
  currentUserId: string,
  options: RestoreOptions
): Promise<RestoreResult> {
  const { mode, confirmedUserIdCheck, confirmationText, safetySnapshotDownloaded } = options;

  // 1. 使用者權限安全防護
  if (!confirmedUserIdCheck && currentUserId !== backup.user_id && currentUserId !== 'mock-user') {
    throw new Error('未確認帳號隔離檢查，還原操作已中止');
  }

  // 1-B. 強制對整份備份所有子資料列執行 user_id 淨化綁定 (Defense in Depth)
  const sanitizedBackup = sanitizeBackupDataUserId(backup, currentUserId);
  const data = sanitizedBackup.data;

  // 2. 完整還原模式安全防禦檢查
  let safetyBackupFileName: string | undefined;
  if (mode === 'full') {
    // 嚴格要求安全確認字串
    if (confirmationText !== '確認覆蓋還原') {
      throw new Error('完整還原模式必須精確輸入安全確認文字「確認覆蓋還原」方可執行');
    }

    // 必須先建立安全快照
    try {
      const currentBackup = await generateBackupData(currentUserId);
      safetyBackupFileName = downloadBackupFile(currentBackup, 'safety_snapshot_before_full_restore');
    } catch (err: any) {
      throw new Error(`完整還原前建立安全備份快照失敗 (${err.message})，為確保資料安全，還原操作已強制中止。`);
    }
  }

  const restoredCounts: Record<keyof FinanceBackupTables, number> = {
    currencies: 0,
    exchange_rates: 0,
    categories: 0,
    accounts: 0,
    members: 0,
    transactions: 0,
    import_batches: 0,
    import_row_sources: 0,
  };

  const skippedDuplicateCounts: Record<keyof FinanceBackupTables, number> = {
    currencies: 0,
    exchange_rates: 0,
    categories: 0,
    accounts: 0,
    members: 0,
    transactions: 0,
    import_batches: 0,
    import_row_sources: 0,
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  // --------------------------------------------------------------------------
  // A. 模擬 / 測試環境執行還原
  // --------------------------------------------------------------------------
  if (!isSupabaseConfigured() || currentUserId === 'mock-user') {
    if (mode === 'full') {
      // 完整還原：清空現有儲存庫（僅限當前使用者），並原樣匯入備份資料
      setMockCurrenciesStore([...data.currencies]);
      setMockExchangeRateHistory(
        data.exchange_rates.map((r) => ({
          id: r.id,
          fromCurrency: r.from_currency,
          toCurrency: r.to_currency,
          rate: r.rate,
          effectiveDate: r.effective_date,
          note: r.note || undefined,
          updatedAt: r.updated_at,
        }))
      );
      setMockCategoriesStore([...data.categories]);
      setMockAccountsStore([...data.accounts]);
      setMockMembersStore([...data.members]);

      const catMap = new Map(data.categories.map((c) => [c.id, c]));
      const accMap = new Map(data.accounts.map((a) => [a.id, a]));
      const memMap = new Map(data.members.map((m) => [m.id, m]));

      const enriched: EnrichedTransaction[] = data.transactions.map((t) => ({
        ...t,
        category: t.category_id ? catMap.get(t.category_id) : undefined,
        account: t.account_id ? accMap.get(t.account_id) : undefined,
        member: t.member_id ? memMap.get(t.member_id) : undefined,
      }));

      setMockTransactionsStore(enriched);
      setMockImportBatchesStore([...data.import_batches]);
      setMockImportRowSourcesStore([...data.import_row_sources]);

      restoredCounts.currencies = data.currencies.length;
      restoredCounts.exchange_rates = data.exchange_rates.length;
      restoredCounts.categories = data.categories.length;
      restoredCounts.accounts = data.accounts.length;
      restoredCounts.members = data.members.length;
      restoredCounts.transactions = data.transactions.length;
      restoredCounts.import_batches = data.import_batches.length;
      restoredCounts.import_row_sources = data.import_row_sources.length;

      return {
        success: true,
        mode: 'full',
        restoredCounts,
        skippedDuplicateCounts,
        errors,
        warnings,
        safetyBackupFileName,
      };
    } else {
      // 合併還原 (Merge Mode)：保留現有資料，UUID 重複者自動跳過
      // 1. Currencies
      const currStore = getMockCurrenciesStore();
      const existingCurrCodes = new Set(currStore.map((c) => c.code));
      for (const c of data.currencies) {
        if (existingCurrCodes.has(c.code)) {
          skippedDuplicateCounts.currencies++;
        } else {
          currStore.push(c);
          restoredCounts.currencies++;
        }
      }
      setMockCurrenciesStore(currStore);

      // 2. Exchange Rates
      const ratesStore = getMockExchangeRateHistory();
      const existingRateIds = new Set(ratesStore.map((r) => r.id));
      for (const r of data.exchange_rates) {
        if (existingRateIds.has(r.id)) {
          skippedDuplicateCounts.exchange_rates++;
        } else {
          ratesStore.push({
            id: r.id,
            fromCurrency: r.from_currency,
            toCurrency: r.to_currency,
            rate: r.rate,
            effectiveDate: r.effective_date,
            note: r.note || undefined,
            updatedAt: r.updated_at,
          });
          restoredCounts.exchange_rates++;
        }
      }
      setMockExchangeRateHistory(ratesStore);

      // 3. Categories
      const catStore = getMockCategoriesStore();
      const existingCatIds = new Set(catStore.map((c) => c.id));
      for (const c of data.categories) {
        if (existingCatIds.has(c.id)) {
          skippedDuplicateCounts.categories++;
        } else {
          catStore.push(c);
          restoredCounts.categories++;
        }
      }
      setMockCategoriesStore(catStore);

      // 4. Accounts
      const accStore = getMockAccountsStore();
      const existingAccIds = new Set(accStore.map((a) => a.id));
      for (const a of data.accounts) {
        if (existingAccIds.has(a.id)) {
          skippedDuplicateCounts.accounts++;
        } else {
          accStore.push(a);
          restoredCounts.accounts++;
        }
      }
      setMockAccountsStore(accStore);

      // 5. Members
      const memStore = getMockMembersStore();
      const existingMemIds = new Set(memStore.map((m) => m.id));
      for (const m of data.members) {
        if (existingMemIds.has(m.id)) {
          skippedDuplicateCounts.members++;
        } else {
          memStore.push(m);
          restoredCounts.members++;
        }
      }
      setMockMembersStore(memStore);

      // 6. Transactions
      const txStore = getMockTransactionsStore();
      const existingTxIds = new Set(txStore.map((t) => t.id));
      const catMap = new Map(catStore.map((c) => [c.id, c]));
      const accMap = new Map(accStore.map((a) => [a.id, a]));
      const memMap = new Map(memStore.map((m) => [m.id, m]));

      for (const t of data.transactions) {
        if (existingTxIds.has(t.id)) {
          skippedDuplicateCounts.transactions++;
        } else {
          txStore.push({
            ...t,
            category: t.category_id ? catMap.get(t.category_id) : undefined,
            account: t.account_id ? accMap.get(t.account_id) : undefined,
            member: t.member_id ? memMap.get(t.member_id) : undefined,
          });
          restoredCounts.transactions++;
        }
      }
      setMockTransactionsStore(txStore);

      // 7. Import Batches
      const batchStore = getMockImportBatchesStore();
      const existingBatchIds = new Set(batchStore.map((b) => b.id));
      for (const b of data.import_batches) {
        if (existingBatchIds.has(b.id)) {
          skippedDuplicateCounts.import_batches++;
        } else {
          batchStore.push(b);
          restoredCounts.import_batches++;
        }
      }
      setMockImportBatchesStore(batchStore);

      // 8. Import Row Sources (同時處理 id 衝突與 (user_id, source_uuid) 複合唯一鍵衝突)
      const srcStore = getMockImportRowSourcesStore();
      const existingSrcIds = new Set(srcStore.map((s) => s.id));
      const existingSrcUuids = new Set(
        srcStore
          .filter((s) => s.user_id === currentUserId && s.source_uuid)
          .map((s) => s.source_uuid as string)
      );
      const currentTxIds = new Set(txStore.map((t) => t.id));
      for (const s of data.import_row_sources) {
        const isIdDup = existingSrcIds.has(s.id);
        const isUuidDup = s.source_uuid ? existingSrcUuids.has(s.source_uuid) : false;
        const txExists = s.transaction_id ? currentTxIds.has(s.transaction_id) : false;
        
        // 若 id 重複、非 NULL source_uuid 重複、或關聯之交易不存在（避免孤兒來源紀錄），則安全略過
        if (isIdDup || isUuidDup || !txExists) {
          skippedDuplicateCounts.import_row_sources++;
        } else {
          srcStore.push(s);
          existingSrcIds.add(s.id);
          if (s.source_uuid) existingSrcUuids.add(s.source_uuid);
          restoredCounts.import_row_sources++;
        }
      }
      setMockImportRowSourcesStore(srcStore);

      return {
        success: true,
        mode: 'merge',
        restoredCounts,
        skippedDuplicateCounts,
        errors,
        warnings,
      };
    }
  }

  // --------------------------------------------------------------------------
  // B. 正式 Supabase 雲端環境執行還原 (透過單一 PostgreSQL RPC Transaction 原子執行)
  // --------------------------------------------------------------------------
  try {
    if (mode === 'full') {
      // 單次呼叫 restore_finance_full RPC，整筆交易具備原子 Rollback 保護
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('restore_finance_full', {
        p_backup: sanitizedBackup as any,
      });

      if (rpcError) {
        throw new Error(
          `雲端資料庫完整還原失敗：尚未部署 restore_finance_full RPC 函數或執行異常 (${rpcError.message})。為確保資料庫完整性，系統已保留現有資料未清空。請先套用 Phase 6B.1 Migration (20261107020000_full_restore_rpc.sql)。`
        );
      }

      const counts = (rpcData as any)?.restored_counts || {};
      restoredCounts.categories = counts.categories || 0;
      restoredCounts.accounts = counts.accounts || 0;
      restoredCounts.members = counts.members || 0;
      restoredCounts.exchange_rates = counts.exchange_rates || 0;
      restoredCounts.import_batches = counts.import_batches || 0;
      restoredCounts.transactions = counts.transactions || 0;
      restoredCounts.import_row_sources = counts.import_row_sources || 0;
      restoredCounts.currencies = data.currencies.length;

      return {
        success: true,
        mode: 'full',
        restoredCounts,
        skippedDuplicateCounts,
        errors: [],
        warnings,
        safetyBackupFileName,
      };
    } else {
      // 單次呼叫 restore_finance_merge RPC，以 ON CONFLICT DO NOTHING 處理衝突
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('restore_finance_merge', {
        p_backup: sanitizedBackup as any,
      });

      if (rpcError) {
        throw new Error(
          `雲端資料庫合併還原失敗：尚未部署 restore_finance_merge RPC 函數或執行異常 (${rpcError.message})。為防範部分資料寫入，系統已強制中止。請先套用 Phase 6B.1 Migration (20261107020000_full_restore_rpc.sql)。`
        );
      }

      const counts = (rpcData as any)?.restored_counts || {};
      restoredCounts.categories = counts.categories || 0;
      restoredCounts.accounts = counts.accounts || 0;
      restoredCounts.members = counts.members || 0;
      restoredCounts.exchange_rates = counts.exchange_rates || 0;
      restoredCounts.import_batches = counts.import_batches || 0;
      restoredCounts.transactions = counts.transactions || 0;
      restoredCounts.import_row_sources = counts.import_row_sources || 0;

      skippedDuplicateCounts.categories = Math.max(0, data.categories.length - restoredCounts.categories);
      skippedDuplicateCounts.accounts = Math.max(0, data.accounts.length - restoredCounts.accounts);
      skippedDuplicateCounts.members = Math.max(0, data.members.length - restoredCounts.members);
      skippedDuplicateCounts.exchange_rates = Math.max(0, data.exchange_rates.length - restoredCounts.exchange_rates);
      skippedDuplicateCounts.import_batches = Math.max(0, data.import_batches.length - restoredCounts.import_batches);
      skippedDuplicateCounts.transactions = Math.max(0, data.transactions.length - restoredCounts.transactions);
      skippedDuplicateCounts.import_row_sources = Math.max(0, data.import_row_sources.length - restoredCounts.import_row_sources);

      return {
        success: true,
        mode: 'merge',
        restoredCounts,
        skippedDuplicateCounts,
        errors: [],
        warnings,
      };
    }
  } catch (err: any) {
    throw new Error(`雲端資料庫原子還原失敗: ${err.message || err}`);
  }
}

