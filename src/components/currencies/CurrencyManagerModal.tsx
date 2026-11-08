import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  TrendingUp,
  History,
  Plus,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Edit2,
  Trash2,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';
import { DbCurrency } from '../../types/database';
import { ExchangeRateEntry, EnrichedTransaction } from '../../types/finance';
import {
  fetchCurrencies,
  addCurrency,
  updateCurrency,
  deleteCurrency,
} from '../../services/supabase/currencies';
import {
  getLatestRates,
  fetchExchangeRateHistory,
  setExchangeRate,
} from '../../services/currencies/rateService';
import { getTodayDateString } from '../../utils/date';
import { useAuth } from '../../hooks/useAuth';

interface CurrencyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: EnrichedTransaction[];
  onCurrenciesUpdated?: () => void;
}

export const CurrencyManagerModal: React.FC<CurrencyManagerModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onCurrenciesUpdated,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'currencies' | 'rates' | 'history'>('currencies');

  // 幣別狀態
  const [currencies, setCurrencies] = useState<DbCurrency[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newDecimals, setNewDecimals] = useState(2);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSymbol, setEditSymbol] = useState('');
  const [editDecimals, setEditDecimals] = useState(2);

  // 匯率狀態
  const [latestRates, setLatestRates] = useState<Record<string, { rate: number; effectiveDate: string; updatedAt: string }>>({});
  const [rateFormCurrency, setRateFormCurrency] = useState('USD');
  const [rateFormValue, setRateFormValue] = useState('32.0');
  const [rateFormDate, setRateFormDate] = useState(getTodayDateString());
  const [rateFormNote, setRateFormNote] = useState('手動調整參考匯率');

  // 歷史檢視幣別
  const [selectedHistoryCurrency, setSelectedHistoryCurrency] = useState('USD');
  const [historyList, setHistoryList] = useState<ExchangeRateEntry[]>([]);

  // 訊息
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const reloadData = async () => {
    const currRes = await fetchCurrencies(true);
    setCurrencies(currRes.data);
    setLatestRates(getLatestRates());

    const histRes = await fetchExchangeRateHistory(user?.id, selectedHistoryCurrency);
    setHistoryList(histRes.data);
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      setFeedback(null);
    }
  }, [isOpen, selectedHistoryCurrency]);

  if (!isOpen) return null;

  // 處理新增幣別
  const handleAddCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const res = await addCurrency({
      code: newCode,
      name: newName,
      symbol: newSymbol || newCode.toUpperCase(),
      decimal_places: Number(newDecimals),
    });

    if (res.error) {
      setFeedback({ type: 'error', message: res.error });
      return;
    }

    setFeedback({ type: 'success', message: `成功新增幣別 ${res.data?.code} (${res.data?.name})` });
    setNewCode('');
    setNewName('');
    setNewSymbol('');
    await reloadData();
    onCurrenciesUpdated?.();
  };

  // 處理更新幣別
  const handleSaveEdit = async (code: string) => {
    setFeedback(null);
    const res = await updateCurrency(code, {
      name: editName,
      symbol: editSymbol,
      decimal_places: Number(editDecimals),
    });

    if (res.error) {
      setFeedback({ type: 'error', message: res.error });
      return;
    }

    setFeedback({ type: 'success', message: `幣別 ${code} 設定已更新` });
    setEditingCode(null);
    await reloadData();
    onCurrenciesUpdated?.();
  };

  // 處理啟用/停用
  const handleToggleActive = async (code: string, currentActive: boolean) => {
    if (code === 'TWD') {
      setFeedback({ type: 'error', message: '基準貨幣 TWD 不可停用' });
      return;
    }
    const res = await updateCurrency(code, { is_active: !currentActive });
    if (res.error) {
      setFeedback({ type: 'error', message: res.error });
    } else {
      await reloadData();
      onCurrenciesUpdated?.();
    }
  };

  // 處理刪除幣別
  const handleDelete = async (code: string) => {
    setFeedback(null);
    const res = await deleteCurrency(code, transactions);
    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || '刪除失敗' });
      return;
    }

    setFeedback({ type: 'success', message: `成功刪除幣別 ${code}` });
    await reloadData();
    onCurrenciesUpdated?.();
  };

  // 處理更新匯率
  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const numRate = Number(rateFormValue);
    if (isNaN(numRate) || numRate <= 0) {
      setFeedback({ type: 'error', message: '請輸入大於 0 的有效數值匯率' });
      return;
    }

    const res = await setExchangeRate(user?.id, {
      fromCurrency: rateFormCurrency,
      rate: numRate,
      effectiveDate: rateFormDate,
      note: rateFormNote,
    });

    if (res.error) {
      setFeedback({ type: 'error', message: res.error });
      return;
    }

    setFeedback({
      type: 'success',
      message: `已更新 1 ${rateFormCurrency} = ${numRate} TWD (生效日: ${rateFormDate})`,
    });

    await reloadData();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">多幣別與匯率管理 (Phase 5)</h3>
              <p className="text-xs text-slate-400">
                基準貨幣：新台幣 (TWD) ｜ 支援外幣兌換、生效日查詢與歷史紀錄
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('currencies')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'currencies'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>支援幣別設定</span>
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rates'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>即時參考匯率</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>歷史匯率查詢</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}>
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tab 1: 幣別設定 */}
        {activeTab === 'currencies' && (
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* 幣別清單 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  已啟用與自訂幣別清單
                </h4>
                <span className="text-[11px] text-slate-500">
                  共 {currencies.length} 種貨幣
                </span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
                {currencies.map(c => {
                  const isEditing = editingCode === c.code;
                  const isBase = c.code === 'TWD';

                  return (
                    <div key={c.code} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                      {isEditing ? (
                        <div className="flex-1 grid grid-cols-3 gap-2 mr-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder="名稱"
                            className="px-2 py-1 border border-slate-300 rounded text-xs"
                          />
                          <input
                            type="text"
                            value={editSymbol}
                            onChange={e => setEditSymbol(e.target.value)}
                            placeholder="符號"
                            className="px-2 py-1 border border-slate-300 rounded text-xs"
                          />
                          <input
                            type="number"
                            min="0"
                            max="4"
                            value={editDecimals}
                            onChange={e => setEditDecimals(Number(e.target.value))}
                            className="px-2 py-1 border border-slate-300 rounded text-xs"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isBase ? 'bg-emerald-100 text-emerald-800 font-mono' : 'bg-slate-100 text-slate-700 font-mono'
                          }`}>
                            {c.code}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{c.name}</span>
                              <span className="text-slate-400 font-mono">({c.symbol})</span>
                              {isBase && (
                                <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                                  基準幣別
                                </span>
                              )}
                              {!c.is_active && (
                                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded text-[10px]">
                                  已停用
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              小數位數: {c.decimal_places} 位
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(c.code)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                            >
                              儲存
                            </button>
                            <button
                              onClick={() => setEditingCode(null)}
                              className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs hover:bg-slate-300 cursor-pointer"
                            >
                              取消
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingCode(c.code);
                                setEditName(c.name);
                                setEditSymbol(c.symbol);
                                setEditDecimals(c.decimal_places);
                              }}
                              title="編輯名稱與小數"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isBase && (
                              <button
                                onClick={() => handleToggleActive(c.code, c.is_active)}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                  c.is_active
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                }`}
                              >
                                {c.is_active ? '停用' : '啟用'}
                              </button>
                            )}
                            {!isBase && (
                              <button
                                onClick={() => handleDelete(c.code)}
                                title="刪除此幣別"
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 新增自訂幣別表單 */}
            <form onSubmit={handleAddCurrency} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>新增自訂幣別 (例如: CAD, SGD, AUD)</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    幣別代碼 (3碼)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    required
                    placeholder="CAD"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    貨幣名稱
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="加拿大元"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    顯示符號
                  </label>
                  <input
                    type="text"
                    placeholder="CA$"
                    value={newSymbol}
                    onChange={e => setNewSymbol(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    小數位數
                  </label>
                  <select
                    value={newDecimals}
                    onChange={e => setNewDecimals(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value={0}>0 位 (如 JPY, TWD)</option>
                    <option value={2}>2 位 (如 USD, EUR)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>加入幣別</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: 匯率管理 */}
        {activeTab === 'rates' && (
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* 核心安全保證告示 */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">匯率安全與歷史數據不可變保證</p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  每筆交易在建立時皆永久記錄當時之匯率與換算金額（base_amount）。
                  修改當前參考匯率<strong className="underline decoration-blue-500 font-semibold">絕不會自動覆蓋既有歷史交易紀錄</strong>，維護財務數據真實精準。
                </p>
              </div>
            </div>

            {/* 現行匯率表 */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                當前牌告匯率 (兌 TWD 新台幣)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.entries(latestRates).map(([code, info]) => {
                  if (code === 'TWD') return null;
                  return (
                    <div
                      key={code}
                      onClick={() => {
                        setRateFormCurrency(code);
                        setRateFormValue(String(info.rate));
                      }}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900 font-mono">{code} / TWD</span>
                        <span className="text-[10px] text-slate-400">{info.effectiveDate}</span>
                      </div>
                      <div className="text-base font-bold text-emerald-700 font-mono">
                        {info.rate}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">點擊快速填入下方表單</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 手動更新匯率表單 */}
            <form onSubmit={handleUpdateRate} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>手動新增或更新匯率</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">外幣幣別</label>
                  <select
                    value={rateFormCurrency}
                    onChange={e => {
                      setRateFormCurrency(e.target.value);
                      if (latestRates[e.target.value]) {
                        setRateFormValue(String(latestRates[e.target.value].rate));
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                  >
                    {currencies.filter(c => c.code !== 'TWD' && c.is_active).map(c => (
                      <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    匯率 (1 外幣 = ? TWD)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={rateFormValue}
                    onChange={e => setRateFormValue(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">生效日期</label>
                  <input
                    type="date"
                    required
                    value={rateFormDate}
                    onChange={e => setRateFormDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">更新說明備註</label>
                <input
                  type="text"
                  value={rateFormNote}
                  onChange={e => setRateFormNote(e.target.value)}
                  placeholder="例如: 台灣銀行牌告現金賣出價、信用卡換匯結算"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  確認更新匯率
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: 歷史匯率 */}
        {activeTab === 'history' && (
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-700">選擇貨幣:</span>
                <select
                  value={selectedHistoryCurrency}
                  onChange={e => setSelectedHistoryCurrency(e.target.value)}
                  className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold bg-white"
                >
                  {currencies.filter(c => c.code !== 'TWD').map(c => (
                    <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              <span className="text-[11px] text-slate-500">
                共 {historyList.length} 筆歷史紀錄
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2 px-3">生效日期</th>
                    <th className="py-2 px-3">幣別對</th>
                    <th className="py-2 px-3">匯率 (兌 TWD)</th>
                    <th className="py-2 px-3">備註說明</th>
                    <th className="py-2 px-3 text-right">更新時間</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        目前尚無該幣別的歷史匯率紀錄
                      </td>
                    </tr>
                  ) : (
                    historyList.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">{item.effectiveDate}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{item.fromCurrency} / {item.toCurrency}</td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-700">{item.rate}</td>
                        <td className="py-2 px-3 text-slate-600">{item.note || '-'}</td>
                        <td className="py-2 px-3 text-right text-slate-400 font-mono text-[11px]">
                          {item.updatedAt.slice(0, 10)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};
