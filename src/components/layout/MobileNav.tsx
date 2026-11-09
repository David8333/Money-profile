import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  PlusCircle,
  FileSpreadsheet,
  Settings,
  Building2
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab }) => {
  const mobileItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '總覽', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'cfo', label: '經營中心', icon: <Building2 className="w-5 h-5" /> },
    { id: 'transactions', label: '明細', icon: <ReceiptText className="w-5 h-5" /> },
    { id: 'add', label: '記帳', icon: <PlusCircle className="w-6 h-6 text-emerald-500" /> },
    { id: 'import', label: 'CSV', icon: <FileSpreadsheet className="w-5 h-5" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1.5 z-40 flex items-center justify-around shadow-lg">
      {mobileItems.map((item) => {
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              isActive ? 'text-emerald-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {item.icon}
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
