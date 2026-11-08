import React from 'react';
import {
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Tag,
  ReceiptText
} from 'lucide-react';
import { EnrichedTransaction } from '../../types/finance';
import { formatCurrency } from '../../utils/currency';

interface RecentTransactionsCardProps {
  transactions: EnrichedTransaction[];
  onViewAll: () => void;
  onSelectTransaction?: (tx: EnrichedTransaction) => void;
}

export const RecentTransactionsCard: React.FC<RecentTransactionsCardProps> = ({
  transactions,
  onViewAll,
  onSelectTransaction,
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            近期交易紀錄
          </h3>
          <span className="text-xs text-slate-400">（最新 10 筆）</span>
        </div>

        <button
          onClick={onViewAll}
          className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer group"
        >
          <span>查看完整明細</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* List */}
      {transactions.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-xs space-y-2">
          <ReceiptText className="w-8 h-8 text-slate-300 mx-auto" />
          <div>目前尚無任何交易紀錄</div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              onClick={() => onSelectTransaction?.(tx)}
              className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-lg transition-colors cursor-pointer group"
            >
              {/* Left Info: Icon, Date, Category, Note */}
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`p-2 rounded-lg flex-shrink-0 ${
                  tx.type === 'expense' ? 'bg-rose-50 text-rose-600' :
                  tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  {tx.type === 'expense' && <TrendingDown className="w-3.5 h-3.5" />}
                  {tx.type === 'income' && <TrendingUp className="w-3.5 h-3.5" />}
                  {tx.type === 'transfer' && <ArrowRightLeft className="w-3.5 h-3.5" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {tx.type === 'transfer' ? '帳戶轉帳' : tx.category?.name || '其它'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {tx.transaction_date}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 hidden sm:inline">
                      {tx.account?.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {tx.note || <span className="italic text-slate-300">(無備註)</span>}
                  </div>
                </div>
              </div>

              {/* Right: Amount */}
              <div className="text-right flex-shrink-0 ml-3">
                <div className={`font-mono font-bold text-xs sm:text-sm ${
                  tx.type === 'expense' ? 'text-rose-600' :
                  tx.type === 'income' ? 'text-emerald-600' :
                  'text-blue-700'
                }`}>
                  {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                  {formatCurrency(tx.amount, tx.currency)}
                </div>
                {tx.currency !== 'TWD' && (
                  <div className="text-[10px] font-mono text-slate-400">
                    ≈ NT$ {tx.base_amount}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
