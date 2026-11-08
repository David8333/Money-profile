import React, { useState, useMemo } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Copy,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Tag
} from 'lucide-react';
import { ValidatedCsvRow } from '../../services/csv/csvValidator';
import { formatCurrency } from '../../utils/currency';

interface CsvPreviewTableProps {
  rows: ValidatedCsvRow[];
  activeTab: 'all' | 'valid' | 'duplicate' | 'error';
  onSelectTab: (tab: 'all' | 'valid' | 'duplicate' | 'error') => void;
}

export const CsvPreviewTable: React.FC<CsvPreviewTableProps> = ({
  rows,
  activeTab,
  onSelectTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // 依 Tab 與搜尋字串篩選
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Tab 篩選
      if (activeTab === 'valid' && row.status !== 'valid') return false;
      if (activeTab === 'duplicate' && row.status !== 'duplicate') return false;
      if (activeTab === 'error' && row.status !== 'error') return false;

      // 搜尋篩選
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCategory = row.category.toLowerCase().includes(q);
        const matchAccount = row.account.toLowerCase().includes(q);
        const matchMember = row.member.toLowerCase().includes(q);
        const matchNote = row.note.toLowerCase().includes(q);
        const matchDate = row.date.includes(q);
        return matchCategory || matchAccount || matchMember || matchNote || matchDate;
      }
      return true;
    });
  }, [rows, activeTab, searchQuery]);

  // 分頁計算
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    return filteredRows.slice(from, from + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const handleTabChange = (tab: 'all' | 'valid' | 'duplicate' | 'error') => {
    onSelectTab(tab);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handleTabChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            全部明細 ({rows.length})
          </button>
          <button
            onClick={() => handleTabChange('valid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'valid'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>可匯入 ({rows.filter(r => r.status === 'valid').length})</span>
          </button>
          <button
            onClick={() => handleTabChange('duplicate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'duplicate'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>重複 ({rows.filter(r => r.status === 'duplicate').length})</span>
          </button>
          <button
            onClick={() => handleTabChange('error')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>錯誤 ({rows.filter(r => r.status === 'error').length})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="搜尋類別、帳戶、備註..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
          />
        </div>
      </div>

      {/* Desktop Table View (md and up) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 w-12 text-center">序號</th>
              <th className="py-3 px-4 w-24">狀態</th>
              <th className="py-3 px-4 w-28">日期</th>
              <th className="py-3 px-4 w-20">收支</th>
              <th className="py-3 px-4 w-28">分類</th>
              <th className="py-3 px-4 w-32 text-right">金額</th>
              <th className="py-3 px-4 w-28">帳戶</th>
              <th className="py-3 px-4 w-24">成員</th>
              <th className="py-3 px-4">備註</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400">
                  查無符合條件之資料
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr
                  key={row.rowIndex}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    row.status === 'duplicate'
                      ? 'bg-amber-50/20'
                      : row.status === 'error'
                      ? 'bg-rose-50/30'
                      : ''
                  }`}
                >
                  <td className="py-3 px-4 text-center font-mono text-slate-400">
                    {row.rowIndex}
                  </td>
                  <td className="py-3 px-4">
                    {row.status === 'valid' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3" />
                        <span>可匯入</span>
                      </span>
                    )}
                    {row.status === 'duplicate' && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800"
                        title={row.statusReason}
                      >
                        <Copy className="w-3 h-3" />
                        <span>重複略過</span>
                      </span>
                    )}
                    {row.status === 'error' && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800"
                        title={row.statusReason}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>錯誤</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-800">{row.date}</td>
                  <td className="py-3 px-4">
                    {row.type === 'expense' ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>支出</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>收入</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span>{row.category}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    <span className={row.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}>
                      {row.type === 'expense' ? '-' : '+'}
                      {formatCurrency(row.amount, row.currency)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{row.account}</td>
                  <td className="py-3 px-4 text-slate-600">{row.member}</td>
                  <td className="py-3 px-4">
                    {row.note ? (
                      <span className="text-slate-700">{row.note}</span>
                    ) : (
                      <span className="text-slate-300 italic">(無備註)</span>
                    )}
                    {row.statusReason && row.status !== 'valid' && (
                      <div className="text-[10px] text-amber-700 mt-0.5">{row.statusReason}</div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (under md) */}
      <div className="md:hidden divide-y divide-slate-100">
        {paginatedRows.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">查無符合條件之資料</div>
        ) : (
          paginatedRows.map((row) => (
            <div
              key={row.rowIndex}
              className={`p-3.5 space-y-2 ${
                row.status === 'duplicate'
                  ? 'bg-amber-50/20'
                  : row.status === 'error'
                  ? 'bg-rose-50/30'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono text-slate-400">#{row.rowIndex}</span>
                  <span className="text-xs font-mono text-slate-700">{row.date}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                    {row.category}
                  </span>
                </div>
                <div className="font-mono font-bold text-sm">
                  <span className={row.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}>
                    {row.type === 'expense' ? '-' : '+'}
                    {formatCurrency(row.amount, row.currency)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <div>
                  <span>{row.account}</span> · <span>{row.member}</span>
                </div>
                <div>
                  {row.status === 'valid' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      可匯入
                    </span>
                  )}
                  {row.status === 'duplicate' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                      重複略過
                    </span>
                  )}
                  {row.status === 'error' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-medium">
                      格式錯誤
                    </span>
                  )}
                </div>
              </div>

              {row.note && <div className="text-xs text-slate-700 bg-slate-50 p-1.5 rounded">{row.note}</div>}
              {row.statusReason && row.status !== 'valid' && (
                <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded">
                  {row.statusReason}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div>
          第 <span className="font-semibold">{currentPage}</span> / {totalPages} 頁，共{' '}
          <span className="font-semibold">{filteredRows.length}</span> 筆
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
  );
};
