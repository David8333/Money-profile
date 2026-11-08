import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Sparkles, AlertCircle, FileText } from 'lucide-react';
import { PRESET_SAMPLES } from '../../services/csv/sampleFiles';

interface CsvUploaderProps {
  onFileLoaded: (content: string, fileName: string) => void;
  isLoading: boolean;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ onFileLoaded, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setErrorMsg(null);
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setErrorMsg('請上傳 .csv 格式的檔案');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content || !content.trim()) {
        setErrorMsg('所選檔案內容為空');
        return;
      }
      onFileLoaded(content, file.name);
    };
    reader.onerror = () => {
      setErrorMsg('讀取檔案時發生錯誤，請確認檔案編碼為 UTF-8');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/70 scale-[0.99]'
            : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-slate-50/80 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Upload className="w-7 h-7" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">
          點擊選取或將手機記帳 CSV 檔案拖曳至此
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-3">
          支援繁體中文與 UTF-8 編碼。自動對應日期、類別、金額、成員、帳戶、備註與收支區分。
        </p>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>支援欄位隨機排序 · 依 UUID 自動去重</span>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Preset Test Samples Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              快速測試預設範本（點擊即可載入驗收）
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">免準備檔案直接驗收</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PRESET_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onFileLoaded(sample.content, sample.fileName)}
              disabled={isLoading}
              className="text-left p-3 rounded-lg border border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                  {sample.title}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">載入</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{sample.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
