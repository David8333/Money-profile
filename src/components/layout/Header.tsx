import React from 'react';
import { Database, Shield, User, Wallet, Bell, RefreshCw } from 'lucide-react';

interface HeaderProps {
  isConfigured: boolean;
  onOpenSetupGuide: () => void;
  userEmail?: string | null;
}

export const Header: React.FC<HeaderProps> = ({ isConfigured, onOpenSetupGuide, userEmail }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Personal Finance Manager
            <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Phase 1 架構檢核中
            </span>
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">個人財務管理系統 · 繁體中文 (TWD)</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Supabase Status Pill */}
        <button
          onClick={onOpenSetupGuide}
          className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            isConfigured
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
          title="點擊查閱 Supabase 設定"
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isConfigured ? 'Supabase 已連線' : 'Supabase 待配置'}</span>
          <span className="sm:hidden">{isConfigured ? '已連線' : '待配置'}</span>
        </button>

        {/* User Account Avatar / Status */}
        <div className="flex items-center space-x-2 border-l border-slate-200 pl-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-slate-800">
              {userEmail || '管理者'}
            </div>
            <div className="text-[10px] text-slate-400">PostgreSQL RLS</div>
          </div>
        </div>
      </div>
    </header>
  );
};
