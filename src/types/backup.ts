/**
 * Backup and Restore Type Definitions
 * Supports Schema Version 1.0.0
 */

import {
  DbAccount,
  DbCategory,
  DbCurrency,
  DbExchangeRate,
  DbImportBatch,
  DbImportRowSource,
  DbMember,
  DbTransaction,
} from './database';

export const BACKUP_SCHEMA_VERSION = '1.0.0';
export const CURRENT_APP_VERSION = '1.0.0';

export interface FinanceBackupMetadata {
  schema_version: string;
  app_version: string;
  exported_at: string;
  base_currency: string;
  user_id: string;
  generator?: string;
  summary?: {
    total_transactions: number;
    total_categories: number;
    total_accounts: number;
    total_members: number;
    total_rates: number;
    total_batches: number;
    total_sources: number;
  };
}

export interface FinanceBackupTables {
  currencies: DbCurrency[];
  exchange_rates: DbExchangeRate[];
  categories: DbCategory[];
  accounts: DbAccount[];
  members: DbMember[];
  transactions: DbTransaction[];
  import_batches: DbImportBatch[];
  import_row_sources: DbImportRowSource[];
}

export interface FinanceBackupFile {
  schema_version: string;
  app_version: string;
  exported_at: string;
  base_currency: string;
  user_id: string;
  metadata?: FinanceBackupMetadata;
  data: FinanceBackupTables;
}

export interface RestorePreviewAnalysis {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  backupMetadata: FinanceBackupMetadata;
  tableCounts: {
    currencies: number;
    exchange_rates: number;
    categories: number;
    accounts: number;
    members: number;
    transactions: number;
    import_batches: number;
    import_row_sources: number;
  };
  transactionBreakdown: {
    total: number;
    incomeCount: number;
    expenseCount: number;
    transferCount: number;
    legacyTransferMissingDirectionCount: number; // transfer_direction is null
    missingRateCount: number; // exchange_rate <= 0 or null
    unmatchedCategoryCount: number;
    unmatchedAccountCount: number;
    unmatchedMemberCount: number;
  };
  existingConflictCounts: {
    duplicateTransactionUuids: number;
    existingExchangeRatesCount: number;
    existingCategoriesCount: number;
    existingAccountsCount: number;
    existingMembersCount: number;
  };
}

export type RestoreMode = 'merge' | 'full';

export interface RestoreOptions {
  mode: RestoreMode;
  confirmedUserIdCheck: boolean;
  confirmationText?: string;
  safetySnapshotDownloaded?: boolean;
}

export interface RestoreResult {
  success: boolean;
  mode: RestoreMode;
  restoredCounts: Record<keyof FinanceBackupTables, number>;
  skippedDuplicateCounts: Record<keyof FinanceBackupTables, number>;
  errors: string[];
  warnings: string[];
  safetyBackupFileName?: string;
}
