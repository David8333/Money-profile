/**
 * CSV Validator and Deduplication Engine
 * Handles within-file UUID deduplication, database UUID deduplication,
 * fingerprint tracking, and missing category/account/member analysis.
 */

import Papa from 'papaparse';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import {
  RawParsedCsvRow,
  identifyColumns,
  parseDateString,
  parseDirection,
  parseAmount,
  generateTransactionFingerprint,
} from './csvParser';
import { DbCategory, DbAccount, DbMember } from '../../types/database';
import { getMockImportRowSourcesStore, getMockImportBatchesStore } from '../backup/backupEngine';

export interface ValidatedCsvRow extends RawParsedCsvRow {
  status: 'valid' | 'duplicate' | 'error';
  statusReason?: string;
  isMissingCategory?: boolean;
  isMissingAccount?: boolean;
  isMissingMember?: boolean;
}

export interface CsvValidationSummary {
  fileName: string;
  fileHash: string;
  totalRows: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  // 未存在之元資料清單（可於匯入時自動建立）
  missingCategories: string[];
  missingAccounts: string[];
  missingMembers: string[];
  // 已經在資料庫匯入過的批次紀錄
  existingBatch?: {
    id: string;
    createdAt: string;
    totalRows: number;
  } | null;
  validatedRows: ValidatedCsvRow[];
}

/**
 * 查詢資料庫中已存在的 UUID 清單與指紋清單
 */
async function fetchExistingSources(
  userId: string,
  uuids: string[],
  fingerprints: string[]
): Promise<{
  existingUuids: Set<string>;
  existingFingerprints: Set<string>;
  existingFingerprintCounts: Map<string, number>;
}> {
  const existingUuids = new Set<string>();
  const existingFingerprints = new Set<string>();
  const existingFingerprintCounts = new Map<string, number>();

  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    const mockSources = getMockImportRowSourcesStore();
    mockSources.forEach(s => {
      if (s.source_uuid) existingUuids.add(s.source_uuid);
      if (s.source_fingerprint) {
        existingFingerprints.add(s.source_fingerprint);
        existingFingerprintCounts.set(
          s.source_fingerprint,
          (existingFingerprintCounts.get(s.source_fingerprint) || 0) + 1
        );
      }
    });
    return { existingUuids, existingFingerprints, existingFingerprintCounts };
  }

  try {
    // 1. 查詢已存在的 UUID（若清單不為空）
    const validUuids = uuids.filter(u => u && u.trim().length > 0);
    if (validUuids.length > 0) {
      // 依批次切分查詢以避免 SQL 參數過多 (每批 200 筆)
      for (let i = 0; i < validUuids.length; i += 200) {
        const chunk = validUuids.slice(i, i + 200);
        const { data, error } = await supabase
          .from('import_row_sources')
          .select('source_uuid')
          .eq('user_id', userId)
          .in('source_uuid', chunk);

        if (!error && data) {
          (data as Array<{ source_uuid: string | null }>).forEach(r => {
            if (r.source_uuid) existingUuids.add(r.source_uuid);
          });
        }
      }
    }

    // 2. 查詢無 UUID 時的指紋（若有需要比對）
    const validFingerprints = fingerprints.filter(f => f && f.trim().length > 0);
    if (validFingerprints.length > 0) {
      for (let i = 0; i < validFingerprints.length; i += 200) {
        const chunk = validFingerprints.slice(i, i + 200);
        const { data, error } = await supabase
          .from('import_row_sources')
          .select('source_fingerprint')
          .eq('user_id', userId)
          .in('source_fingerprint', chunk);

        if (!error && data) {
          (data as Array<{ source_fingerprint: string }>).forEach(r => {
            if (r.source_fingerprint) {
              existingFingerprints.add(r.source_fingerprint);
              existingFingerprintCounts.set(
                r.source_fingerprint,
                (existingFingerprintCounts.get(r.source_fingerprint) || 0) + 1
              );
            }
          });
        }
      }
    }
  } catch (err) {
    console.warn('查詢資料庫重複紀錄發生異常，將以檔案內去重為主:', err);
  }

  return { existingUuids, existingFingerprints, existingFingerprintCounts };
}

/**
 * 查詢該檔案是否曾被上傳過
 */
async function checkExistingBatch(
  userId: string,
  fileHash: string
): Promise<{ id: string; createdAt: string; totalRows: number } | null> {
  if (!isSupabaseConfigured() || !userId || userId === 'mock-user') {
    const mockBatches = getMockImportBatchesStore();
    const existing = mockBatches.find(b => b.file_hash === fileHash && b.status === 'completed');
    if (existing) {
      return {
        id: existing.id,
        createdAt: existing.created_at,
        totalRows: existing.total_rows,
      };
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('import_batches')
      .select('id, created_at, total_rows')
      .eq('user_id', userId)
      .eq('file_hash', fileHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const batch = data as unknown as { id: string; created_at: string; total_rows: number };
      return {
        id: batch.id,
        createdAt: batch.created_at,
        totalRows: batch.total_rows,
      };
    }
  } catch (err) {
    console.warn('檢查匯入批次失敗:', err);
  }
  return null;
}

/**
 * 主驗證與去重邏輯
 */
export async function validateAndDeduplicateCsv(
  parsedRows: RawParsedCsvRow[],
  fileHash: string,
  fileName: string,
  userId?: string,
  currentCategories: DbCategory[] = [],
  currentAccounts: DbAccount[] = [],
  currentMembers: DbMember[] = []
): Promise<CsvValidationSummary> {
  // 1. 蒐集所有 UUID 與指紋以進行資料庫查詢
  const allUuids = parsedRows.map(r => r.uuid).filter((u): u is string => !!u);
  const allFingerprints = parsedRows.filter(r => !r.uuid).map(r => r.fingerprint);

  const { existingUuids, existingFingerprints, existingFingerprintCounts } = await fetchExistingSources(
    userId || '',
    allUuids,
    allFingerprints
  );

  const existingBatch = userId ? await checkExistingBatch(userId, fileHash) : null;

  // 現有分類、帳戶、成員快速查找集合
  const knownCategories = new Set(currentCategories.map(c => c.name.trim().toLowerCase()));
  const knownAccounts = new Set(currentAccounts.map(a => a.name.trim().toLowerCase()));
  const knownMembers = new Set(currentMembers.map(m => m.name.trim().toLowerCase()));

  // 缺少的分類、帳戶、成員暫存集合
  const missingCategoriesSet = new Set<string>();
  const missingAccountsSet = new Set<string>();
  const missingMembersSet = new Set<string>();

  // 檔案內已出現之 UUID 與無 UUID 指紋追蹤次數
  const seenFileUuids = new Set<string>();
  const fileFingerprintCounts = new Map<string, number>();

  let validCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  const validatedRows: ValidatedCsvRow[] = [];

  for (const row of parsedRows) {
    // 檢查缺少的元資料
    const isMissingCat = row.category ? !knownCategories.has(row.category.trim().toLowerCase()) : false;
    const isMissingAcc = row.account ? !knownAccounts.has(row.account.trim().toLowerCase()) : false;
    const isMissingMem = row.member ? !knownMembers.has(row.member.trim().toLowerCase()) : false;

    if (isMissingCat && row.category) missingCategoriesSet.add(row.category.trim());
    if (isMissingAcc && row.account) missingAccountsSet.add(row.account.trim());
    if (isMissingMem && row.member) missingMembersSet.add(row.member.trim());

    // 1. 若本身已有格式或必填錯誤
    if (row.hasError) {
      errorCount++;
      validatedRows.push({
        ...row,
        status: 'error',
        statusReason: row.errorMessage || '資料格式錯誤',
        isMissingCategory: isMissingCat,
        isMissingAccount: isMissingAcc,
        isMissingMember: isMissingMem,
      });
      continue;
    }

    // 2. UUID 去重優先原則
    if (row.uuid) {
      // 檢查是否已在資料庫或歷史匯入來源中
      if (existingUuids.has(row.uuid)) {
        duplicateCount++;
        validatedRows.push({
          ...row,
          status: 'duplicate',
          statusReason: `資料庫已存在相同 UUID (${row.uuid})，自動略過`,
          isMissingCategory: isMissingCat,
          isMissingAccount: isMissingAcc,
          isMissingMember: isMissingMem,
        });
        continue;
      }

      // 檢查是否在同一份 CSV 前面出現過
      if (seenFileUuids.has(row.uuid)) {
        duplicateCount++;
        validatedRows.push({
          ...row,
          status: 'duplicate',
          statusReason: `檔案內重複 UUID (${row.uuid})`,
          isMissingCategory: isMissingCat,
          isMissingAccount: isMissingAcc,
          isMissingMember: isMissingMem,
        });
        continue;
      }

      // 第一次見到此 UUID -> 合法
      seenFileUuids.add(row.uuid);
      validCount++;
      validatedRows.push({
        ...row,
        status: 'valid',
        isMissingCategory: isMissingCat,
        isMissingAccount: isMissingAcc,
        isMissingMember: isMissingMem,
      });
      continue;
    }

    // 3. 無 UUID 之交易去重檢查
    // 若該檔案批次曾完整匯入過，自動判定為重複檔案批次
    if (existingBatch) {
      duplicateCount++;
      validatedRows.push({
        ...row,
        status: 'duplicate',
        statusReason: `此檔案先前已完整匯入過（批次編號 ${existingBatch.id.slice(0, 12)}），自動略過避免金額重複疊加`,
        isMissingCategory: isMissingCat,
        isMissingAccount: isMissingAcc,
        isMissingMember: isMissingMem,
      });
      continue;
    }

    // 計算本檔案目前出現該指紋的第幾次 (支援同一天、同金額、同分類的多筆真實消費)
    const currentOccurrence = (fileFingerprintCounts.get(row.fingerprint) || 0) + 1;
    fileFingerprintCounts.set(row.fingerprint, currentOccurrence);

    const dbOccurrence = existingFingerprintCounts.get(row.fingerprint) || 0;
    if (currentOccurrence <= dbOccurrence) {
      // 歷史已存在對應次數的相同交易
      duplicateCount++;
      validatedRows.push({
        ...row,
        status: 'duplicate',
        statusReason: '資料庫中已存在對應的歷史交易紀錄（指紋一致），自動略過避免重複累加',
        isMissingCategory: isMissingCat,
        isMissingAccount: isMissingAcc,
        isMissingMember: isMissingMem,
      });
      continue;
    }

    // 合法新交易（包含同一天、同金額、同分類的額外合法交易）
    validCount++;
    validatedRows.push({
      ...row,
      status: 'valid',
      isMissingCategory: isMissingCat,
      isMissingAccount: isMissingAcc,
      isMissingMember: isMissingMem,
    });
    continue;
  }

  return {
    fileName,
    fileHash,
    totalRows: parsedRows.length,
    validCount,
    duplicateCount,
    errorCount,
    missingCategories: Array.from(missingCategoriesSet),
    missingAccounts: Array.from(missingAccountsSet),
    missingMembers: Array.from(missingMembersSet),
    existingBatch,
    validatedRows,
  };
}

/**
 * 簡易同步驗證（常用於測試、即時預覽與重複判定檢查）
 */
export function validateCsvRows(
  csvText: string,
  _ignored: any[] = [],
  existingUuids: Set<string> = new Set()
): {
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  rows: ValidatedCsvRow[];
} {
  let cleanCsv = csvText;
  if (cleanCsv.charCodeAt(0) === 0xfeff) {
    cleanCsv = cleanCsv.slice(1);
  }

  const parsed = Papa.parse<Record<string, string>>(cleanCsv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const headers = parsed.meta.fields || [];
  const columnMap = identifyColumns(headers);

  const seenUuids = new Set<string>();
  const seenFingerprints = new Set<string>();
  const rows: ValidatedCsvRow[] = [];
  let validCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  parsed.data.forEach((record, index) => {
    const rowNumber = index + 2;
    const rawDate = columnMap.date ? record[columnMap.date] || '' : '';
    const rawCategory = columnMap.category ? record[columnMap.category] || '' : '';
    const rawAmount = columnMap.amount ? record[columnMap.amount] || '' : '';
    const rawCurrency = columnMap.currency ? record[columnMap.currency] || 'TWD' : 'TWD';
    const rawMember = columnMap.member ? record[columnMap.member] || '自己' : '自己';
    const rawAccount = columnMap.account ? record[columnMap.account] || '未指定帳戶' : '未指定帳戶';
    const rawNote = columnMap.note ? record[columnMap.note] || '' : '';
    const rawDirection = columnMap.direction ? record[columnMap.direction] || '支' : '支';
    const rawUuid = columnMap.uuid ? (record[columnMap.uuid] || '').trim() : undefined;

    const dateResult = parseDateString(rawDate);
    const directionResult = parseDirection(rawDirection);
    const amountResult = parseAmount(rawAmount);

    const rowErrors: string[] = [];
    if (!dateResult.isValid) rowErrors.push(dateResult.error || '日期錯誤');
    if (!amountResult.isValid) rowErrors.push(amountResult.error || '金額錯誤');
    if (!directionResult.isValid) rowErrors.push('收支無法識別');
    if (!rawCategory.trim()) rowErrors.push('類別為空');

    const finalDate = dateResult.isValid ? dateResult.isoDate : rawDate.trim();
    const finalCategory = rawCategory.trim() || '其它';
    const finalCurrency = rawCurrency.trim().toUpperCase() || 'TWD';
    const finalMember = rawMember.trim() || '自己';
    const finalAccount = rawAccount.trim() || '未指定帳戶';
    const finalNote = rawNote.trim();

    const fingerprint = generateTransactionFingerprint({
      date: finalDate,
      type: directionResult.type,
      category: finalCategory,
      amount: amountResult.amount,
      currency: finalCurrency,
      account: finalAccount,
      member: finalMember,
      note: finalNote,
    });

    const hasError = rowErrors.length > 0;
    const errorMessage = hasError ? rowErrors.join('；') : undefined;

    if (hasError) {
      errorCount++;
      rows.push({
        rowIndex: rowNumber,
        date: finalDate,
        category: finalCategory,
        amount: amountResult.amount,
        currency: finalCurrency,
        member: finalMember,
        account: finalAccount,
        note: finalNote,
        direction: rawDirection.trim(),
        type: directionResult.type,
        uuid: rawUuid,
        rawRecord: record,
        fingerprint,
        hasError: true,
        errorMessage,
        status: 'error',
        statusReason: errorMessage,
      });
      return;
    }

    if (rawUuid) {
      if (existingUuids.has(rawUuid) || seenUuids.has(rawUuid)) {
        duplicateCount++;
        rows.push({
          rowIndex: rowNumber,
          date: finalDate,
          category: finalCategory,
          amount: amountResult.amount,
          currency: finalCurrency,
          member: finalMember,
          account: finalAccount,
          note: finalNote,
          direction: rawDirection.trim(),
          type: directionResult.type,
          uuid: rawUuid,
          rawRecord: record,
          fingerprint,
          hasError: false,
          status: 'duplicate',
          statusReason: `UUID 重複 (${rawUuid})`,
        });
        return;
      }
      seenUuids.add(rawUuid);
    } else {
      if (seenFingerprints.has(fingerprint)) {
        duplicateCount++;
        rows.push({
          rowIndex: rowNumber,
          date: finalDate,
          category: finalCategory,
          amount: amountResult.amount,
          currency: finalCurrency,
          member: finalMember,
          account: finalAccount,
          note: finalNote,
          direction: rawDirection.trim(),
          type: directionResult.type,
          uuid: rawUuid,
          rawRecord: record,
          fingerprint,
          hasError: false,
          status: 'duplicate',
          statusReason: '檔案內完全相同之重複紀錄（無 UUID）',
        });
        return;
      }
      seenFingerprints.add(fingerprint);
    }

    validCount++;
    rows.push({
      rowIndex: rowNumber,
      date: finalDate,
      category: finalCategory,
      amount: amountResult.amount,
      currency: finalCurrency,
      member: finalMember,
      account: finalAccount,
      note: finalNote,
      direction: rawDirection.trim(),
      type: directionResult.type,
      uuid: rawUuid,
      rawRecord: record,
      fingerprint,
      hasError: false,
      status: 'valid',
    });
  });

  return {
    validCount,
    duplicateCount,
    errorCount,
    rows,
  };
}

