import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  PlusCircle,
  FileSpreadsheet,
  PieChart,
  Tags,
  CreditCard,
  Settings,
  ChevronRight,
  Database,
  Sparkles
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'transactions'
  | 'add'
  | 'import'
  | 'analytics'
  | 'categories'
  | 'accounts'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSetupGuide: () => void;
  isConfigured: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSetupGuide,
  isConfigured,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: '財務總覽', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'transactions', label: '交易明細', icon: <ReceiptText className="w-4 h-4" /> },
    { id: 'add', label: '新增記帳', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'import', label: 'CSV 匯入', icon: <FileSpreadsheet className="w-4 h-4" />, badge: '智慧解析' },
    { id: 'analytics', label: '統計分析', icon: <PieChart className="w-4 h-4" /> },
    { id: 'categories', label: '分類管理', icon: <Tags className="w-4 h-4" /> },
    { id: 'accounts', label: '帳戶管理', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'settings', label: '系統設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800 hidden md:flex">
      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          主要功能選單
        </div>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Database Quick Card at bottom */}
      <div className="p-3 m-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs">
        <div className="flex items-center space-x-2 text-slate-200 font-semibold mb-1">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>資料儲存狀態</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-2.5">
          {isConfigured
            ? 'Supabase 雲端資料庫已連線，支援跨裝置即時同步與 RLS 防護。'
            : '目前為本機離線模式，資料即時保存在瀏覽器。可隨時綁定雲端資料庫。'}
        </p>
        <button
          onClick={onOpenSetupGuide}
          className="w-full py-1.5 px-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>資料庫架構指南</span>
        </button>
      </div>
    </aside>
  );
};
