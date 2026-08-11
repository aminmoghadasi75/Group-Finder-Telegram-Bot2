import React, { useState, useEffect } from 'react';
import { LogOut, X, Check, ShieldCheck, AlertTriangle, Clock, RefreshCw, Bot, MessageSquare, Users, Radio, Sparkles, CheckCircle2, Square, CheckSquare } from 'lucide-react';
import { PurgeOptions, PurgeProgress } from '../types';

interface PurgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const PurgeModal: React.FC<PurgeModalProps> = ({ isOpen, onClose, onRefreshData }) => {
  const [options, setOptions] = useState<PurgeOptions>({
    purgeChannels: true,
    purgeGroups: true,
    purgeBots: true,
    purgePrivateChats: true,
  });

  const [progress, setProgress] = useState<PurgeProgress | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Poll progress if purging is active
  useEffect(() => {
    let interval: any = null;

    const fetchProgress = async () => {
      try {
        const res = await fetch('/api/telegram/purge-progress');
        const data: PurgeProgress = await res.json();
        setProgress(data);

        if (data && !data.isPurging && data.isCompleted) {
          if (onRefreshData) onRefreshData();
        }
      } catch (e) {
        console.error("Error fetching purge progress:", e);
      }
    };

    if (isOpen) {
      fetchProgress();
      interval = setInterval(fetchProgress, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartPurge = async () => {
    setIsStarting(true);
    try {
      const res = await fetch('/api/telegram/purge-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || data.message || 'خطا در آغاز خلوت‌سازی');
      }
    } catch (e: any) {
      alert('خطا در برقراری ارتباط با سرور: ' + (e.message || e));
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopPurge = async () => {
    try {
      await fetch('/api/telegram/purge-stop', { method: 'POST' });
    } catch (e) {
      console.error("Error stopping purge:", e);
    }
  };

  const percent = (progress && progress.totalTargets > 0)
    ? Math.min(100, Math.round((progress.processedCount / progress.totalTargets) * 100))
    : 0;

  const isPurging = progress?.isPurging || false;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 dir-rtl">
      <div className="bg-slate-900 border border-purple-800/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border-b border-purple-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 rounded-2xl border border-purple-500/30 text-purple-300">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                خلوت‌سازی و پاکسازی دائم تلگرام
                <span className="text-[10px] bg-purple-900/80 text-purple-200 border border-purple-700 px-2 py-0.5 rounded-full">
                  Zero Clutter 🧹
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                خروج خودکار از کانال‌ها، گروه‌ها، ربات‌ها و چت‌های شخصی
              </p>
            </div>
          </div>

          {!isPurging && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">

          {!isPurging && !progress?.isCompleted && (
            /* Options Selector State */
            <div className="space-y-5">
              <div className="bg-purple-950/40 border border-purple-800/50 rounded-2xl p-4 text-xs text-purple-200 space-y-2">
                <span className="font-bold flex items-center gap-1.5 text-purple-300 text-sm">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  حالت ضد مسدودی و رفتار انسانی MTProto
                </span>
                <p className="leading-relaxed text-slate-300">
                  برای جلوگیری از اسپام و فیلتر تلگرام، عملیات پاکسازی با تاخیرهای متغیر (۱.۵ تا ۲.۵ ثانیه) بین هر خروج انجام می‌شود تا تلگرام شما کاملاً خلوت و مرتب گردد.
                </p>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  چه بخش‌هایی از تلگرام شما خلوت و پاکسازی شوند؟
                </label>

                {/* Option 1: Channels */}
                <div 
                  onClick={() => setOptions(prev => ({ ...prev, purgeChannels: !prev.purgeChannels }))}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    options.purgeChannels 
                      ? 'bg-purple-950/50 border-purple-600/80 text-white shadow-md' 
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${options.purgeChannels ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-500'}`}>
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">کانال‌های تلگرامی (📢)</span>
                      <span className="text-[11px] text-slate-400">خروج کامل + حذف چت و تاریخچه از صفحه پیام‌ها</span>
                    </div>
                  </div>
                  {options.purgeChannels ? <CheckSquare className="w-5 h-5 text-purple-400 shrink-0" /> : <Square className="w-5 h-5 text-slate-600 shrink-0" />}
                </div>

                {/* Option 2: Groups */}
                <div 
                  onClick={() => setOptions(prev => ({ ...prev, purgeGroups: !prev.purgeGroups }))}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    options.purgeGroups 
                      ? 'bg-indigo-950/50 border-indigo-600/80 text-white shadow-md' 
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${options.purgeGroups ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'}`}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">گروه‌ها و سوپرگروه‌ها (👥)</span>
                      <span className="text-[11px] text-slate-400">خروج کامل + حذف گروه و چت‌ها از لیست تلگرام</span>
                    </div>
                  </div>
                  {options.purgeGroups ? <CheckSquare className="w-5 h-5 text-indigo-400 shrink-0" /> : <Square className="w-5 h-5 text-slate-600 shrink-0" />}
                </div>

                {/* Option 3: Bots */}
                <div 
                  onClick={() => setOptions(prev => ({ ...prev, purgeBots: !prev.purgeBots }))}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    options.purgeBots 
                      ? 'bg-cyan-950/50 border-cyan-600/80 text-white shadow-md' 
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${options.purgeBots ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}>
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">ربات‌های فعال (🤖)</span>
                      <span className="text-[11px] text-slate-400">حذف چت و مسدودسازی ربات‌ها</span>
                    </div>
                  </div>
                  {options.purgeBots ? <CheckSquare className="w-5 h-5 text-cyan-400 shrink-0" /> : <Square className="w-5 h-5 text-slate-600 shrink-0" />}
                </div>

                {/* Option 4: Private DM Chats */}
                <div 
                  onClick={() => setOptions(prev => ({ ...prev, purgePrivateChats: !prev.purgePrivateChats }))}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    options.purgePrivateChats 
                      ? 'bg-emerald-950/50 border-emerald-600/80 text-white shadow-md' 
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${options.purgePrivateChats ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block">پیام‌های شخصی و دایرکت‌ها (💬)</span>
                      <span className="text-[11px] text-slate-400">حذف تاریخچه چت‌های شخصی و پیام‌ها</span>
                    </div>
                  </div>
                  {options.purgePrivateChats ? <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" /> : <Square className="w-5 h-5 text-slate-600 shrink-0" />}
                </div>
              </div>
            </div>
          )}

          {/* Active Purge Progress State */}
          {isPurging && progress && (
            <div className="space-y-6 animate-fade-in">
              {/* Progress Bar & Percentage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping"></span>
                    {progress.statusMessage}
                  </span>
                  <span className="font-extrabold text-white text-sm bg-purple-950 border border-purple-800 px-3 py-1 rounded-xl">
                    {percent}%
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 rounded-full transition-all duration-500 shadow-lg shadow-purple-500/50"
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1 text-slate-300 font-medium">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    زمان باقی‌مانده تخمینی: <strong className="text-white">{progress.estimatedTimeRemainingSec} ثانیه</strong>
                  </span>
                  <span>
                    پاکسازی‌شده: <strong className="text-purple-300">{progress.processedCount}</strong> از <strong className="text-white">{progress.totalTargets}</strong>
                  </span>
                </div>
              </div>

              {/* Active Current Item Title Badge */}
              {progress.currentTitle && (
                <div className="bg-slate-950/80 border border-purple-800/60 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30">
                      {progress.currentType === 'channel' && <Radio className="w-5 h-5" />}
                      {progress.currentType === 'group' && <Users className="w-5 h-5" />}
                      {progress.currentType === 'bot' && <Bot className="w-5 h-5" />}
                      {progress.currentType === 'user' && <MessageSquare className="w-5 h-5" />}
                      {progress.currentType === 'unknown' && <Sparkles className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">در حال خروج و پاکسازی هم‌اکنون:</span>
                      <span className="text-xs font-bold text-white block mt-0.5 max-w-[220px] truncate">
                        {progress.currentTitle}
                      </span>
                    </div>
                  </div>
                  <span className="w-4 h-4 rounded-full border-2 border-purple-400 border-t-transparent animate-spin"></span>
                </div>
              )}

              {/* Live Category Breakdown Counters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-950/40 border border-purple-800/50 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Radio className="w-4 h-4 text-purple-400" />
                    <span>کانال‌ها:</span>
                  </div>
                  <span className="font-bold text-purple-300 text-sm">{progress.channelsLeft}</span>
                </div>

                <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>گروه‌ها:</span>
                  </div>
                  <span className="font-bold text-indigo-300 text-sm">{progress.groupsLeft}</span>
                </div>

                <div className="bg-cyan-950/40 border border-cyan-800/50 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Bot className="w-4 h-4 text-cyan-400" />
                    <span>ربات‌ها:</span>
                  </div>
                  <span className="font-bold text-cyan-300 text-sm">{progress.botsCleared}</span>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>چت‌های شخصی:</span>
                  </div>
                  <span className="font-bold text-emerald-300 text-sm">{progress.privateChatsCleared}</span>
                </div>
              </div>
            </div>
          )}

          {/* Completed State */}
          {!isPurging && progress?.isCompleted && (
            <div className="space-y-5 text-center animate-fade-in">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-3xl flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-900/30">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-white text-base">صفحه تلگرام شما با موفقیت خلوت و مرتب شد!</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  {progress.statusMessage}
                </p>
              </div>

              {/* Breakdown metrics */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-right">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3">
                  <span className="text-[11px] text-slate-400 block">📢 کانال‌های خروج شده</span>
                  <span className="text-sm font-bold text-purple-300">{progress.channelsLeft}</span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3">
                  <span className="text-[11px] text-slate-400 block">👥 گروه‌های خروج شده</span>
                  <span className="text-sm font-bold text-indigo-300">{progress.groupsLeft}</span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3">
                  <span className="text-[11px] text-slate-400 block">🤖 ربات‌های پاک‌شده</span>
                  <span className="text-sm font-bold text-cyan-300">{progress.botsCleared}</span>
                </div>
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3">
                  <span className="text-[11px] text-slate-400 block">💬 پیام‌های شخصی پاک‌شده</span>
                  <span className="text-sm font-bold text-emerald-300">{progress.privateChatsCleared}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-3">
          {!isPurging && !progress?.isCompleted && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all"
              >
                انصراف
              </button>
              <button
                onClick={handleStartPurge}
                disabled={isStarting || (!options.purgeChannels && !options.purgeGroups && !options.purgeBots && !options.purgePrivateChats)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isStarting ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    در حال برنامه‌ریزی...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    آغاز خلوت‌سازی و پاکسازی 🧹
                  </>
                )}
              </button>
            </>
          )}

          {isPurging && (
            <button
              onClick={handleStopPurge}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-900/40"
            >
              <X className="w-4 h-4" />
              توقف پاکسازی 🛑
            </button>
          )}

          {!isPurging && progress?.isCompleted && (
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/40"
            >
              <Check className="w-4 h-4" />
              بستن پنجره و مشاهده نتایج
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
