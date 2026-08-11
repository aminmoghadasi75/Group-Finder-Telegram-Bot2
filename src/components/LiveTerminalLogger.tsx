import React, { useRef, useEffect } from 'react';
import { Terminal, ShieldCheck, ShieldAlert, Trash2, Clock, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { SearchProgress } from '../types';

interface LiveTerminalLoggerProps {
  progress: SearchProgress;
  onClearLogs?: () => void;
}

export const LiveTerminalLogger: React.FC<LiveTerminalLoggerProps> = ({
  progress,
  onClearLogs
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [progress.logs]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl font-mono text-xs">
      
      {/* Terminal Bar Header */}
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <span className="text-slate-400 font-bold ml-2 flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-cyan-400" />
            لاگ زنده موتور کاوشگر و پروتکل‌های ایمنی
          </span>
        </div>

        <div className="flex items-center gap-3">
          {progress.isSearching && (
            <span className="flex items-center gap-1.5 text-cyan-400 text-[11px] bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-800/60 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              در حال پویش تلگرام...
            </span>
          )}

          {progress.floodWaitSeconds > 0 && (
            <span className="flex items-center gap-1 text-amber-300 text-[11px] bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              انتظار FloodWait: {progress.floodWaitSeconds}s
            </span>
          )}

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              title="پاکسازی لاگ‌ها"
              className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Status Header Metrics */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
        <div>
          <span className="text-slate-500 block">کلمه کلیدی جاری:</span>
          <span className="text-cyan-300 font-bold truncate block">{progress.currentKeyword || '---'}</span>
        </div>
        <div>
          <span className="text-slate-500 block">کلمات بررسی‌شده:</span>
          <span className="text-slate-200 font-bold block">{progress.completedKeywords} از {progress.totalKeywords}</span>
        </div>
        <div>
          <span className="text-slate-500 block">گروه‌های عمومی کشف‌شده:</span>
          <span className="text-emerald-400 font-bold block">{progress.totalFound} مورد ({progress.validGroupsCount} قابل پیام)</span>
        </div>
        <div>
          <span className="text-slate-500 block">تعداد استعلام‌ها:</span>
          <span className="text-slate-200 font-bold block">{progress.requestsMade} درخواست</span>
        </div>
      </div>

      {/* Terminal Output Log Container */}
      <div 
        ref={logContainerRef} 
        className="p-4 h-64 overflow-y-auto space-y-2 dir-rtl text-right font-mono text-[12px] leading-relaxed"
      >
        {progress.logs.length === 0 ? (
          <div className="text-slate-600 text-center py-12 italic">
            [منتظر شروع عملیات...] برای شروع شخم زدن تلگرام، کلمات کلیدی خود را مشخص کرده و دکمه "شروع" را فشار دهید.
          </div>
        ) : (
          progress.logs.map((log) => {
            let textColor = 'text-slate-300';
            let icon = <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />;

            if (log.level === 'success') {
              textColor = 'text-emerald-300';
              icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />;
            } else if (log.level === 'warning') {
              textColor = 'text-amber-300';
              icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
            } else if (log.level === 'error') {
              textColor = 'text-red-300';
              icon = <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />;
            } else if (log.level === 'safety') {
              textColor = 'text-cyan-300 font-medium';
              icon = <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />;
            }

            return (
              <div key={log.id} className="flex items-start gap-2 border-b border-slate-900/60 pb-1">
                <span className="text-slate-600 text-[10px] dir-ltr font-mono mt-0.5 shrink-0">
                  [{log.timestamp}]
                </span>
                {icon}
                <span className={`flex-1 break-words ${textColor}`}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
