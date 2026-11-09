import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  SlidersHorizontal,
  Coins,
  ShieldCheck,
  Sparkles,
  Layers,
  HelpCircle
} from 'lucide-react';
import {
  CfoBudgetItem,
  CfoSurplusAllocationItem,
  CfoCategoryGroup,
} from '../../types/cfo';
import {
  DEFAULT_BUDGET_TEMPLATES,
  DEFAULT_SURPLUS_ALLOCATIONS
} from '../../services/cfo/cfoStorage';

interface CfoBudgetEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetYear: number;
  budgets: CfoBudgetItem[];
  allocations: CfoSurplusAllocationItem[];
  onSave: (budgets: CfoBudgetItem[], allocations: CfoSurplusAllocationItem[]) => void;
}

export const CfoBudgetEditModal: React.FC<CfoBudgetEditModalProps> = ({
  isOpen,
  onClose,
  targetYear,
  budgets: initialBudgets,
  allocations: initialAllocations,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'budget' | 'allocation'>('budget');
  const [budgets, setBudgets] = useState<CfoBudgetItem[]>(initialBudgets);
  const [allocations, setAllocations] = useState<CfoSurplusAllocationItem[]>(initialAllocations);

  // 新增預算項目暫存
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetGroup, setNewBudgetGroup] = useState<CfoCategoryGroup>('essential');
  const [newBudgetAnnual, setNewBudgetAnnual] = useState('');

  // 新增配置項目暫存
  const [newAllocName, setNewAllocName] = useState('');
  const [newAllocTarget, setNewAllocTarget] = useState('');
  const [newAllocColor, setNewAllocColor] = useState('#10b981');

  if (!isOpen) return null;

  // 更新預算項目的年度金額
  const handleUpdateBudgetAnnual = (id: string, annualAmount: number) => {
    setBudgets((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              annual_budget: annualAmount,
              monthly_budget: Math.round(annualAmount / 12),
            }
          : item
      )
    );
  };

  // 更新預算項目的每月金額
  const handleUpdateBudgetMonthly = (id: string, monthlyAmount: number) => {
    setBudgets((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              monthly_budget: monthlyAmount,
              annual_budget: monthlyAmount * 12,
            }
          : item
      )
    );
  };

  // 刪除預算項目
  const handleDeleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((item) => item.id !== id));
  };

  // 新增預算項目
  const handleAddBudget = () => {
    if (!newBudgetName.trim()) return;
    const annualNum = parseFloat(newBudgetAnnual) || 0;
    const newItem: CfoBudgetItem = {
      id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newBudgetName.trim(),
      group: newBudgetGroup,
      annual_budget: annualNum,
      monthly_budget: Math.round(annualNum / 12),
      sort_order: budgets.length + 1,
    };
    setBudgets((prev) => [...prev, newItem]);
    setNewBudgetName('');
    setNewBudgetAnnual('');
  };

  // 更新配置項目
  const handleUpdateAllocTarget = (id: string, targetAmount: number) => {
    setAllocations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, target_amount: targetAmount } : item
      )
    );
  };

  const handleUpdateAllocFunded = (id: string, fundedAmount: number) => {
    setAllocations((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, actual_funded_amount: fundedAmount } : item
      )
    );
  };

  // 刪除配置項目
  const handleDeleteAlloc = (id: string) => {
    setAllocations((prev) => prev.filter((item) => item.id !== id));
  };

  // 新增配置項目
  const handleAddAlloc = () => {
    if (!newAllocName.trim()) return;
    const targetNum = parseFloat(newAllocTarget) || 0;
    const newItem: CfoSurplusAllocationItem = {
      id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newAllocName.trim(),
      target_amount: targetNum,
      actual_funded_amount: 0,
      color: newAllocColor,
    };
    setAllocations((prev) => [...prev, newItem]);
    setNewAllocName('');
    setNewAllocTarget('');
  };

  // 重設為標準範本
  const handleApplyTemplates = () => {
    if (confirm(`確定要將 ${targetYear} 年度的預算與盈餘配置重設為標準企業經營範本嗎？`)) {
      setBudgets(DEFAULT_BUDGET_TEMPLATES);
      setAllocations(DEFAULT_SURPLUS_ALLOCATIONS);
    }
  };

  // 儲存送出
  const handleSave = () => {
    onSave(budgets, allocations);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                編輯 {targetYear} 年度預算與盈餘配置
              </h3>
              <p className="text-xs text-slate-500">
                可自由增刪生活支出額度與資本累積目標，儲存後即時生效並永久保存
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Sub-Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('budget')}
              className={`pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'budget'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              年度預算規劃 ({budgets.length})
            </button>
            <button
              onClick={() => setActiveTab('allocation')}
              className={`pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'allocation'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              盈餘分配方案 ({allocations.length})
            </button>
          </div>

          <button
            onClick={handleApplyTemplates}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer mb-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>套用預設範本</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {activeTab === 'budget' ? (
            <div>
              {/* Add New Budget Bar */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-5 flex flex-wrap items-center gap-2.5 text-xs">
                <span className="font-semibold text-slate-700">新增預算項目：</span>
                <input
                  type="text"
                  placeholder="項目名稱 (如: 健身運動)"
                  value={newBudgetName}
                  onChange={(e) => setNewBudgetName(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <select
                  value={newBudgetGroup}
                  onChange={(e) => setNewBudgetGroup(e.target.value as CfoCategoryGroup)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="essential">A. 必要生活支出</option>
                  <option value="lifestyle">B. 生活品質與規劃</option>
                  <option value="wealth">C. 財富累積（盈餘）</option>
                </select>
                <input
                  type="number"
                  placeholder="年度目標 (TWD)"
                  value={newBudgetAnnual}
                  onChange={(e) => setNewBudgetAnnual(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-32 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={handleAddBudget}
                  disabled={!newBudgetName.trim()}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>加入</span>
                </button>
              </div>

              {/* Budget List */}
              <div className="space-y-2">
                {budgets.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/50 transition-colors text-xs"
                  >
                    <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                      <span className="font-semibold text-slate-800 text-sm truncate">{item.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        item.group === 'essential'
                          ? 'bg-sky-50 text-sky-700'
                          : item.group === 'lifestyle'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {item.group === 'essential' ? '必要支出' : item.group === 'lifestyle' ? '生活品質' : '財富累積'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">年度預算</span>
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-slate-400 text-xs">$</span>
                          <input
                            type="number"
                            value={item.annual_budget}
                            onChange={(e) => handleUpdateBudgetAnnual(item.id, parseFloat(e.target.value) || 0)}
                            className="w-28 pl-5 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">每月換算</span>
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-slate-400 text-xs">$</span>
                          <input
                            type="number"
                            value={item.monthly_budget}
                            onChange={(e) => handleUpdateBudgetMonthly(item.id, parseFloat(e.target.value) || 0)}
                            className="w-24 pl-5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteBudget(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer mt-3 sm:mt-0"
                        title="刪除項目"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              {/* Add New Allocation Bar */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-5 flex flex-wrap items-center gap-2.5 text-xs">
                <span className="font-semibold text-slate-700">新增盈餘配置項目：</span>
                <input
                  type="text"
                  placeholder="項目 (如: 買房頭期款)"
                  value={newAllocName}
                  onChange={(e) => setNewAllocName(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="number"
                  placeholder="目標金額 (TWD)"
                  value={newAllocTarget}
                  onChange={(e) => setNewAllocTarget(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-32 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="color"
                  value={newAllocColor}
                  onChange={(e) => setNewAllocColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border border-slate-200 p-0"
                  title="選取代表色"
                />
                <button
                  onClick={handleAddAlloc}
                  disabled={!newAllocName.trim()}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>加入</span>
                </button>
              </div>

              {/* Allocations List */}
              <div className="space-y-2">
                {allocations.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/50 transition-colors text-xs"
                  >
                    <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-slate-800 text-sm truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">預定分配目標</span>
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-slate-400 text-xs">$</span>
                          <input
                            type="number"
                            value={item.target_amount}
                            onChange={(e) => handleUpdateAllocTarget(item.id, parseFloat(e.target.value) || 0)}
                            className="w-28 pl-5 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">實際已劃撥到位</span>
                        <div className="relative">
                          <span className="absolute left-2 top-1 text-slate-400 text-xs">$</span>
                          <input
                            type="number"
                            value={item.actual_funded_amount}
                            onChange={(e) => handleUpdateAllocFunded(item.id, parseFloat(e.target.value) || 0)}
                            className="w-28 pl-5 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteAlloc(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer mt-3 sm:mt-0"
                        title="刪除配置"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            設定將即時儲存至瀏覽器本地，重新整理後依然保留。
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>儲存並重新計算</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
