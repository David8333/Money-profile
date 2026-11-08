/**
 * CSV Parser Engine for Personal Finance Manager
 * Supports RFC 4180 compliance, UTF-8 Chinese characters, BOM stripping,
 * arbitrary column ordering, YYYYMMDD date parsing, and robust amount extraction.
 */

import Papa from 'papaparse';
import { TransactionType } from '../../types/database';

export interface RawParsedCsvRow {
  rowIndex: number;
  date: string;
  category: string;
  amount: number;
  currency: string;
  member: string;
  account: string;
  note: string;
  direction: string;
  type: TransactionType;
  uuid?: string;
  rawRecord: Record<string, string>;
  fingerprint: string;
  hasError: boolean;
  errorMessage?: string;
}

export interface CsvParseResult {
  fileName: string;
  fileSize: number;
  fileHash: string;
  totalRows: number;
  detectedHeaders: Record<string, string>; // internal field -> matched CSV header
  rows: RawParsedCsvRow[];
  errors: { rowIndex: number; message: string }[];
}

/**
 * 欄位別名對照表（支援不同名稱與順序）
 */
const COLUMN_ALIASES = {
  date: ['日期', 'date', '交易日期', '記帳日期', 'time'],
  category: ['類別', 'category', '分類', '子類別'],
  amount: ['金額', 'amount', '數值', '交易金額', '價錢'],
  currency: ['貨幣', 'currency', '幣別', '幣種'],
  member: ['成員', 'member', '人員', '使用者', '對象'],
  account: ['帳戶', 'account', '帳號', '資產帳戶', '付款方式'],
  note: ['備註', 'note', '說明', '備註說明', '摘要', '內容'],
  direction: ['收支區分', 'direction', '收支', '收/支', '類型', 'type'],
  uuid: ['uuid', 'id', '交易id', '識別碼', '唯一碼', '編號'],
};

/**
 * 清除字串前後空格與引號
 */
function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * 自動識別 CSV 標題欄位
 */
export function identifyColumns(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const cleanedHeaders = headers.map(h => cleanString(h).toLowerCase());

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const idx = cleanedHeaders.findIndex(h => h === alias.toLowerCase() || h.includes(alias.toLowerCase()));
      if (idx !== -1) {
        result[field] = headers[idx];
        break;
      }
    }
  }

  return result;
}

/**
 * 解析日期字串為標準 ISO 格式 (YYYY-MM-DD)
 * 支援：
 * 1. YYYYMMDD (例如: 20240315)
 * 2. YYYY-MM-DD (例如: 2024-03-15)
 * 3. YYYY/MM/DD (例如: 2024/03/15)
 * 4. YYYY.MM.DD (例如: 2024.03.15)
 */
export function parseDateString(rawDate: string): { isoDate: string; isValid: boolean; error?: string } {
  const clean = cleanString(rawDate).replace(/[\s\r\n]/g, '');
  if (!clean) {
    return { isoDate: '', isValid: false, error: '日期欄位為空' };
  }

  let year = 0;
  let month = 0;
  let day = 0;

  // 格式 1: 純數字 YYYYMMDD (8碼)
  if (/^\d{8}$/.test(clean)) {
    year = parseInt(clean.substring(0, 4), 10);
    month = parseInt(clean.substring(4, 6), 10);
    day = parseInt(clean.substring(6, 8), 10);
  }
  // 格式 2: 分隔符號 YYYY-MM-DD 或 YYYY/MM/DD 或 YYYY.MM.DD
  else if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(clean)) {
    const parts = clean.split(/[-/.]/);
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    return { isoDate: '', isValid: false, error: `無法識別的日期格式: "${rawDate}"，請使用 YYYYMMDD 或 YYYY-MM-DD` };
  }

  // 驗證月日年份合理性
  if (year < 1900 || year > 2100) {
    return { isoDate: '', isValid: false, error: `年份無效: ${year}` };
  }
  if (month < 1 || month > 12) {
    return { isoDate: '', isValid: false, error: `月份無效: ${month}` };
  }

  const maxDays = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDays) {
    return { isoDate: '', isValid: false, error: `${year}年${month}月無第 ${day} 日` };
  }

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return { isoDate: `${year}-${mm}-${dd}`, isValid: true };
}

/**
 * 解析收支區分
 * 「支」-> expense
 * 「收」-> income
 */
export function parseDirection(rawDirection: string): { type: TransactionType; isValid: boolean } {
  const clean = cleanString(rawDirection).toLowerCase();
  if (clean === '支' || clean === '支出' || clean === 'expense' || clean === 'out') {
    return { type: 'expense', isValid: true };
  }
  if (clean === '收' || clean === '收入' || clean === 'income' || clean === 'in') {
    return { type: 'income', isValid: true };
  }
  return { type: 'expense', isValid: false };
}

/**
 * 解析金額
 * 支援包含千分位、幣別符號、負號等。合法的 0 元金額保留。
 */
export function parseAmount(rawAmount: any): { amount: number; isValid: boolean; error?: string } {
  if (rawAmount === null || rawAmount === undefined || rawAmount === '') {
    return { amount: 0, isValid: false, error: '金額為空' };
  }

  // 清除常見干擾字元: $, NT$, 逗號, 空格
  const clean = String(rawAmount)
    .replace(/[$,NT¥€£\s]/g, '')
    .trim();

  const num = Number(clean);
  if (isNaN(num)) {
    return { amount: 0, isValid: false, error: `金額無法轉換為數值: "${rawAmount}"` };
  }

  // 保持精確度至小數點第 4 位 (對齊 NUMERIC(15, 4))
  const precisionAmount = Math.round(num * 10000) / 10000;
  return { amount: precisionAmount, isValid: true };
}

/**
 * 使用 Web Crypto API 計算文字的 SHA-256 雜湊
 */
export async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 產生交易複合指紋（用於無 UUID 時的第二層比對）
 */
export function generateTransactionFingerprint(params: {
  date: string;
  type: string;
  category: string;
  amount: number;
  currency: string;
  account: string;
  member: string;
  note: string;
}): string {
  const normalized = [
    params.date.trim(),
    params.type.trim(),
    params.category.trim().toLowerCase(),
    params.amount.toFixed(2),
    params.currency.trim().toUpperCase(),
    params.account.trim().toLowerCase(),
    params.member.trim().toLowerCase(),
    params.note.trim(),
  ].join('|');

  // 快速 hash 或 normalized 字串
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(16)}_${normalized.slice(0, 32)}`;
}

/**
 * 主解析函式：解析 CSV 內容為結構化紀錄
 */
export async function parseCsvContent(
  csvText: string,
  fileName: string = 'export.csv'
): Promise<CsvParseResult> {
  // 1. 移除 UTF-8 BOM 標記 (\uFEFF)
  let cleanCsv = csvText;
  if (cleanCsv.charCodeAt(0) === 0xfeff) {
    cleanCsv = cleanCsv.slice(1);
  }

  const fileHash = await computeSha256(cleanCsv);

  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(cleanCsv, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => cleanString(h),
      complete: (results) => {
        const headers = results.meta.fields || [];
        const columnMap = identifyColumns(headers);

        const rows: RawParsedCsvRow[] = [];
        const errors: { rowIndex: number; message: string }[] = [];

        // 檢查必要欄位是否辨識成功
        const missingCrucialHeaders: string[] = [];
        if (!columnMap.date) missingCrucialHeaders.push('日期');
        if (!columnMap.amount) missingCrucialHeaders.push('金額');
        if (!columnMap.direction) missingCrucialHeaders.push('收支區分');

        results.data.forEach((record, index) => {
          const rowNumber = index + 2; // CSV 序號 (含表頭行)

          // 讀取各欄位
          const rawDate = columnMap.date ? record[columnMap.date] : '';
          const rawCategory = columnMap.category ? record[columnMap.category] : '';
          const rawAmount = columnMap.amount ? record[columnMap.amount] : '';
          const rawCurrency = columnMap.currency ? record[columnMap.currency] : 'TWD';
          const rawMember = columnMap.member ? record[columnMap.member] : '自己';
          const rawAccount = columnMap.account ? record[columnMap.account] : '未指定帳戶';
          const rawNote = columnMap.note ? record[columnMap.note] : '';
          const rawDirection = columnMap.direction ? record[columnMap.direction] : '支';
          const rawUuid = columnMap.uuid ? record[columnMap.uuid] : '';

          // 日期解析
          const dateResult = parseDateString(rawDate);
          // 收支解析
          const directionResult = parseDirection(rawDirection);
          // 金額解析
          const amountResult = parseAmount(rawAmount);

          // 錯誤收集
          const rowErrors: string[] = [];
          if (!dateResult.isValid) rowErrors.push(dateResult.error || '日期錯誤');
          if (!amountResult.isValid) rowErrors.push(amountResult.error || '金額錯誤');
          if (!directionResult.isValid) rowErrors.push(`收支區分無法識別("${rawDirection}")，請填入「支」或「收」`);
          if (!cleanString(rawCategory)) rowErrors.push('類別為空');

          const hasError = rowErrors.length > 0;
          const errorMessage = rowErrors.join('；');

          if (hasError) {
            errors.push({ rowIndex: rowNumber, message: errorMessage });
          }

          // 交易指紋
          const finalDate = dateResult.isValid ? dateResult.isoDate : cleanString(rawDate);
          const finalCategory = cleanString(rawCategory) || '其它';
          const finalCurrency = cleanString(rawCurrency).toUpperCase() || 'TWD';
          const finalMember = cleanString(rawMember) || '自己';
          const finalAccount = cleanString(rawAccount) || '未指定帳戶';
          const finalNote = cleanString(rawNote);
          const finalUuid = cleanString(rawUuid) || undefined;

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

          rows.push({
            rowIndex: rowNumber,
            date: finalDate,
            category: finalCategory,
            amount: amountResult.amount,
            currency: finalCurrency,
            member: finalMember,
            account: finalAccount,
            note: finalNote,
            direction: cleanString(rawDirection),
            type: directionResult.type,
            uuid: finalUuid,
            rawRecord: record,
            fingerprint,
            hasError,
            errorMessage: hasError ? errorMessage : undefined,
          });
        });

        resolve({
          fileName,
          fileSize: cleanCsv.length,
          fileHash,
          totalRows: rows.length,
          detectedHeaders: columnMap,
          rows,
          errors,
        });
      },
    });
  });
}
