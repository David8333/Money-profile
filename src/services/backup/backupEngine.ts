/**
 * JSON Backup Engine
 * Handles full user data export across 8 tables with strict user isolation,
 * schema versioning, and zero silent partial backup tolerance.
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import {
  BACKUP_SCHEMA_VERSION,
  CURRENT_APP_VERSION,
  FinanceBackupFile,
  FinanceBackupTables,
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
import { getMockCurrenciesStore } from '../supabase/currencies';
import { getMockExchangeRateHistory } from '../currencies/rateService';
import { getMockCategoriesStore } from '../supabase/categories';
import { getMockAccountsStore } from '../supabase/accounts';
import { getMockMembersStore } from '../supabase/members';
import { getMockTransactionsStore } from '../supabase/transactions';
import { loadMockData, saveMockData } from '../mock/mockPersistence';

// Default Mock Seed Batches & Row Sources
export const DEFAULT_MOCK_BATCHES: DbImportBatch[] = [
  {
    id: 'batch-mock-01',
    user_id: 'mock-user',
    file_name: 'initial_transactions.csv',
    file_hash: 'hash-mock-seed-8899',
    total_rows: 10,
    imported_rows: 10,
    duplicate_rows: 0,
    error_rows: 0,
    status: 'completed',
    created_at: '2024-03-01T08:00:00Z',
  },
];

export const DEFAULT_MOCK_ROW_SOURCES: DbImportRowSource[] = [
  {
    id: 'source-mock-01',
    user_id: 'mock-user',
    transaction_id: 'mock-tx-001',
    import_batch_id: 'batch-mock-01',
    source_uuid: 'uuid-source-seed-001',
    source_fingerprint: 'fp-mock-tx-001',
    created_at: '2024-03-01T08:00:00Z',
  },
  {
    id: 'source-mock-02',
    user_id: 'mock-user',
    transaction_id: 'mock-tx-002',
    import_batch_id: 'batch-mock-01',
    source_uuid: 'uuid-source-seed-002',
    source_fingerprint: 'fp-mock-tx-002',
    created_at: '2024-03-01T08:00:00Z',
  },
];

let mockImportBatchesStore: DbImportBatch[] = loadMockData('fin_mock_batches', DEFAULT_MOCK_BATCHES);
let mockImportRowSourcesStore: DbImportRowSource[] = loadMockData('fin_mock_sources', DEFAULT_MOCK_ROW_SOURCES);

export function getMockImportBatchesStore(): DbImportBatch[] {
  return [...mockImportBatchesStore];
}

export function setMockImportBatchesStore(store: DbImportBatch[]) {
  mockImportBatchesStore = [...store];
  saveMockData('fin_mock_batches', mockImportBatchesStore);
}

export function getMockImportRowSourcesStore(): DbImportRowSource[] {
  return [...mockImportRowSourcesStore];
}

export function setMockImportRowSourcesStore(store: DbImportRowSource[]) {
  mockImportRowSourcesStore = [...store];
  saveMockData('fin_mock_sources', mockImportRowSourcesStore);
}

/**
 * 產生當前登入使用者的完整財務 JSON 備份資料
 * 若任一資料表查詢失敗，即刻中斷並拋出明確錯誤，絕不靜默產生不完整備份。
 */
export async function generateBackupData(userId: string): Promise<FinanceBackupFile> {
  if (!userId || !userId.trim()) {
    throw new Error('未提供有效的 user_id，無法執行資料備份');
  }

  const effectiveUserId = userId.trim();
  const exportedAt = new Date().toISOString();

  // 1. 若處於非 Supabase 連線之模擬/測試模式
  if (!isSupabaseConfigured() || effectiveUserId === 'mock-user') {
    const rawTxList = getMockTransactionsStore();
    // 剝離關聯物件（category, account, member），保留純粹的資料表欄位
    const pureTransactions: DbTransaction[] = rawTxList.map((tx) => ({
      id: tx.id,
      user_id: tx.user_id,
      transaction_date: tx.transaction_date,
      type: tx.type,
      category_id: tx.category_id,
      amount: tx.amount,
      currency: tx.currency,
      exchange_rate: tx.exchange_rate,
      base_amount: tx.base_amount,
      account_id: tx.account_id,
      member_id: tx.member_id,
      note: tx.note,
      transfer_group_id: tx.transfer_group_id,
      transfer_direction: tx.transfer_direction ?? null,
      created_at: tx.created_at,
      updated_at: tx.updated_at,
    }));

    const mockRates: DbExchangeRate[] = getMockExchangeRateHistory().map((r) => ({
      id: r.id,
      user_id: effectiveUserId,
      from_currency: r.fromCurrency,
      to_currency: r.toCurrency,
      rate: r.rate,
      effective_date: r.effectiveDate,
      note: r.note || null,
      created_at: r.updatedAt,
      updated_at: r.updatedAt,
    }));

    const tables: FinanceBackupTables = {
      currencies: getMockCurrenciesStore(),
      exchange_rates: mockRates,
      categories: getMockCategoriesStore().filter((c) => c.user_id === effectiveUserId || c.user_id === 'mock-user'),
      accounts: getMockAccountsStore().filter((a) => a.user_id === effectiveUserId || a.user_id === 'mock-user'),
      members: getMockMembersStore().filter((m) => m.user_id === effectiveUserId || m.user_id === 'mock-user'),
      transactions: pureTransactions.filter((t) => t.user_id === effectiveUserId || t.user_id === 'mock-user'),
      import_batches: getMockImportBatchesStore().filter((b) => b.user_id === effectiveUserId || b.user_id === 'mock-user'),
      import_row_sources: getMockImportRowSourcesStore().filter((s) => s.user_id === effectiveUserId || s.user_id === 'mock-user'),
    };

    return {
      schema_version: BACKUP_SCHEMA_VERSION,
      app_version: CURRENT_APP_VERSION,
      exported_at: exportedAt,
      base_currency: 'TWD',
      user_id: effectiveUserId,
      metadata: {
        schema_version: BACKUP_SCHEMA_VERSION,
        app_version: CURRENT_APP_VERSION,
        exported_at: exportedAt,
        base_currency: 'TWD',
        user_id: effectiveUserId,
        generator: 'Personal Finance Manager (AI Studio)',
        summary: {
          total_transactions: tables.transactions.length,
          total_categories: tables.categories.length,
          total_accounts: tables.accounts.length,
          total_members: tables.members.length,
          total_rates: tables.exchange_rates.length,
          total_batches: tables.import_batches.length,
          total_sources: tables.import_row_sources.length,
        },
      },
      data: tables,
    };
  }

  // 2. 正式 Supabase 雲端環境查詢（必須嚴格逐表檢查，任一表失敗即刻中斷）
  try {
    // 1. currencies
    const { data: currenciesData, error: currErr } = await supabase
      .from('currencies')
      .select('*')
      .order('code');
    if (currErr) {
      throw new Error(`資料表 [currencies] 讀取失敗: ${currErr.message}`);
    }

    // 2. exchange_rates
    const { data: ratesData, error: ratesErr } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('effective_date', { ascending: true });
    if (ratesErr) {
      throw new Error(`資料表 [exchange_rates] 讀取失敗: ${ratesErr.message}`);
    }

    // 3. categories
    const { data: categoriesData, error: catErr } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('sort_order', { ascending: true });
    if (catErr) {
      throw new Error(`資料表 [categories] 讀取失敗: ${catErr.message}`);
    }

    // 4. accounts
    const { data: accountsData, error: accErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: true });
    if (accErr) {
      throw new Error(`資料表 [accounts] 讀取失敗: ${accErr.message}`);
    }

    // 5. members
    const { data: membersData, error: memErr } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: true });
    if (memErr) {
      throw new Error(`資料表 [members] 讀取失敗: ${memErr.message}`);
    }

    // 6. transactions (全量，不限分頁)
    const { data: transactionsData, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('transaction_date', { ascending: false });
    if (txErr) {
      throw new Error(`資料表 [transactions] 讀取失敗: ${txErr.message}`);
    }

    // 7. import_batches
    const { data: batchesData, error: batchErr } = await supabase
      .from('import_batches')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });
    if (batchErr) {
      throw new Error(`資料表 [import_batches] 讀取失敗: ${batchErr.message}`);
    }

    // 8. import_row_sources
    const { data: sourcesData, error: srcErr } = await supabase
      .from('import_row_sources')
      .select('*')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false });
    if (srcErr) {
      throw new Error(`資料表 [import_row_sources] 讀取失敗: ${srcErr.message}`);
    }

    const tables: FinanceBackupTables = {
      currencies: (currenciesData as DbCurrency[]) || [],
      exchange_rates: (ratesData as DbExchangeRate[]) || [],
      categories: (categoriesData as DbCategory[]) || [],
      accounts: (accountsData as DbAccount[]) || [],
      members: (membersData as DbMember[]) || [],
      transactions: (transactionsData as DbTransaction[]) || [],
      import_batches: (batchesData as DbImportBatch[]) || [],
      import_row_sources: (sourcesData as DbImportRowSource[]) || [],
    };

    return {
      schema_version: BACKUP_SCHEMA_VERSION,
      app_version: CURRENT_APP_VERSION,
      exported_at: exportedAt,
      base_currency: 'TWD',
      user_id: effectiveUserId,
      metadata: {
        schema_version: BACKUP_SCHEMA_VERSION,
        app_version: CURRENT_APP_VERSION,
        exported_at: exportedAt,
        base_currency: 'TWD',
        user_id: effectiveUserId,
        generator: 'Personal Finance Manager (AI Studio)',
        summary: {
          total_transactions: tables.transactions.length,
          total_categories: tables.categories.length,
          total_accounts: tables.accounts.length,
          total_members: tables.members.length,
          total_rates: tables.exchange_rates.length,
          total_batches: tables.import_batches.length,
          total_sources: tables.import_row_sources.length,
        },
      },
      data: tables,
    };
  } catch (err: any) {
    throw new Error(`產生雲端備份失敗: ${err.message || err}`);
  }
}

/**
 * 將備份物件轉換為 UTF-8 JSON 字串並自動觸發瀏覽器下載
 * 檔名格式: personal_finance_backup_YYYYMMDD_HHMMSS.json
 */
export function downloadBackupFile(
  backup: FinanceBackupFile,
  prefix: string = 'personal_finance_backup'
): string {
  const date = new Date(backup.exported_at || Date.now());
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  const fileName = `${prefix}_${yyyy}${mm}${dd}_${hh}${min}${ss}.json`;
  const jsonString = JSON.stringify(backup, null, 2);

  // 若於瀏覽器環境中則觸發下載，伺服端/測試環境則略過 DOM 操作
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);
  }

  return fileName;
}
