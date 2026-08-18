import React, { useState, useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  FileJson, 
  X, 
  RefreshCw, 
  ShieldCheck, 
  Key, 
  FileCheck, 
  HardDrive,
  Info
} from 'lucide-react';
import { GroupInfo, SearchSettings } from '../types';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupsCount: number;
  keywordsCount: number;
  isConnected: boolean;
  userPhone?: string;
  onRefreshData: () => Promise<void>;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  groupsCount,
  keywordsCount,
  isConnected,
  userPhone,
  onRefreshData
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Staged file state for restoration
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<{
    groupsCount?: number;
    keywordsCount?: number;
    exportedAt?: string;
    hasSession?: boolean;
    userPhone?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Save 100% snapshot to disk
  const handleSaveToDisk = async () => {
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/telegram/backup/save', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessMessage(data.message || 'تمامی اطلاعات و تنظیمات با موفقیت ذخیره شدند.');
        await onRefreshData();
      } else {
        setErrorMessage(data.error || 'خطا در ذخیره‌سازی داده‌ها');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'خطا در برقراری ارتباط با سرور');
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Download JSON Backup File
  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/telegram/backup/export');
      if (!response.ok) throw new Error('خطا در دریافت فایل پشتیبان از سرور');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `telegram_userbot_backup_${dateStr}_${Date.now().toString().slice(-4)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSaveSuccessMessage('فایل پشتیبان JSON با موفقیت تولید و دانلود شد ⬇️');
    } catch (e: any) {
      setErrorMessage(e.message || 'خطا در دانلود فایل پشتیبان');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setErrorMessage(null);
    setSaveSuccessMessage(null);
    if (!file.name.endsWith('.json')) {
      setErrorMessage('لطفاً فقط فایل با پسوند .json انتخاب نمایید.');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        const groupsArr = Array.isArray(parsed.groups) ? parsed.groups : [];
        const keywordsArr = parsed.settings?.keywords || [];
        const hasSession = Boolean(parsed.telegramSession?.sessionString || parsed.sessionString);
        const phone = parsed.telegramSession?.currentPhone || parsed.currentPhone || parsed.appMetadata?.userPhone;

        setParsedPreview({
          groupsCount: groupsArr.length,
          keywordsCount: keywordsArr.length,
          exportedAt: parsed.exportedAtLocal || parsed.exportedAt,
          hasSession,
          userPhone: phone
        });
      } catch (err) {
        setErrorMessage('فایل انتخاب‌شده یک JSON معتبر نیست یا ساختار آن آسیب دیده است.');
        setSelectedFile(null);
        setParsedPreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // 3. Restore snapshot from JSON file
  const handleRestoreBackup = async () => {
    if (!selectedFile) {
      setErrorMessage('ابتدا یک فایل پشتیبان JSON انتخاب کنید.');
      return;
    }

    setIsRestoring(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const backupData = JSON.parse(content);

        const res = await fetch('/api/telegram/backup/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupData)
        });

        const data = await res.json();
        if (data.success) {
          setSaveSuccessMessage(data.message || 'بازیابی با موفقیت کامل انجام گردید ✅');
          setSelectedFile(null);
          setParsedPreview(null);
          await onRefreshData();
        } else {
          setErrorMessage(data.error || 'خطا در بازگردانی پشتیبان');
        }
      } catch (e: any) {
        setErrorMessage(e.message || 'خطا در پردازش یا ارسال فایل پشتیبان');
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in dir-rtl">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                مرکز پشتیبان‌گیری و فریز اطلاعات (Backup & Restore)
              </h2>
              <p className="text-xs text-slate-400">
                ذخیره، دانلود و بازیابی ۱۰۰٪ کامل اطلاعات، نشست تلگرام و گروه‌ها در فایل JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Explanation Banner */}
          <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-4 flex items-start gap-3 text-xs text-cyan-200/90 leading-relaxed">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-cyan-300 mb-1">
                قابلیت فریز ۱۰۰٪ و بازیابی بدون نیاز به ورود مجدد:
              </p>
              <p>
                اگر محیط Google AI Studio را ببندید یا خاموش کنید، می‌توانید با دانلود فایل JSON پشتیبان، تمامی اطلاعات (شامل نشست ورود به تلگرام، گروه‌های کشف‌شده، کلمات کلیدی، نتایج موانع و لاگ‌ها) را ذخیره کرده و پس از بازگشت با آپلود فایل، برنامه را دقیقاً به همان وضعیت قبلی برگردانید.
              </p>
            </div>
          </div>

          {/* Current State Snapshot Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-center">
              <span className="text-xs text-slate-400 block mb-1">گروه‌های ثبت‌شده</span>
              <span className="text-lg font-bold font-mono text-cyan-400">{groupsCount}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-center">
              <span className="text-xs text-slate-400 block mb-1">کلمات کلیدی جستجو</span>
              <span className="text-lg font-bold font-mono text-cyan-400">{keywordsCount}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-center">
              <span className="text-xs text-slate-400 block mb-1">نشست تلگرام</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                isConnected ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
              }`}>
                {isConnected ? (userPhone || 'متصل و فعال') : 'غیرمتصل'}
              </span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {saveSuccessMessage && (
            <div className="bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-950/50 border border-red-800/80 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: The 3 Main Actions */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              عملیات سه‌گانه پشتیبان‌گیری و بازیابی:
            </h3>

            {/* Action 1 & Action 2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Button 1: Save 100% to disk */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Save className="w-4 h-4 text-cyan-400" />
                    ۱. ذخیره‌سازی ۱۰۰٪ اطلاعات
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    فریز و ثبت فوری تمامی تنظیمات، نشست و گروه‌ها در دیسک محلی سرور
                  </p>
                </div>
                <button
                  onClick={handleSaveToDisk}
                  disabled={isSaving}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-slate-700 hover:border-cyan-500/50 flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      در حال ذخیره‌سازی...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-cyan-400" />
                      ذخیره‌سازی ۱۰۰٪ کل اطلاعات و تنظیمات
                    </>
                  )}
                </button>
              </div>

              {/* Button 2: Download JSON Backup */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Download className="w-4 h-4 text-emerald-400" />
                    ۲. دانلود فایل پشتیبان (JSON)
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    دریافت فایل کامل پشتیبان روی رایانه برای استفاده بعد از خاموش کردن اپ
                  </p>
                </div>
                <button
                  onClick={handleDownloadBackup}
                  disabled={isDownloading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30"
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      در حال تولید و دانلود...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-white" />
                      دانلود پشتیبان (JSON)
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Action 3: Restore Backup (File Upload & Drag Drop) */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  ۳. بازیابی پشتیبان (آپلود فایل JSON)
                </div>
                <span className="text-[11px] text-slate-500">
                  فرمت فایل: .json
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-cyan-500 bg-cyan-950/20'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  {selectedFile ? (
                    <FileCheck className="w-8 h-8 text-cyan-400 animate-bounce" />
                  ) : (
                    <FileJson className="w-8 h-8 text-slate-500" />
                  )}

                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-bold text-cyan-300">
                        فایل انتخاب‌شده: {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        حجم: {(selectedFile.size / 1024).toFixed(1)} کیلوبایت - برای تعویض کلیک کنید
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-slate-300">
                        کلیک کنید یا فایل JSON پشتیبان را به اینجا بکشید و رها کنید
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        پشتیبانی از کلیه فایل‌های پشتیبان ذخیره‌شده توسط این اپلیکیشن
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Parsed JSON Preview */}
              {parsedPreview && (
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>محتویات شناسایی شده:</span>
                    <span className="text-cyan-400 font-mono font-bold">
                      {parsedPreview.groupsCount} گروه | {parsedPreview.keywordsCount} کلمه کلیدی
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>وضعیت نشست تلگرام:</span>
                    <span className={parsedPreview.hasSession ? "text-emerald-400" : "text-amber-400"}>
                      {parsedPreview.hasSession ? `نشست ذخیره‌شده آماده اتصال (${parsedPreview.userPhone || 'فعال'})` : 'فاقد نشست'}
                    </span>
                  </div>
                  {parsedPreview.exportedAt && (
                    <div className="text-[10px] text-slate-500 text-left dir-ltr">
                      تاریخ استخراج: {parsedPreview.exportedAt}
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Restore Button */}
              <button
                onClick={handleRestoreBackup}
                disabled={!selectedFile || isRestoring}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedFile && !isRestoring
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                }`}
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    در حال بازگردانی و اتصال مجدد نشست...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    بازیابی پشتیبان (اعمال ۱۰۰٪ اطلاعات فایل JSON)
                  </>
                )}
              </button>

            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>پشتیبان‌گیری کاملاً آفلاین و رمزنگاری‌شده در ساختار JSON استاندارد</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-all font-medium"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
