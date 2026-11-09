/**
 * CSV Importer Engine
 * Executes the database transaction workflow:
 * 1. Creates missing categories/accounts/members
 * 2. Writes import_batches entry
 * 3. Chunks and writes transactions
 * 4. Writes import_row_sources for deduplication tracking
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import { ValidatedCsvRow } from './csvValidator';
import { DbCategory, DbAccount, DbMember, DbImportBatch, DbImportRowSource, TransactionType } from '../../types/database';
import { EnrichedTransaction } from '../../types/finance';
import { getMockCategoriesStore, setMockCategoriesStore } from '../supabase/categories';
import { getMockAccountsStore, setMockAccountsStore } from '../supabase/accounts';
import { getMockMembersStore, setMockMembersStore } from '../supabase/members';
import { getMockTransactionsStore, setMockTransactionsStore } from '../supabase/transactions';
import {
  getMockImportBatchesStore,
  setMockImportBatchesStore,
  getMockImportRowSourcesStore,
  setMockImportRowSourcesStore,
} from '../backup/backupEngine';

export interface ImportProgress {
  stage: 'preparing' | 'creating_metadata' | 'inserting_transactions' | 'completed' | 'failed';
  percent: number;
  currentStepMessage: string;
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
}

export interface ImportExecutionResult {
  success: boolean;
  batchId?: string;
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  errorRows: number;
  createdCategories: string[];
  createdAccounts: string[];
  createdMembers: string[];
  errorMessage?: string;
}

export async function executeCsvImport(
  validatedRows: ValidatedCsvRow[],
  fileHash: string,
  fileName: string,
  userId: string | undefined,
  currentCategories: DbCategory[],
  currentAccounts: DbAccount[],
  currentMembers: DbMember[],
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportExecutionResult> {
  const validRows = validatedRows.filter(r => r.status === 'valid');
  const duplicateRows = validatedRows.filter(r => r.status === 'duplicate');
  const errorRows = validatedRows.filter(r => r.status === 'error');

  // 本機 Mock 模式：真實寫入本地儲存庫（LocalStorage），供使用者即時測試與完整操作
  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    onProgress?.({
      stage: 'preparing',
      percent: 20,
      currentStepMessage: '本機模式：正在解析與建立缺失的分類、帳戶與成員...',
      importedCount: 0,
      duplicateCount: duplicateRows.length,
      errorCount: errorRows.length,
    });

    const currentCats = getMockCategoriesStore();
    const currentAccs = getMockAccountsStore();
    const currentMems = getMockMembersStore();

    const catMap = new Map<string, DbCategory>();
    currentCats.forEach(c => catMap.set(c.name.trim().toLowerCase(), c));
    const accMap = new Map<string, DbAccount>();
    currentAccs.forEach(a => accMap.set(a.name.trim().toLowerCase(), a));
    const memMap = new Map<string, DbMember>();
    currentMems.forEach(m => memMap.set(m.name.trim().toLowerCase(), m));

    const newlyCreatedCategories: string[] = [];
    const newlyCreatedAccounts: string[] = [];
    const newlyCreatedMembers: string[] = [];

    // 1. 補建分類、帳戶與成員
    for (const row of validRows) {
      const catKey = row.category.trim().toLowerCase();
      if (!catMap.has(catKey) && row.category.trim()) {
        const newCat: DbCategory = {
          id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          user_id: 'mock-user',
          name: row.category.trim(),
          type: row.type === 'income' ? 'income' : 'expense',
          color: row.type === 'income' ? '#10b981' : '#f97316',
          sort_order: currentCats.length + 1,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        currentCats.push(newCat);
        catMap.set(catKey, newCat);
        newlyCreatedCategories.push(newCat.name);
      }

      const accKey = row.account.trim().toLowerCase();
      if (!accMap.has(accKey) && row.account.trim()) {
        const newAcc: DbAccount = {
          id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          user_id: 'mock-user',
          name: row.account.trim(),
          account_type: 'bank',
          currency: row.currency || 'TWD',
          opening_balance: 0,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        currentAccs.push(newAcc);
        accMap.set(accKey, newAcc);
        newlyCreatedAccounts.push(newAcc.name);
      }

      const memKey = row.member.trim().toLowerCase();
      if (!memMap.has(memKey) && row.member.trim()) {
        const newMem: DbMember = {
          id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          user_id: 'mock-user',
          name: row.member.trim(),
          is_active: true,
          created_at: new Date().toISOString(),
        };
        currentMems.push(newMem);
        memMap.set(memKey, newMem);
        newlyCreatedMembers.push(newMem.name);
      }
    }

    setMockCategoriesStore(currentCats);
    setMockAccountsStore(currentAccs);
    setMockMembersStore(currentMems);

    onProgress?.({
      stage: 'inserting_transactions',
      percent: 60,
      currentStepMessage: `本機模式：正在寫入 ${validRows.length} 筆交易紀錄至本機儲存庫...`,
      importedCount: Math.round(validRows.length * 0.5),
      duplicateCount: duplicateRows.length,
      errorCount: errorRows.length,
    });

    const batchId = `mock-batch-${Date.now()}`;
    const newBatch: DbImportBatch = {
      id: batchId,
      user_id: 'mock-user',
      file_name: fileName,
      file_hash: fileHash,
      total_rows: validatedRows.length,
      imported_rows: validRows.length,
      duplicate_rows: duplicateRows.length,
      error_rows: errorRows.length,
      status: 'completed',
      created_at: new Date().toISOString(),
    };
    const batches = getMockImportBatchesStore();
    setMockImportBatchesStore([newBatch, ...batches]);

    const existingTxs = getMockTransactionsStore();
    const existingSources = getMockImportRowSourcesStore();

    // 執行階段終極防呆：再次排除已存在於現有來源庫的 UUID
    const existingUuidSet = new Set(existingSources.map(s => s.source_uuid).filter(Boolean));
    const safeRowsToImport = validRows.filter(r => !r.uuid || !existingUuidSet.has(r.uuid));

    const newTxs: EnrichedTransaction[] = [];
    const newSources: DbImportRowSource[] = [];

    for (const row of safeRowsToImport) {
      const txId = `tx-csv-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
      const cat = catMap.get(row.category.trim().toLowerCase()) || null;
      const acc = accMap.get(row.account.trim().toLowerCase()) || (currentAccs[0] || null);
      const mem = memMap.get(row.member.trim().toLowerCase()) || (currentMems[0] || null);

      const tx: EnrichedTransaction = {
        id: txId,
        user_id: 'mock-user',
        transaction_date: row.date,
        type: row.type,
        category_id: cat?.id || null,
        amount: row.amount,
        currency: row.currency || 'TWD',
        exchange_rate: 1.0,
        base_amount: row.amount,
        account_id: acc?.id || 'acc-huanan',
        member_id: mem?.id || 'mem-self',
        note: row.note || null,
        transfer_group_id: null,
        transfer_direction: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: cat || undefined,
        account: acc || undefined,
        member: mem || undefined,
      };

      const source: DbImportRowSource = {
        id: `src-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
        user_id: 'mock-user',
        transaction_id: txId,
        import_batch_id: batchId,
        source_uuid: row.uuid || null,
        source_fingerprint: row.fingerprint,
        created_at: new Date().toISOString(),
      };

      newTxs.push(tx);
      newSources.push(source);
    }

    // 真正寫入 Mock 交易儲存庫（自動持久化至 LocalStorage）
    setMockTransactionsStore([...newTxs, ...existingTxs]);
    setMockImportRowSourcesStore([...newSources, ...existingSources]);

    // 觸發自定義事件通知前台即時重載
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finance_data_updated', { detail: { type: 'csv_import', count: newTxs.length } }));
    }

    onProgress?.({
      stage: 'completed',
      percent: 100,
      currentStepMessage: `全數匯入完成！成功寫入 ${validRows.length} 筆交易`,
      importedCount: validRows.length,
      duplicateCount: duplicateRows.length,
      errorCount: errorRows.length,
    });

    return {
      success: true,
      batchId,
      totalRows: validatedRows.length,
      importedRows: validRows.length,
      duplicateRows: duplicateRows.length,
      errorRows: errorRows.length,
      createdCategories: newlyCreatedCategories,
      createdAccounts: newlyCreatedAccounts,
      createdMembers: newlyCreatedMembers,
    };
  }

  try {
    // 步驟 1: 檢查並補建缺失的 Category, Account, Member
    onProgress?.({
      stage: 'creating_metadata',
      percent: 15,
      currentStepMessage: '正在建立 CSV 中尚未存在的分類、帳戶與成員...',
      importedCount: 0,
      duplicateCount: duplicateRows.length,
      errorCount: errorRows.length,
    });

    // 建立快取映射表
    const categoryMap = new Map<string, string>(); // name.toLowerCase() -> id
    const accountMap = new Map<string, string>();
    const memberMap = new Map<string, string>();

    currentCategories.forEach(c => categoryMap.set(c.name.trim().toLowerCase(), c.id));
    currentAccounts.forEach(a => accountMap.set(a.name.trim().toLowerCase(), a.id));
    currentMembers.forEach(m => memberMap.set(m.name.trim().toLowerCase(), m.id));

    const newlyCreatedCategories: string[] = [];
    const newlyCreatedAccounts: string[] = [];
    const newlyCreatedMembers: string[] = [];

    // 補建缺失分類
    for (const row of validRows) {
      const catKey = row.category.trim().toLowerCase();
      if (!categoryMap.has(catKey) && row.category.trim()) {
        const { data: newCat, error } = (await supabase
          .from('categories')
          .insert([
            {
              user_id: userId,
              name: row.category.trim(),
              type: row.type,
              color: row.type === 'income' ? '#10b981' : '#f97316',
              sort_order: 50,
            },
          ] as any)
          .select('id, name')
          .single()) as unknown as { data: { id: string; name: string } | null; error: any };

        if (!error && newCat) {
          categoryMap.set(catKey, newCat.id);
          newlyCreatedCategories.push(newCat.name);
        }
      }

      // 補建缺失帳戶
      const accKey = row.account.trim().toLowerCase();
      if (!accountMap.has(accKey) && row.account.trim()) {
        const { data: newAcc, error } = (await supabase
          .from('accounts')
          .insert([
            {
              user_id: userId,
              name: row.account.trim(),
              account_type: 'bank',
              currency: row.currency || 'TWD',
              opening_balance: 0,
            },
          ] as any)
          .select('id, name')
          .single()) as unknown as { data: { id: string; name: string } | null; error: any };

        if (!error && newAcc) {
          accountMap.set(accKey, newAcc.id);
          newlyCreatedAccounts.push(newAcc.name);
        }
      }

      // 補建缺失成員
      const memKey = row.member.trim().toLowerCase();
      if (!memberMap.has(memKey) && row.member.trim()) {
        const { data: newMem, error } = (await supabase
          .from('members')
          .insert([
            {
              user_id: userId,
              name: row.member.trim(),
            },
          ] as any)
          .select('id, name')
          .single()) as unknown as { data: { id: string; name: string } | null; error: any };

        if (!error && newMem) {
          memberMap.set(memKey, newMem.id);
          newlyCreatedMembers.push(newMem.name);
        }
      }
    }

    // 步驟 2: 建立 import_batches 紀錄
    onProgress?.({
      stage: 'preparing',
      percent: 30,
      currentStepMessage: '正在建立匯入批次紀錄 (import_batches)...',
      importedCount: 0,
      duplicateCount: duplicateRows.length,
      errorCount: errorRows.length,
    });

    const { data: batchData, error: batchError } = (await supabase
      .from('import_batches')
      .insert([
        {
          user_id: userId,
          file_name: fileName,
          file_hash: fileHash,
          total_rows: validatedRows.length,
          imported_rows: validRows.length,
          duplicate_rows: duplicateRows.length,
          error_rows: errorRows.length,
          status: 'completed',
        },
      ] as any)
      .select('id')
      .single()) as unknown as { data: { id: string } | null; error: any };

    if (batchError || !batchData) {
      throw new Error(`無法建立匯入批次: ${batchError?.message || '未知錯誤'}`);
    }

    const batchId = batchData.id;

    // 步驟 3: 批次寫入 transactions 與 import_row_sources
    // 分批次寫入，每批 50 筆
    const CHUNK_SIZE = 50;
    let successfullyImported = 0;

    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + CHUNK_SIZE);

      const chunkPayloads = chunk.map(row => {
        const categoryId = categoryMap.get(row.category.trim().toLowerCase()) || null;
        const accountId = accountMap.get(row.account.trim().toLowerCase())!;
        const memberId = memberMap.get(row.member.trim().toLowerCase()) || null;
        const exchangeRate = 1.0;
        const baseAmount = row.amount * exchangeRate;

        return {
          transaction_date: row.date,
          type: row.type,
          category_id: categoryId,
          amount: row.amount,
          currency: row.currency || 'TWD',
          exchange_rate: exchangeRate,
          base_amount: baseAmount,
          account_id: accountId,
          member_id: memberId,
          note: row.note || null,
          transfer_group_id: null,
          transfer_direction: null,
          source_uuid: row.uuid || null,
          source_fingerprint: row.fingerprint,
        };
      });

      // 步驟 3: 呼叫 Phase 6A 原子性 PostgreSQL RPC (import_csv_batch)
      let chunkImported = 0;
      let rpcHandled = false;

      try {
        const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)('import_csv_batch', {
          p_batch_id: batchId,
          p_rows: chunkPayloads,
        });

        if (rpcError) {
          throw new Error(
            `雲端 CSV 匯入失敗：尚未部署 import_csv_batch RPC 函數或執行異常 (${rpcError.message})。為防止產生未關聯之孤兒交易，系統已強制終止匯入。請先在 Supabase 執行部署 Phase 6A Migration (20261107010000_transfer_direction_and_import_rpc.sql)。`
          );
        }

        const resultObj = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult;
        if (resultObj.success === false) {
          throw new Error(`資料庫批次交易失敗並已全數 Rollback: ${resultObj.error_message || '未知錯誤'}`);
        }
        chunkImported = resultObj.imported_count !== undefined ? resultObj.imported_count : chunk.length;
      } catch (err: any) {
        throw err;
      }

      successfullyImported += chunkImported;
      const progressPercent = 30 + Math.round((successfullyImported / validRows.length) * 65);

      onProgress?.({
        stage: 'inserting_transactions',
        percent: progressPercent,
        currentStepMessage: `已匯入 ${successfullyImported} / ${validRows.length} 筆交易...`,
        importedCount: successfullyImported,
        duplicateCount: duplicateRows.length,
        errorCount: errorRows.length,
      });
    }

    onProgress?.({
      stage: 'completed',
      percent: 100,
      currentStepMessage: '全數匯入完成！',
      importedCount: successfullyImported,
      duplicateCount: duplicateRows.length,
      errorCount: errorRows.length,
    });

    return {
      success: true,
      batchId,
      totalRows: validatedRows.length,
      importedRows: successfullyImported,
      duplicateRows: duplicateRows.length,
      errorRows: errorRows.length,
      createdCategories: newlyCreatedCategories,
      createdAccounts: newlyCreatedAccounts,
      createdMembers: newlyCreatedMembers,
    };
  } catch (err: any) {
    console.error('Import execution failed:', err);
    onProgress?.({
      stage: 'failed',
      percent: 100,
      currentStepMessage: `匯入中斷：${err.message}`,
      importedCount: 0,
      duplicateCount: duplicateRows.length,
      errorCount: errorRows.length,
    });

    return {
      success: false,
      totalRows: validatedRows.length,
      importedRows: 0,
      duplicateRows: duplicateRows.length,
      errorRows: errorRows.length,
      createdCategories: [],
      createdAccounts: [],
      createdMembers: [],
      errorMessage: err.message,
    };
  }
}
