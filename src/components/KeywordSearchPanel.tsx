import React, { useState } from 'react';
import { Search, Sparkles, Plus, X, Sliders, ShieldCheck, Play, Square, RefreshCw, Flame, Users, Clock, Layers, Filter, ListPlus, FileText, Check } from 'lucide-react';
import { SearchSettings } from '../types';
import { KEYWORD_PRESETS } from '../utils/keywordHelper';

interface KeywordSearchPanelProps {
  settings: SearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<SearchSettings>>;
  isSearching: boolean;
  onStartSearch: () => void;
  onStopSearch: () => void;
  onExpandAiKeywords: () => void;
  aiLoading: boolean;
}

export const KeywordSearchPanel: React.FC<KeywordSearchPanelProps> = ({
  settings,
  setSettings,
  isSearching,
  onStartSearch,
  onStopSearch,
  onExpandAiKeywords,
  aiLoading,
}) => {
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkInput, setBulkInput] = useState<string>('');

  // Helper to parse multi-line, comma, or semicolon separated inputs
  const parseKeywords = (text: string): string[] => {
    return text
      .split(/[\n\r,;؛\t]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);
  };

  const handleAddKeyword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!keywordInput.trim()) return;

    const items = parseKeywords(keywordInput);
    const updated = Array.from(new Set([...settings.keywords, ...items]));
    setSettings(prev => ({ ...prev, keywords: updated }));
    setKeywordInput('');
  };

  const handleAddBulkKeywords = () => {
    if (!bulkInput.trim()) return;
    const items = parseKeywords(bulkInput);
    const updated = Array.from(new Set([...settings.keywords, ...items]));
    setSettings(prev => ({ ...prev, keywords: updated }));
    setBulkInput('');
    setShowBulkModal(false);
  };

  const handleLoadMovieSample = () => {
    const sample = `فیلم و سریال
دانلود فیلم
دانلود سریال
فیلم خارجی
سریال خارجی
نتفلیکس
هالیوود
فیلم دوبله
فیلم زیرنویس
یوتیوب
استریم
پخش آنلاین`;
    setBulkInput(sample);
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== kwToRemove)
    }));
  };

  const handleApplyPreset = (presetKey: string) => {
    const preset = KEYWORD_PRESETS[presetKey];
    if (preset) {
      const merged = Array.from(new Set([...settings.keywords, ...preset.keywords]));
      setSettings(prev => ({ ...prev, keywords: merged }));
    }
  };

  const handleClearAllKeywords = () => {
    setSettings(prev => ({ ...prev, keywords: [] }));
  };

  const parsedBulkItems = parseKeywords(bulkInput);
  const newBulkItemsCount = parsedBulkItems.filter(k => !settings.keywords.includes(k)).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">موتور جستجو و کشف گروه بر اساس کلمات کلیدی</h2>
            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs px-2.5 py-0.5 rounded-full font-medium">
              {settings.keywords.length} کلمه کلیدی
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            کلمات کلیدی مورد نظر خود را وارد کنید تا ربات تلگرام را شخم زده و گروه‌های عمومی پیام‌پذیر پیدا کند.
          </p>
        </div>

        {/* Start / Stop Execution Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isSearching ? (
            <button
              onClick={onStopSearch}
              className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 transition-all animate-pulse"
            >
              <Square className="w-4 h-4 fill-white" />
              توقف عملیات جستجو
            </button>
          ) : (
            <button
              onClick={onStartSearch}
              disabled={settings.keywords.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-white" />
              شروع شخم‌زدن تلگرام
            </button>
          )}
        </div>
      </div>

      {/* Keyword Add Input Form */}
      <form onSubmit={handleAddKeyword} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="کلمه کلیدی را وارد کنید (می‌توانید کلمات را با ویرگول یا خط بعد جدا کنید)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              افزودن
            </button>
            <button
              type="button"
              onClick={() => setShowBulkModal(!showBulkModal)}
              className="px-4 py-2.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 rounded-xl text-xs font-bold border border-cyan-800/50 flex items-center gap-1.5 transition-all shrink-0"
            >
              <ListPlus className="w-4 h-4 text-cyan-400" />
              افزودن دسته‌ای (لیست)
            </button>
          </div>
        </div>

        {/* AI Expansion & Presets Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExpandAiKeywords}
              disabled={settings.keywords.length === 0 || aiLoading}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-900/50 to-indigo-900/50 hover:from-purple-800/60 hover:to-indigo-800/60 text-purple-200 border border-purple-700/50 rounded-xl font-medium flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              {aiLoading ? 'در حال تقویت با AI...' : 'تولید کلمات مشابه با هوش مصنوعی (Gemini)'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {settings.keywords.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllKeywords}
                className="text-slate-500 hover:text-red-400 text-xs transition-all"
              >
                پاکسازی همه کلمات
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-cyan-400 hover:underline flex items-center gap-1 font-medium"
            >
              <Sliders className="w-3.5 h-3.5" />
              {showAdvanced ? 'پنهان‌سازی فیلترها' : 'تنظیمات پیشرفته فیلتر و ایمنی'}
            </button>
          </div>
        </div>
      </form>

      {/* Bulk Keywords Input Modal / Drawer */}
      {showBulkModal && (
        <div className="bg-slate-950/90 border border-cyan-500/30 rounded-xl p-5 space-y-4 animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <FileText className="w-4 h-4" />
              <span>افزودن دسته‌ای کلمات کلیدی (Paste Multi-line Keywords)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowBulkModal(false)}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-400">
            لیست کلمات کلیدی مورد نظر خود را کپی کرده و در کادر زیر جای‌گذاری کنید (هر کلمه در یک خط یا با ویرگول/کاما جدا شود):
          </p>

          <textarea
            rows={6}
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder={`مثال:
فیلم و سریال
دانلود فیلم
دانلود سریال
فیلم خارجی
سریال خارجی
نتفلیکس
هالیوود`}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <button
                type="button"
                onClick={handleLoadMovieSample}
                className="text-cyan-400 hover:underline text-xs flex items-center gap-1"
              >
                + بارگذاری نمونه (فیلم و سریال)
              </button>
              {parsedBulkItems.length > 0 && (
                <span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full text-[11px] font-mono">
                  شناسایی شده: {parsedBulkItems.length} | جدید: {newBulkItemsCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-all"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleAddBulkKeywords}
                disabled={parsedBulkItems.length === 0}
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
                افزودن همه ({parsedBulkItems.length} کلمه)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Category Preset Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-800/60">
        <span className="text-xs text-slate-400 block font-medium">پیکره‌های کلمات کلیدی آماده (کلیک برای افزودن):</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(KEYWORD_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleApplyPreset(key)}
              className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg text-xs transition-all flex items-center gap-1"
            >
              <span>+</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Keyword Chips List */}
      <div className="space-y-2">
        <span className="text-xs text-slate-400 font-medium block">کلمات کلیدی آماده جستجو:</span>
        {settings.keywords.length === 0 ? (
          <div className="p-4 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
            هنوز هیچ کلمه کلیدی اضافه نشده است. کلمه مورد نظر را تایپ کنید یا از دسته‌بندی‌های آماده بالا استفاده نمایید.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
            {settings.keywords.map((kw, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-cyan-500/30 text-cyan-200 text-xs rounded-xl font-medium shadow-sm group hover:border-cyan-500/60 transition-all"
              >
                <span>{kw}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(kw)}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Safety & Filter Settings Panel */}
      {showAdvanced && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-5 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-slate-800/80 pb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>تنظیمات ایمنی فیلترها و نرخ درخواست‌ها (Anti-Ban Rules)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Delay Range Slider */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  تاخیر بین استعلام‌ها (ثانیه):
                </span>
                <span className="font-mono text-cyan-400 font-bold">
                  {settings.delayBetweenRequestsMin} تا {settings.delayBetweenRequestsMax} ثانیه
                </span>
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="range"
                  min={3}
                  max={30}
                  value={settings.delayBetweenRequestsMin}
                  onChange={(e) => {
                    const minVal = parseInt(e.target.value, 10);
                    setSettings(prev => ({
                      ...prev,
                      delayBetweenRequestsMin: minVal,
                      delayBetweenRequestsMax: Math.max(minVal + 3, prev.delayBetweenRequestsMax)
                    }));
                  }}
                  className="w-full accent-cyan-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                تاخیر تصادفی بین ۵ تا ۱۵ ثانیه رفتاری کاملا مشابه انسان ایجاد کرده و مانع مسدودی اکانت می‌شود.
              </p>
            </div>

            {/* Min Members Threshold */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  حداقل تعداد اعضا برای ذخیره گروه:
                </span>
                <span className="font-mono text-cyan-400 font-bold">{settings.minMembers} عضو</span>
              </label>
              <input
                type="number"
                min={10}
                max={50000}
                step={50}
                value={settings.minMembers}
                onChange={(e) => setSettings(prev => ({ ...prev, minMembers: parseInt(e.target.value, 10) || 50 }))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono"
              />
            </div>

            {/* Toggle: Only messageable groups */}
            <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <div>
                <span className="font-medium text-slate-200 block">فقط گروه‌های دارای حق ارسال پیام</span>
                <span className="text-[11px] text-slate-500 block">گروه‌ها و کانال‌های قفل‌شده توسط ادمین فیلتر شوند</span>
              </div>
              <input
                type="checkbox"
                checked={settings.onlyCanSendMessages}
                onChange={(e) => setSettings(prev => ({ ...prev, onlyCanSendMessages: e.target.checked }))}
                className="w-4 h-4 accent-cyan-500 rounded"
              />
            </div>

            {/* Toggle: Safe Mode Flood Guard */}
            <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <div>
                <span className="font-medium text-emerald-300 block">حالت محافظت هوشمند (Safe Anti-Flood)</span>
                <span className="text-[11px] text-slate-500 block">توقف خودکار در صورت دریافت خطای محدودیت تلگرام</span>
              </div>
              <input
                type="checkbox"
                checked={settings.safeMode}
                onChange={(e) => setSettings(prev => ({ ...prev, safeMode: e.target.checked }))}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
