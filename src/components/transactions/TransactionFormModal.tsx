import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Calendar,
  Wallet,
  Tag,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { TransactionType, DbCategory, DbAccount, DbMember } from '../../types/database';
import { EnrichedTransaction, TransactionFormData } from '../../types/finance';
import { createTransaction, createTransfer, updateTransaction } from '../../services/supabase/transactions';
import { getTodayDateString } from '../../utils/date';
import { getExchangeRateForDate, calculateBaseAmountFromRate } from '../../services/currencies/rateService';
import { useAuth } from '../../hooks/useAuth';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: EnrichedTransaction | null;
  mode: 'create' | 'edit' | 'clone';
  categories: DbCategory[];
  accounts: DbAccount[];
  members: DbMember[];
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  mode,
  categories,
  accounts,
  members,
}) => {
  const { user } = useAuth();
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('TWD');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>(''); // For transfer
  const [memberId, setMemberId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 初始化與預填資料
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);

    if (initialData) {
      setType(initialData.type);
      setDate(mode === 'clone' ? getTodayDateString() : initialData.transaction_date);
      setAmount(String(initialData.amount));
      setCurrency(initialData.currency || 'TWD');
      setCategoryId(initialData.category_id || '');
      setAccountId(initialData.account_id);
      setMemberId(initialData.member_id || '');
      setNote(initialData.note || '');
    } else {
      // 預設值
      setType('expense');
      setDate(getTodayDateString());
      setAmount('');
      setCurrency('TWD');
      setNote('');

      // 預設分類與帳戶
      const defaultExpenseCat = categories.find(c => c.type === 'expense');
      if (defaultExpenseCat) setCategoryId(defaultExpenseCat.id);

      if (accounts.length > 0) setAccountId(accounts[0].id);
      if (accounts.length > 1) setToAccountId(accounts[1].id);

      const defaultMem = members.find(m => m.name === '自己') || members[0];
      if (defaultMem) setMemberId(defaultMem.id);
    }
  }, [isOpen, initialData, mode, categories, accounts, members]);

  if (!isOpen) return null;

  // 依收支類型過濾可用分類
  const filteredCategories = categories.filter(c => c.type === type);

  // 快速選取常用分類 (前 6 個)
  const quickCategories = filteredCategories.slice(0, 6);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. 必填驗證
    if (!date) {
      setErrorMessage('請選擇交易日期');
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('請輸入大於 0 的正確金額');
      return;
    }

    if (type !== 'transfer' && !categoryId) {
      setErrorMessage('請選擇收支分類');
      return;
    }

    if (!accountId) {
      setErrorMessage('請選擇交易帳戶');
      return;
    }

    if (type === 'transfer') {
      if (!toAccountId) {
        setErrorMessage('請選擇轉入帳戶');
        return;
      }
      if (accountId === toAccountId) {
        setErrorMessage('轉出帳戶與轉入帳戶不可相同');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 取得交易日期適用之匯率
      const rate = getExchangeRateForDate(currency, date, 'TWD');
      const baseAmount = calculateBaseAmountFromRate(numAmount, rate);

      // 2. 轉帳建立流程
      if (type === 'transfer') {
        const fromAcc = accounts.find(a => a.id === accountId);
        const toAcc = accounts.find(a => a.id === toAccountId);
        const mem = members.find(m => m.id === memberId);

        const fromCurrency = fromAcc?.currency || currency;
        const toCurrency = toAcc?.currency || 'TWD';

        const rateOut = getExchangeRateForDate(fromCurrency, date, 'TWD');
        const calculatedBase = calculateBaseAmountFromRate(numAmount, rateOut);
        const rateIn = getExchangeRateForDate(toCurrency, date, 'TWD');
        const targetAmount = toCurrency === fromCurrency 
          ? numAmount 
          : (rateIn > 0 ? Math.round((calculatedBase / rateIn) * 100) / 100 : calculatedBase);

        const res = await createTransfer(user?.id, {
          transaction_date: date,
          amount: numAmount,
          currency: fromCurrency,
          to_amount: targetAmount,
          to_currency: toCurrency,
          exchange_rate: rateOut,
          target_exchange_rate: rateIn,
          from_account_id: accountId,
          to_account_id: toAccountId,
          member_id: memberId || null,
          note,
          from_account_name: fromAcc?.name,
          to_account_name: toAcc?.name,
          member_name: mem?.name,
        });

        if (!res.success) {
          throw new Error(res.error || '轉帳失敗');
        }
      } 
      // 3. 編輯流程
      else if (mode === 'edit' && initialData) {
        const selectedCat = categories.find(c => c.id === categoryId);
        const selectedAcc = accounts.find(a => a.id === accountId);
        const selectedMem = members.find(m => m.id === memberId);

        const res = await updateTransaction(
          initialData.id,
          user?.id,
          {
            transaction_date: date,
            type,
            category_id: categoryId || null,
            amount: numAmount,
            currency,
            exchange_rate: initialData.exchange_rate || rate,
            base_amount: initialData.currency === currency && initialData.amount === numAmount
              ? initialData.base_amount
              : baseAmount,
            account_id: accountId,
            member_id: memberId || null,
            note: note || null,
          },
          {
            category: selectedCat,
            account: selectedAcc,
            member: selectedMem,
          }
        );

        if (!res.success) {
          throw new Error(res.error || '更新失敗');
        }
      } 
      // 4. 一般新增 / 複製流程
      else {
        const selectedCat = categories.find(c => c.id === categoryId);
        const selectedAcc = accounts.find(a => a.id === accountId);
        const selectedMem = members.find(m => m.id === memberId);

        const res = await createTransaction(
          {
            user_id: user?.id || 'mock-user',
            transaction_date: date,
            type,
            category_id: categoryId || null,
            amount: numAmount,
            currency,
            exchange_rate: rate,
            base_amount: baseAmount,
            account_id: accountId,
            member_id: memberId || null,
            note: note || null,
            transfer_group_id: null,
          },
          {
            category: selectedCat,
            account: selectedAcc,
            member: selectedMem,
          }
        );

        if (res.error) {
          throw new Error(res.error.message);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || '儲存失敗，請檢查輸入內容');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    if (mode === 'edit') return '編輯交易紀錄';
    if (mode === 'clone') return '複製為新交易';
    return type === 'transfer' ? '新增帳戶轉帳' : '新增收支記帳';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-lg ${
              type === 'expense' ? 'bg-rose-500/20 text-rose-400' :
              type === 'income' ? 'bg-emerald-500/20 text-emerald-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {type === 'expense' && <TrendingDown className="w-5 h-5" />}
              {type === 'income' && <TrendingUp className="w-5 h-5" />}
              {type === 'transfer' && <ArrowRightLeft className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{getTitle()}</h3>
              <p className="text-xs text-slate-400">
                {type === 'transfer' ? '建立雙向關聯轉帳紀錄，不重複計算收支' : '金額將對齊 NUMERIC(15, 4) 精確儲存'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
          {/* Transfer Single Edit Locking Banner */}
          {mode === 'edit' && initialData && (initialData.type === 'transfer' || initialData.transfer_group_id) && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>轉帳交易禁止直接單筆編輯 (Phase 6A 安全保護)</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                轉帳交易具備雙向關聯（轉出扣款與轉入入帳）。若單筆修改將破壞資金與匯率平衡。
                若需更動金額、日期或帳戶，請點擊關閉此視窗，並於交易清單中刪除該整組轉帳後重新建立。
              </p>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. 收支類型切換鈕 (收入 / 支出 / 轉帳) */}
          {mode !== 'edit' && (
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  const cat = categories.find(c => c.type === 'expense');
                  if (cat) setCategoryId(cat.id);
                }}
                className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>支出</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  const cat = categories.find(c => c.type === 'income');
                  if (cat) setCategoryId(cat.id);
                }}
                className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>收入</span>
              </button>
              <button
                type="button"
                onClick={() => setType('transfer')}
                className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  type === 'transfer'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>轉帳</span>
              </button>
            </div>
          )}

          {/* 2. 金額與幣別 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              金額 <span className="text-rose-500">*</span>
            </label>
            <div className="flex rounded-xl border border-slate-300 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 overflow-hidden bg-white shadow-2xs">
              <span className="inline-flex items-center px-3 bg-slate-50 border-r border-slate-200 text-slate-600 font-bold text-xs">
                {currency}
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 text-base sm:text-lg font-bold font-mono focus:outline-none text-slate-900"
                autoFocus
              />
            </div>
          </div>

          {/* 3. 日期與成員 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                交易日期 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                記帳成員
              </label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. 分類選擇 (非轉帳時顯示) */}
          {type !== 'transfer' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                分類 <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                <option value="">請選擇分類...</option>
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* 常用分類快捷按鈕 */}
              {quickCategories.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400">快速選擇:</span>
                  {quickCategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        categoryId === cat.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. 帳戶選擇 */}
          {type !== 'transfer' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                交易帳戶 <span className="text-rose-500">*</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </select>
            </div>
          ) : (
            /* 轉帳模式：轉出與轉入雙帳戶 */
            <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">
                  轉出帳戶 (扣款) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">
                  轉入帳戶 (入帳) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-lg border border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 6. 備註欄位 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              備註說明（選填）
            </label>
            <input
              type="text"
              placeholder="例: 午餐、捷運儲值、薪水發放..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            />
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              取消
            </button>
            {mode === 'edit' && initialData && (initialData.type === 'transfer' || initialData.transfer_group_id) ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-300 text-slate-600 rounded-lg text-xs font-bold shadow-xs cursor-not-allowed"
                disabled
              >
                轉帳已鎖定單筆編輯
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isSubmitting ? '儲存中...' : mode === 'edit' ? '更新交易' : '確認新增'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
