/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { CsvImportView } from './components/csv/CsvImportView';
import { TransactionListView } from './components/transactions/TransactionListView';
import { DashboardView } from './components/dashboard/DashboardView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { BackupRestoreView } from './components/backup/BackupRestoreView';
import { NavTab } from './components/layout/Sidebar';
import { Phase1Dashboard } from './components/phases/Phase1Dashboard';
import { useSupabaseConfig } from './hooks/useSupabaseConfig';
import { useAuth } from './hooks/useAuth';
import { CategoryAccountMemberView } from './components/management/CategoryAccountMemberView';
import {
  FileSpreadsheet,
  ReceiptText,
  PlusCircle,
  PieChart,
  Tags,
  CreditCard,
  Settings
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const { isConfigured, setShowConfigModal } = useSupabaseConfig();
  const { user } = useAuth();

  return (
    <Layout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      isConfigured={isConfigured}
      userEmail={user?.email}
    >
      {currentTab === 'overview' && (
        <DashboardView
          onNavigateToTab={(tab) => setCurrentTab(tab as NavTab)}
        />
      )}

      {currentTab === 'import' && (
        <CsvImportView
          onNavigateToTab={(tab) => setCurrentTab(tab as NavTab)}
        />
      )}


      {currentTab === 'transactions' && (
        <TransactionListView
          onNavigateToTab={(tab) => setCurrentTab(tab as NavTab)}
          openAddModalOnMount={false}
        />
      )}

      {currentTab === 'add' && (
        <TransactionListView
          onNavigateToTab={(tab) => setCurrentTab(tab as NavTab)}
          openAddModalOnMount={true}
        />
      )}

      {currentTab === 'analytics' && (
        <AnalyticsView
          onNavigateToTab={(tab) => setCurrentTab(tab as NavTab)}
        />
      )}

      {currentTab === 'settings' && (
        <BackupRestoreView
          onNavigateToTab={(tab) => setCurrentTab(tab as NavTab)}
        />
      )}

      {(currentTab === 'categories' || currentTab === 'accounts') && (
        <CategoryAccountMemberView
          initialTab={currentTab as 'categories' | 'accounts'}
          onNavigateToTab={(tab) => setCurrentTab(tab as NavTab)}
        />
      )}
    </Layout>
  );
}
