/**
 * Transaction Reset Engine
 * Safely clears all transactions, import row sources, and import batches
 * while strictly preserving accounts, categories, members, currencies,
 * exchange rates, and annual budget planning settings.
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import {
  getMockTransactionsStore,
  setMockTransactionsStore,
} from '../supabase/transactions';
import {
  getMockImportRowSourcesStore,
  setMockImportRowSourcesStore,
  getMockImportBatchesStore,
  setMockImportBatchesStore,
} from '../backup/backupEngine';

export interface ResetTransactionStats {
  transactionCount: number;
  importSourceCount: number;
  importBatchCount: number;
}

export interface ResetExecutionResult {
  success: boolean;
  deletedTransactionCount: number;
  deletedSourceCount: number;
  deletedBatchCount: number;
  error?: string;
}

/**
 * 查詢目前即將被重置的交易資料筆數
 */
export async function getResetStats(userId?: string): Promise<ResetTransactionStats> {
  const currentUserId = userId || 'mock-user';

  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    const txs = getMockTransactionsStore();
    const sources = getMockImportRowSourcesStore();
    const batches = getMockImportBatchesStore();
    return {
      transactionCount: txs.length,
      importSourceCount: sources.length,
      importBatchCount: batches.length,
    };
  }

  try {
    const [txCountRes, srcCountRes, batchCountRes] = await Promise.all([
      supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId),
      supabase.from('import_row_sources').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId),
      supabase.from('import_batches').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId),
    ]);

    return {
      transactionCount: txCountRes.count || 0,
      importSourceCount: srcCountRes.count || 0,
      importBatchCount: batchCountRes.count || 0,
    };
  } catch (err: any) {
    console.error('查詢重置統計失敗:', err);
    return {
      transactionCount: 0,
      importSourceCount: 0,
      importBatchCount: 0,
    };
  }
}

/**
 * 執行全部記帳資料重置
 * 嚴格要求：
 * - 清除所有收入、支出、轉帳交易
 * - 清除所有 import_row_sources
 * - 清除所有 import_batches
 * - 完整保留 accounts, categories, members, currencies, exchange_rates, cfo budgets
 */
export async function executeResetAllTransactions(userId?: string): Promise<ResetExecutionResult> {
  const currentUserId = userId || 'mock-user';

  // 1. 本機 / Mock 模式處理
  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    const prevTxCount = getMockTransactionsStore().length;
    const prevSrcCount = getMockImportRowSourcesStore().length;
    const prevBatchCount = getMockImportBatchesStore().length;

    try {
      // 清空交易、來源紀錄與批次
      setMockTransactionsStore([]);
      setMockImportRowSourcesStore([]);
      setMockImportBatchesStore([]);

      // 觸發全域廣播事件，通知 Dashboard, CFO, 交易清單即時更新歸零
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('finance_data_updated', { detail: { type: 'reset_all' } }));
        window.dispatchEvent(new CustomEvent('cfo_data_updated', { detail: { type: 'reset_all' } }));
      }

      return {
        success: true,
        deletedTransactionCount: prevTxCount,
        deletedSourceCount: prevSrcCount,
        deletedBatchCount: prevBatchCount,
      };
    } catch (err: any) {
      return {
        success: false,
        deletedTransactionCount: 0,
        deletedSourceCount: 0,
        deletedBatchCount: 0,
        error: err?.message || '重置本機交易資料失敗',
      };
    }
  }

  // 2. 雲端 Supabase 模式處理
  try {
    // 依序刪除關聯資料（import_row_sources -> transactions -> import_batches）
    // 確保有適當的 user_id 隔離保護
    const { count: deletedSources, error: srcError } = await supabase
      .from('import_row_sources')
      .delete({ count: 'exact' })
      .eq('user_id', currentUserId);

    if (srcError) {
      throw new Error(`清除匯入來源紀錄失敗: ${srcError.message}`);
    }

    const { count: deletedTxs, error: txError } = await supabase
      .from('transactions')
      .delete({ count: 'exact' })
      .eq('user_id', currentUserId);

    if (txError) {
      throw new Error(`清除交易資料失敗: ${txError.message}`);
    }

    const { count: deletedBatches, error: batchError } = await supabase
      .from('import_batches')
      .delete({ count: 'exact' })
      .eq('user_id', currentUserId);

    if (batchError) {
      throw new Error(`清除匯入批次失敗: ${batchError.message}`);
    }

    // 觸發全域廣播事件
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finance_data_updated', { detail: { type: 'reset_all' } }));
      window.dispatchEvent(new CustomEvent('cfo_data_updated', { detail: { type: 'reset_all' } }));
    }

    return {
      success: true,
      deletedTransactionCount: deletedTxs || 0,
      deletedSourceCount: deletedSources || 0,
      deletedBatchCount: deletedBatches || 0,
    };
  } catch (err: any) {
    return {
      success: false,
      deletedTransactionCount: 0,
      deletedSourceCount: 0,
      deletedBatchCount: 0,
      error: err?.message || '雲端資料庫重置失敗',
    };
  }
}
