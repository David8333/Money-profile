import React, { useState, useEffect, useCallback } from 'react';
import {
  Tags,
  CreditCard,
  Users,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Wallet,
  Building,
  Coins,
  TrendingUp,
  TrendingDown,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DbCategory, DbAccount, DbMember } from '../../types/database';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../services/supabase/categories';
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../../services/supabase/accounts';
import {
  fetchMembers,
  createMember,
  updateMember,
  deleteMember,
} from '../../services/supabase/members';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured } from '../../services/supabase/client';

export type ManagementTab = 'categories' | 'accounts' | 'members';

interface CategoryAccountMemberViewProps {
  initialTab?: ManagementTab;
  onNavigateToTab?: (tab: string) => void;
}

const PRESET_COLORS = [
  '#f97316', '#ef4444', '#ec4899', '#8b5cf6',
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#84cc16', '#eab308', '#64748b', '#78716c'
];

export const CategoryAccountMemberView: React.FC<CategoryAccountMemberViewProps> = ({
  initialTab = 'categories',
}) => {
  const { user } = useAuth();
  const userId = user?.id || 'mock-user';
  const isCloud = isSupabaseConfigured();

  const [activeTab, setActiveTab] = useState<ManagementTab>(initialTab);

  // 資料列表狀態
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [accounts, setAccounts] = useState<DbAccount[]>([]);
  const [members, setMembers] = useState<DbMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 類別過濾（支出 / 收入）
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<'all' | 'expense' | 'income'>('all');

  // Modal 狀態
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DbCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'expense' | 'income'>('expense');
  const [catColor, setCatColor] = useState('#f97316');
  const [catSortOrder, setCatSortOrder] = useState('10');

  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<DbAccount | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<'bank' | 'cash' | 'credit_card' | 'investment' | 'other'>('bank');
  const [accCurrency, setAccCurrency] = useState('TWD');
  const [accOpeningBalance, setAccOpeningBalance] = useState('0');

  const [isMemModalOpen, setIsMemModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<DbMember | null>(null);
  const [memName, setMemName] = useState('');

  // 刪除確認
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'category' | 'account' | 'member';
    id: string;
    name: string;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cRes, aRes, mRes] = await Promise.all([
        fetchCategories(userId),
        fetchAccounts(userId),
        fetchMembers(userId),
      ]);
      setCategories(cRes.data);
      setAccounts(aRes.data);
      setMembers(mRes.data);
    } catch (err) {
      console.error(err);
      showToast('載入資料發生錯誤', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 分類操作
  const handleOpenCatModal = (cat?: DbCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatType(cat.type as 'expense' | 'income');
      setCatColor(cat.color || '#f97316');
      setCatSortOrder(String(cat.sort_order));
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatType('expense');
      setCatColor('#f97316');
      setCatSortOrder(String((categories.length + 1) * 10));
    }
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategory) {
      const { error } = await updateCategory(editingCategory.id, {
        name: catName.trim(),
        type: catType,
        color: catColor,
        sort_order: parseInt(catSortOrder, 10) || 0,
      }, userId);
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast(`分類「${catName}」已更新！`);
        setIsCatModalOpen(false);
        loadAllData();
      }
    } else {
      const { error } = await createCategory({
        user_id: userId,
        name: catName.trim(),
        type: catType,
        color: catColor,
        sort_order: parseInt(catSortOrder, 10) || 0,
        is_active: true,
      });
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast(`分類「${catName}」已新增！`);
        setIsCatModalOpen(false);
        loadAllData();
      }
    }
  };

  const handleToggleCatActive = async (cat: DbCategory) => {
    await updateCategory(cat.id, { is_active: !cat.is_active }, userId);
    loadAllData();
  };

  // 帳戶操作
  const handleOpenAccModal = (acc?: DbAccount) => {
    if (acc) {
      setEditingAccount(acc);
      setAccName(acc.name);
      setAccType(acc.account_type as any);
      setAccCurrency(acc.currency);
      setAccOpeningBalance(String(acc.opening_balance));
    } else {
      setEditingAccount(null);
      setAccName('');
      setAccType('bank');
      setAccCurrency('TWD');
      setAccOpeningBalance('0');
    }
    setIsAccModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    if (editingAccount) {
      const { error } = await updateAccount(editingAccount.id, {
        name: accName.trim(),
        account_type: accType,
        currency: accCurrency,
        opening_balance: parseFloat(accOpeningBalance) || 0,
      }, userId);
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast(`帳戶「${accName}」已更新！`);
        setIsAccModalOpen(false);
        loadAllData();
      }
    } else {
      const { error } = await createAccount({
        user_id: userId,
        name: accName.trim(),
        account_type: accType,
        currency: accCurrency,
        opening_balance: parseFloat(accOpeningBalance) || 0,
        is_active: true,
      });
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast(`帳戶「${accName}」已新增！`);
        setIsAccModalOpen(false);
        loadAllData();
      }
    }
  };

  const handleToggleAccActive = async (acc: DbAccount) => {
    await updateAccount(acc.id, { is_active: !acc.is_active }, userId);
    loadAllData();
  };

  // 成員操作
  const handleOpenMemModal = (mem?: DbMember) => {
    if (mem) {
      setEditingMember(mem);
      setMemName(mem.name);
    } else {
      setEditingMember(null);
      setMemName('');
    }
    setIsMemModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memName.trim()) return;

    if (editingMember) {
      const { error } = await updateMember(editingMember.id, {
        name: memName.trim(),
      }, userId);
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast(`成員「${memName}」已更新！`);
        setIsMemModalOpen(false);
        loadAllData();
      }
    } else {
      const { error } = await createMember({
        user_id: userId,
        name: memName.trim(),
        is_active: true,
      });
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast(`成員「${memName}」已新增！`);
        setIsMemModalOpen(false);
        loadAllData();
      }
    }
  };

  const handleToggleMemActive = async (mem: DbMember) => {
    await updateMember(mem.id, { is_active: !mem.is_active }, userId);
    loadAllData();
  };

  // 確認刪除執行
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    const { type, id, name } = deleteConfirmation;

    if (type === 'category') {
      const { error } = await deleteCategory(id, userId);
      if (error) showToast(error.message, 'error');
      else showToast(`已刪除分類「${name}」`);
    } else if (type === 'account') {
      const { error } = await deleteAccount(id, userId);
      if (error) showToast(error.message, 'error');
      else showToast(`已刪除帳戶「${name}」`);
    } else if (type === 'member') {
      const { error } = await deleteMember(id, userId);
      if (error) showToast(error.message, 'error');
      else showToast(`已刪除成員「${name}」`);
    }

    setDeleteConfirmation(null);
    loadAllData();
  };

  const filteredCategories = categories.filter(c => {
    if (categoryTypeFilter === 'all') return true;
    return c.type === categoryTypeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {feedbackMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm shadow-lg border transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span className="font-medium">{feedbackMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2">
            <Tags className="w-3.5 h-3.5" />
            <span>基本設定與維護</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            帳戶、分類與成員管理
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            自由自訂收支分類、日常金融帳戶與記帳成員，修改即時同步至記帳下拉選單與統計圖表。
          </p>
        </div>

        {/* 模式標籤 */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
              isCloud
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isCloud ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>{isCloud ? '雲端資料庫已連線' : '本機儲存體驗模式'}</span>
          </span>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 -mb-px'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Tags className="w-4 h-4" />
          <span>收支分類</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'accounts'
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 -mb-px'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>帳戶資產</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
            {accounts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'members'
              ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 -mb-px'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>成員管理</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
            {members.length}
          </span>
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 1. 分類管理清單 */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium">
              <button
                onClick={() => setCategoryTypeFilter('all')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  categoryTypeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全部類別 ({categories.length})
              </button>
              <button
                onClick={() => setCategoryTypeFilter('expense')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  categoryTypeFilter === 'expense' ? 'bg-white text-rose-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="w-3 h-3 text-rose-500" />
                <span>支出 ({categories.filter(c => c.type === 'expense').length})</span>
              </button>
              <button
                onClick={() => setCategoryTypeFilter('income')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  categoryTypeFilter === 'income' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span>收入 ({categories.filter(c => c.type === 'income').length})</span>
              </button>
            </div>

            <button
              onClick={() => handleOpenCatModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增收支分類</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredCategories.map(cat => (
              <div
                key={cat.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-xs"
                    style={{ backgroundColor: cat.color || '#64748b' }}
                  >
                    <Tags className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {cat.name}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          cat.type === 'income'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {cat.type === 'income' ? '收入' : '支出'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5">
                      <span>排序: {cat.sort_order}</span>
                      <span>•</span>
                      <button
                        onClick={() => handleToggleCatActive(cat)}
                        className={`text-[11px] underline cursor-pointer ${
                          cat.is_active ? 'text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        {cat.is_active ? '啟用中' : '已停用'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenCatModal(cat)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    title="編輯分類"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmation({ type: 'category', id: cat.id, name: cat.name })}
                    className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title="刪除分類"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. 帳戶資產清單 */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              包含日常銀行、現金零用金、信用卡扣款戶與投資部位帳戶。
            </p>
            <button
              onClick={() => handleOpenAccModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增金融帳戶</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {accounts.map(acc => (
              <div
                key={acc.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                      {acc.account_type === 'credit_card' ? (
                        <CreditCard className="w-5 h-5 text-indigo-600" />
                      ) : acc.account_type === 'cash' ? (
                        <Wallet className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Building className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{acc.name}</h4>
                      <span className="text-[11px] text-slate-600 uppercase tracking-wider">
                        {acc.account_type === 'bank' && '銀行帳戶'}
                        {acc.account_type === 'cash' && '現金零用'}
                        {acc.account_type === 'credit_card' && '信用卡'}
                        {acc.account_type === 'investment' && '證券投資'}
                        {acc.account_type === 'other' && '其他帳戶'}
                        {' • '}
                        {acc.currency}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenAccModal(acc)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      title="編輯帳戶"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmation({ type: 'account', id: acc.id, name: acc.name })}
                      className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="刪除帳戶"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">期初餘額:</span>
                  <span className="font-semibold text-slate-900 font-mono">
                    {acc.currency} {Number(acc.opening_balance || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 3. 成員管理清單 */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              記錄每一筆支出的記帳成員（例如自己、家人、伴侶），以支援成員收支貢獻分析。
            </p>
            <button
              onClick={() => handleOpenMemModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增記帳成員</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {members.map(mem => (
              <div
                key={mem.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {mem.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{mem.name}</h4>
                    <span className="text-xs text-slate-600">
                      {mem.is_active ? '啟用中' : '已停用'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenMemModal(mem)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                    title="編輯成員"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmation({ type: 'member', id: mem.id, name: mem.name })}
                    className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title="刪除成員"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 分類 Modal */}
      {/* --------------------------------------------------------------------- */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingCategory ? '編輯收支分類' : '新增收支分類'}
              </h3>
              <button
                onClick={() => setIsCatModalOpen(false)}
                className="text-slate-600 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  收支屬性
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatType('expense')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      catType === 'expense'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                    <span>支出分類</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatType('income')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      catType === 'income'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>收入分類</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  分類名稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：飲食、生活用品、工資獎金"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  代表標籤色彩
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setCatColor(c)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                        catColor === c ? 'scale-110 ring-2 ring-offset-2 ring-slate-800' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {catColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  排序權重 (越小越靠前)
                </label>
                <input
                  type="number"
                  value={catSortOrder}
                  onChange={(e) => setCatSortOrder(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingCategory ? '儲存變更' : '立即新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 帳戶 Modal */}
      {/* --------------------------------------------------------------------- */}
      {isAccModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingAccount ? '編輯金融帳戶' : '新增金融帳戶'}
              </h3>
              <button
                onClick={() => setIsAccModalOpen(false)}
                className="text-slate-600 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  帳戶名稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：華南銀行、玉山信用卡、隨身錢包"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    帳戶類型
                  </label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="bank">銀行帳戶</option>
                    <option value="cash">現金錢包</option>
                    <option value="credit_card">信用卡</option>
                    <option value="investment">證券投資</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    帳戶幣別
                  </label>
                  <select
                    value={accCurrency}
                    onChange={(e) => setAccCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="TWD">TWD 新台幣</option>
                    <option value="USD">USD 美元</option>
                    <option value="JPY">JPY 日圓</option>
                    <option value="EUR">EUR 歐元</option>
                    <option value="CNY">CNY 人民幣</option>
                    <option value="HKD">HKD 港幣</option>
                    <option value="KRW">KRW 韓元</option>
                    <option value="GBP">GBP 英鎊</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  期初餘額
                </label>
                <input
                  type="number"
                  step="any"
                  value={accOpeningBalance}
                  onChange={(e) => setAccOpeningBalance(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-600 mt-1 block">
                  系統將以此金額為基底，加計歷史收支以計算各帳戶實時餘額。
                </span>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAccModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingAccount ? '儲存變更' : '立即新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 成員 Modal */}
      {/* --------------------------------------------------------------------- */}
      {isMemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingMember ? '編輯記帳成員' : '新增記帳成員'}
              </h3>
              <button
                onClick={() => setIsMemModalOpen(false)}
                className="text-slate-600 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  成員名稱 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：自己、家人、伴侶、小孩"
                  value={memName}
                  onChange={(e) => setMemName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMemModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {editingMember ? '儲存變更' : '立即新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 刪除確認 Modal */}
      {/* --------------------------------------------------------------------- */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">確認刪除？</h4>
              <p className="text-xs text-slate-600 mt-1">
                即將刪除「{deleteConfirmation.name}」。刪除後不可復原。
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
