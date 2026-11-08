import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReceiptText,
  PlusCircle,
  ArrowRightLeft,
  Search,
  Filter,
  Calendar,
  Trash2,
  Edit2,
  Copy,
  TrendingDown,
  TrendingUp,
  Tag,
  CreditCard,
  User,
  ChevronLeft,
  ChevronRight,
  Terminal,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  FileSpreadsheet,
  Wallet
} from 'lucide-react';
import { EnrichedTransaction, TransactionFilter } from '../../types/finance';
import { TransactionType, DbCategory, DbAccount, DbMember } from '../../types/database';
import { fetchTransactions, deleteTransaction } from '../../services/supabase/transactions';
import { fetchCategories } from '../../services/supabase/categories';
import { fetchAccounts } from '../../services/supabase/accounts';
import { fetchMembers } from '../../services/supabase/members';
import { TransactionFormModal } from './TransactionFormModal';
import { TransactionTestSuiteModal } from './TransactionTestSuiteModal';
import { formatCurrency } from '../../utils/currency';
import { getCurrentMonthRange } from '../../utils/date';
import { useAuth } from '../../hooks/useAuth';

interface TransactionListViewProps {
  onNavigateToTab?: (tab: string) => void;
  openAddModalOnMount?: boolean;
}

export const TransactionListView: React.FC<TransactionListViewProps> = ({
  onNavigateToTab,
  openAddModalOnMount = false,
}) => {
  const { user } = useAuth();

  // 資料狀態
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 元資料
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [members, setMembers] = useState<DbMember[]>([]);

  // 篩選器狀態
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryIdFilter, setCategoryIdFilter] = useState('');
  const [accountIdFilter, setAccountIdFilter] = useState('');
  const [memberIdFilter, setMemberIdFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string; end: string; quick: string }>({
    start: '',
    end: '',
    quick: 'all',
  });
  const [sortBy, setSortBy] = useState<'transaction_date' | 'amount'>('transaction_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // 互動彈窗狀態
  const [isFormModalOpen, setIsFormModalOpen] = useState(openAddModalOnMount);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'clone'>('create');
  const [selectedTx, setSelectedTx] = useState<EnrichedTransaction | null>(null);

  // 刪除確認彈窗
  const [deleteTarget, setDeleteTarget] = useState<EnrichedTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 自動化驗收測試彈窗
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // 載入元資料
  useEffect(() => {
    fetchCategories(user?.id || 'mock-user').then(r => setCategories(r.data));
    fetchAccounts(user?.id || 'mock-user').then(r => setAccounts(r.data));
    fetchMembers(user?.id || 'mock-user').then(r => setMembers(r.data));
  }, [user?.id]);

  // 載入交易資料
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchTransactions(user?.id, {
        startDate: dateRangeFilter.start || undefined,
        endDate: dateRangeFilter.end || undefined,
        type: typeFilter,
        categoryId: categoryIdFilter || undefined,
        accountId: accountIdFilter || undefined,
        memberId: memberIdFilter || undefined,
        searchQuery: searchQuery || undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize,
      });
      setTransactions(res.data);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.error('Load transactions failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, dateRangeFilter, typeFilter, categoryIdFilter, accountIdFilter, memberIdFilter, searchQuery, sortBy, sortOrder, currentPage, pageSize]);

  useEffect(() => {
    loadTransactions();

    const handleDataUpdate = () => {
      loadTransactions();
      fetchCategories(user?.id || 'mock-user').then(r => setCategories(r.data));
      fetchAccounts(user?.id || 'mock-user').then(r => setAccounts(r.data));
      fetchMembers(user?.id || 'mock-user').then(r => setMembers(r.data));
    };

    window.addEventListener('finance_data_updated', handleDataUpdate);
    return () => {
      window.removeEventListener('finance_data_updated', handleDataUpdate);
    };
  }, [loadTransactions, user?.id]);

  // 當篩選器變更時重設分頁至第 1 頁
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // 快捷日期設定
  const handleQuickDate = (type: 'all' | 'this_month' | 'last_month' | 'this_year') => {
    const now = new Date();
    const year = now.getFullYear();

    if (type === 'all') {
      setDateRangeFilter({ start: '', end: '', quick: 'all' });
    } else if (type === 'this_month') {
      const m = getCurrentMonthRange();
      setDateRangeFilter({ start: m.startDate, end: m.endDate, quick: 'this_month' });
    } else if (type === 'last_month') {
      const lastMonthDate = new Date(year, now.getMonth() - 1, 1);
      const ly = lastMonthDate.getFullYear();
      const lm = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(ly, lastMonthDate.getMonth() + 1, 0).getDate();
      setDateRangeFilter({
        start: `${ly}-${lm}-01`,
        end: `${ly}-${lm}-${String(lastDay).padStart(2, '0')}`,
        quick: 'last_month',
      });
    } else if (type === 'this_year') {
      setDateRangeFilter({
        start: `${year}-01-01`,
        end: `${year}-12-31`,
        quick: 'this_year',
      });
    }
    setCurrentPage(1);
  };

  // 統計數值計算（轉帳嚴格獨立，不計入收入與支出統計）
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalTransfer = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpense += t.amount;
      } else if (t.type === 'transfer') {
        totalTransfer += t.amount;
      }
    });

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
      transfer: totalTransfer / 2, // 轉帳成對，除以2代表移轉總額
    };
  }, [transactions]);

  // 開啟新增記帳
  const handleOpenCreate = () => {
    setSelectedTx(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  // 開啟編輯
  const handleOpenEdit = (tx: EnrichedTransaction) => {
    setSelectedTx(tx);
    setFormMode('edit');
    setIsFormModalOpen(true);
  };

  // 複製交易
  const handleOpenClone = (tx: EnrichedTransaction) => {
    setSelectedTx(tx);
    setFormMode('clone');
    setIsFormModalOpen(true);
  };

  // 執行刪除
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(deleteTarget.id, user?.id, deleteTarget.transfer_group_id);
      setDeleteTarget(null);
      await loadTransactions();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
            <ReceiptText className="w-3.5 h-3.5" />
            <span>Phase 3：手動記帳及交易管理</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            交易明細與手動記帳
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            支援收入、支出與帳戶轉帳（雙向關聯）、多維度篩選排序、單筆編輯複製與連鎖整組刪除。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-600" />
            <span>執行 Phase 3 測試</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>手動新增記帳</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip (轉帳獨立標示，不計入收入與支出) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span>本期總收入</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono mt-1">
            +{formatCurrency(stats.income)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">工資、獎金等入帳</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span>本期總支出</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-600 font-mono mt-1">
            -{formatCurrency(stats.expense)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">日常飲食、固定開銷</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
            <span>收支結餘</span>
            <Wallet className="w-4 h-4 text-slate-600" />
          </div>
          <div className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${stats.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatCurrency(stats.balance)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">純收入扣除純支出</div>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-blue-800 font-semibold">
            <span>帳戶內部轉帳</span>
            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-700 font-mono mt-1">
            {formatCurrency(stats.transfer)}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">獨立移轉，不計入收支統計</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Type Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: '全部類型' },
              { id: 'expense', label: '支出' },
              { id: 'income', label: '收入' },
              { id: 'transfer', label: '帳戶轉帳' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setTypeFilter(t.id as any);
                  handleFilterChange();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  typeFilter === t.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="搜尋備註、分類、帳戶或成員..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleFilterChange();
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            />
          </div>
        </div>

        {/* Dropdowns Row: Category, Account, Member, Date Range */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">分類篩選</label>
            <select
              value={categoryIdFilter}
              onChange={(e) => {
                setCategoryIdFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
            >
              <option value="">全部分類</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">帳戶篩選</label>
            <select
              value={accountIdFilter}
              onChange={(e) => {
                setAccountIdFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
            >
              <option value="">全部帳戶</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">成員篩選</label>
            <select
              value={memberIdFilter}
              onChange={(e) => {
                setMemberIdFilter(e.target.value);
                handleFilterChange();
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
            >
              <option value="">全部成員</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">排序依據</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb as any);
                setSortOrder(so as any);
                handleFilterChange();
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
            >
              <option value="transaction_date-desc">日期：最新在前</option>
              <option value="transaction_date-asc">日期：最舊在前</option>
              <option value="amount-desc">金額：由大到小</option>
              <option value="amount-asc">金額：由小到大</option>
            </select>
          </div>
        </div>

        {/* Quick Date Range Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-500">
          <span className="text-[11px]">時間範圍:</span>
          {[
            { id: 'all', label: '全部時間' },
            { id: 'this_month', label: '本月' },
            { id: 'last_month', label: '上月' },
            { id: 'this_year', label: '今年' },
          ].map(q => (
            <button
              key={q.id}
              onClick={() => handleQuickDate(q.id as any)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                dateRangeFilter.quick === q.id
                  ? 'bg-slate-900 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {q.label}
            </button>
          ))}
          {dateRangeFilter.start && (
            <span className="text-[10px] text-slate-400 font-mono ml-1">
              ({dateRangeFilter.start} ~ {dateRangeFilter.end})
            </span>
          )}
        </div>
      </div>

      {/* Transactions List View: Desktop Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table View (md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-28">日期</th>
                <th className="py-3 px-4 w-20">類型</th>
                <th className="py-3 px-4 w-28">分類</th>
                <th className="py-3 px-4 w-32 text-right">金額</th>
                <th className="py-3 px-4 w-32">帳戶</th>
                <th className="py-3 px-4 w-20">成員</th>
                <th className="py-3 px-4">備註說明</th>
                <th className="py-3 px-4 w-28 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    載入中...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                    <ReceiptText className="w-8 h-8 text-slate-300 mx-auto" />
                    <div>查無符合條件之交易紀錄</div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      tx.type === 'transfer' ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-slate-800">{tx.transaction_date}</td>
                    <td className="py-3 px-4">
                      {tx.type === 'expense' && (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>支出</span>
                        </span>
                      )}
                      {tx.type === 'income' && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>收入</span>
                        </span>
                      )}
                      {tx.type === 'transfer' && (
                        <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>轉帳</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {tx.type === 'transfer' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium text-[11px]">
                          內部轉移
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium text-[11px]">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{tx.category?.name || '其它'}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      <span className={
                        tx.type === 'expense' ? 'text-rose-600' :
                        tx.type === 'income' ? 'text-emerald-600' :
                        'text-blue-700'
                      }>
                        {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                        {formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {tx.account?.name || '指定帳戶'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {tx.member?.name || '自己'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {tx.note || <span className="text-slate-300 italic">(無備註)</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenClone(tx)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="複製交易"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(tx)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="編輯"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(tx)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="刪除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View (under md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs">載入中...</div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs space-y-1">
              <ReceiptText className="w-6 h-6 text-slate-300 mx-auto" />
              <div>查無符合條件之紀錄</div>
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className={`p-3.5 space-y-2 ${
                  tx.type === 'transfer' ? 'bg-blue-50/20' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-slate-700">{tx.transaction_date}</span>
                    {tx.type === 'transfer' ? (
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                        轉帳
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                        {tx.category?.name || '其它'}
                      </span>
                    )}
                  </div>
                  <div className="font-mono font-bold text-sm">
                    <span className={
                      tx.type === 'expense' ? 'text-rose-600' :
                      tx.type === 'income' ? 'text-emerald-600' :
                      'text-blue-700'
                    }>
                      {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div>
                    <span>{tx.account?.name}</span> · <span>{tx.member?.name || '自己'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenClone(tx)}
                      className="text-slate-500 hover:text-slate-800 p-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(tx)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(tx)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {tx.note && (
                  <div className="text-xs text-slate-700 bg-slate-50 p-1.5 rounded">
                    {tx.note}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            第 <span className="font-semibold">{currentPage}</span> / {totalPages} 頁，共{' '}
            <span className="font-semibold">{totalCount}</span> 筆
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Entry Form Modal */}
      <TransactionFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={() => loadTransactions()}
        initialData={selectedTx}
        mode={formMode}
        categories={categories}
        accounts={accounts}
        members={members}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-xl flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {deleteTarget.transfer_group_id ? '確認刪除轉帳紀錄？' : '確認刪除此筆交易？'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {deleteTarget.transfer_group_id
                    ? '此筆紀錄為帳戶間轉帳，確認刪除將一併移除配對之轉出與轉入兩筆紀錄，以維持帳戶資產一致性。'
                    : `您即將刪除 ${deleteTarget.transaction_date} 的 ${deleteTarget.category?.name || '交易'} (${formatCurrency(deleteTarget.amount, deleteTarget.currency)})。此動作無法復原。`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {isDeleting ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automated Phase 3 Test Suite Modal */}
      <TransactionTestSuiteModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onRefreshData={() => loadTransactions()}
      />
    </div>
  );
};
