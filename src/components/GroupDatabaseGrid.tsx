import React, { useState } from 'react';
import { GroupInfo, GroupBarrierType, ProbeBatchProgress } from '../types';
import { 
  Search, Download, ExternalLink, ShieldCheck, CheckCircle2, XCircle, 
  Users, MessageSquare, Copy, Check, Trash2, Filter, AlertTriangle, 
  Sparkles, Bot, UserPlus, Clock, Lock, LogOut, Zap, Layers, FileText
} from 'lucide-react';

interface GroupDatabaseGridProps {
  groups: GroupInfo[];
  onJoinGroup: (usernameOrLink: string) => Promise<boolean>;
  onProbeGroup?: (usernameOrLink: string) => Promise<boolean>;
  onStartBulkProbe?: (onlyUnprobed?: boolean) => Promise<{ success?: boolean; message?: string }>;
  onStopBulkProbe?: () => Promise<void>;
  probeProgress?: ProbeBatchProgress;
  onClearGroups: () => void;
  onLeaveAllGroups?: () => Promise<{ success: boolean; count?: number; message?: string }>;
  onOpenPurgeModal?: () => void;
  onSelectGroup: (group: GroupInfo) => void;
}

const BARRIER_CATEGORIES: { id: 'ALL' | GroupBarrierType; label: string; icon: any; color: string; badgeBg: string }[] = [
  { id: 'ALL', label: 'همه گروه‌ها', icon: Users, color: 'text-cyan-400', badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { id: 'FREE_SEND', label: 'ارسال کاملاً آزاد', icon: CheckCircle2, color: 'text-emerald-400', badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'FORCE_CHANNEL_JOIN', label: 'قفل کانال اسپانسر', icon: ExternalLink, color: 'text-purple-400', badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { id: 'BOT_CAPTCHA', label: 'کاپچادار (ربات ناظم)', icon: Bot, color: 'text-amber-400', badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'FORCE_ADD_MEMBERS', label: 'نیازمند ادد مخاطب', icon: UserPlus, color: 'text-red-400', badgeBg: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { id: 'SLOW_MODE', label: 'حالت کند (تاخیر)', icon: Clock, color: 'text-orange-400', badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { id: 'READ_ONLY', label: 'فقط خواندنی', icon: Lock, color: 'text-slate-400', badgeBg: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  { id: 'UNKNOWN', label: 'بررسی نشده', icon: Sparkles, color: 'text-slate-500', badgeBg: 'bg-slate-800 text-slate-400 border-slate-700' },
];

export const GroupDatabaseGrid: React.FC<GroupDatabaseGridProps> = ({
  groups,
  onJoinGroup,
  onProbeGroup,
  onStartBulkProbe,
  onStopBulkProbe,
  probeProgress,
  onClearGroups,
  onLeaveAllGroups,
  onOpenPurgeModal,
  onSelectGroup
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | GroupBarrierType>('ALL');
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'members' | 'safety' | 'newest'>('members');
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);
  const [copiedAllHandles, setCopiedAllHandles] = useState<boolean>(false);
  const [copiedCategoryNotice, setCopiedCategoryNotice] = useState<string | null>(null);
  const [copiedReportNotice, setCopiedReportNotice] = useState<boolean>(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [probingId, setProbingId] = useState<string | null>(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  const uniqueKeywords = Array.from(new Set(groups.map(g => g.foundByKeyword).filter(Boolean)));

  const handleExecutePurge = async () => {
    if (!onLeaveAllGroups) return;
    setIsPurging(true);
    setPurgeResult(null);
    try {
      const res = await onLeaveAllGroups();
      if (res.success) {
        setPurgeResult(res.message || `با موفقیت از ${res.count || 0} گروه و کانال خارج شدید.`);
      } else {
        setPurgeResult(res.message || 'خطا در خروج دسته‌جمعی.');
      }
    } catch (e: any) {
      setPurgeResult('خطا در اجرای خروج: ' + (e.message || e));
    } finally {
      setIsPurging(false);
      setTimeout(() => setShowPurgeModal(false), 2500);
    }
  };

  // Calculate category counts
  const categoryCounts = groups.reduce((acc, g) => {
    const b = g.barrierType || 'UNKNOWN';
    acc[b] = (acc[b] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter & Sort Groups
  const filteredGroups = groups
    .filter(g => {
      const matchText = (g.title + ' ' + g.username + ' ' + g.description + ' ' + g.foundByKeyword).toLowerCase();
      const matchSearch = matchText.includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (selectedKeyword && g.foundByKeyword !== selectedKeyword) return false;

      if (selectedCategory === 'ALL') return true;
      if (selectedCategory === 'UNKNOWN') return !g.barrierType || g.barrierType === 'UNKNOWN';
      return g.barrierType === selectedCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'members') return b.membersCount - a.membersCount;
      if (sortBy === 'safety') return b.safetyScore - a.safetyScore;
      return new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime();
    });

  const handleCopyHandle = (username: string) => {
    navigator.clipboard.writeText(username);
    setCopiedHandle(username);
    setTimeout(() => setCopiedHandle(null), 2000);
  };

  const handleCopyAllHandles = () => {
    const all = filteredGroups.map(g => g.username).filter(Boolean).join('\n');
    navigator.clipboard.writeText(all);
    setCopiedAllHandles(true);
    setTimeout(() => setCopiedAllHandles(false), 2000);
  };

  const handleCopyCategoryHandles = (catId: 'ALL' | GroupBarrierType) => {
    let targetList = groups;
    if (catId !== 'ALL') {
      if (catId === 'UNKNOWN') {
        targetList = groups.filter(g => !g.barrierType || g.barrierType === 'UNKNOWN');
      } else {
        targetList = groups.filter(g => g.barrierType === catId);
      }
    }
    const handles = targetList.map(g => g.username).filter(Boolean).join('\n');
    if (handles) {
      navigator.clipboard.writeText(handles);
      setCopiedCategoryNotice(catId);
      setTimeout(() => setCopiedCategoryNotice(null), 2000);
    }
  };

  const handleCopyCategorizedReport = () => {
    const categoryTitles: Record<string, string> = {
      FREE_SEND: '✅ ارسال کاملاً آزاد',
      FORCE_CHANNEL_JOIN: '📢 نیازمند عضویت در کانال اسپانسر',
      BOT_CAPTCHA: '🤖 کاپچادار (ربات ناظم)',
      FORCE_ADD_MEMBERS: '👥 نیازمند افزودن مخاطب',
      SLOW_MODE: '⏱️ دارای حالت کند (تاخیر)',
      READ_ONLY: '🔒 فقط خواندنی / مسدود',
      UNKNOWN: '🔍 بررسی نشده'
    };

    const grouped: Record<string, string[]> = {};
    groups.forEach(g => {
      const b = g.barrierType || 'UNKNOWN';
      if (!grouped[b]) grouped[b] = [];
      if (g.username) grouped[b].push(g.username);
    });

    const lines: string[] = ['📊 گزارش دسته‌بندی آیدی گروه‌های تلگرامی\n'];
    Object.entries(categoryTitles).forEach(([key, title]) => {
      const items = grouped[key] || [];
      if (items.length > 0) {
        lines.push(`--- ${title} (${items.length} گروه) ---`);
        items.forEach(h => lines.push(h));
        lines.push('');
      }
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedReportNotice(true);
    setTimeout(() => setCopiedReportNotice(false), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['عنوان گروه', 'آیدی تلگرام', 'لینک مستقیم', 'تعداد اعضا', 'دسته‌بندی مانع', 'توضیحات مانع', 'کلمه کلیدی', 'امتیاز ایمنی'];
    const rows = filteredGroups.map(g => [
      `"${g.title.replace(/"/g, '""')}"`,
      `"${g.username}"`,
      `"${g.link}"`,
      g.membersCount,
      `"${g.barrierType || 'UNKNOWN'}"`,
      `"${(g.barrierDetails || '').replace(/"/g, '""')}"`,
      `"${g.foundByKeyword}"`,
      g.safetyScore
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Telegram_Group_Categories_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const handleExportJSON = () => {
    const jsonString = JSON.stringify(filteredGroups, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Telegram_Group_Categories_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleSafeJoin = async (group: GroupInfo) => {
    setJoiningId(group.id);
    try {
      await onJoinGroup(group.username);
    } finally {
      setJoiningId(null);
    }
  };

  const handleProbe = async (group: GroupInfo) => {
    if (!onProbeGroup) return;
    setProbingId(group.id);
    try {
      await onProbeGroup(group.username);
    } finally {
      setProbingId(null);
    }
  };

  const currentCategoryObj = BARRIER_CATEGORIES.find(c => c.id === selectedCategory);
  const activeCategoryCount = selectedCategory === 'ALL'
    ? groups.length
    : (selectedCategory === 'UNKNOWN' ? (categoryCounts['UNKNOWN'] || 0) : (categoryCounts[selectedCategory] || 0));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      
      {/* Header & Main Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">پایگاه داده گروه‌های عمومی کشف‌شده</h2>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {filteredGroups.length} از {groups.length} گروه
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            دسته بندی هوشمند بر اساس نوع مانع ارسال پیام، تست ضربتی یک‌کلیکه و استخراج آیدی دسته‌ها.
          </p>
        </div>

        {/* Exporters & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          
          {/* Feature 1: One-Click Bulk Probe Button */}
          {onStartBulkProbe && (
            <button
              onClick={() => onStartBulkProbe(false)}
              disabled={probeProgress?.isProbing || groups.length === 0}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/30 cursor-pointer disabled:opacity-40"
              title="ارسال پیام تست در تمام گروه‌ها، بررسی فوری واکنش ربات ناظم و خروج هوشمند دائم"
            >
              <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
              تست ضربتی تمامی گروه‌ها ⚡
            </button>
          )}

          <button
            onClick={handleCopyCategorizedReport}
            disabled={groups.length === 0}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40"
            title="کپی گزارش کامل آیدی‌ها تفکیک‌شده بر اساس نام هر دسته"
          >
            {copiedReportNotice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5 text-cyan-400" />}
            {copiedReportNotice ? 'گزارش کپی شد!' : 'کپی دسته‌بندی‌شده 📊'}
          </button>

          <button
            onClick={handleCopyAllHandles}
            disabled={filteredGroups.length === 0}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40"
          >
            {copiedAllHandles ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            {copiedAllHandles ? 'کپی شد!' : 'کپی آیدی‌های لیست'}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredGroups.length === 0}
            className="px-3 py-2 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>

          {onOpenPurgeModal && (
            <button
              onClick={onOpenPurgeModal}
              className="px-3 py-2 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-800/60 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="خروج خودکار از تمام گروه‌ها و کانال‌ها"
            >
              <LogOut className="w-3.5 h-3.5 text-purple-400" />
              خلوت‌سازی 🧹
            </button>
          )}

          {groups.length > 0 && (
            <button
              onClick={onClearGroups}
              className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-xl text-xs font-medium transition-all flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Live Bulk Probe Progress Overlay Banner */}
      {probeProgress?.isProbing && (
        <div className="bg-slate-950 border border-cyan-800/80 rounded-2xl p-4 shadow-xl space-y-3 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-cyan-500 to-emerald-500"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30 animate-pulse">
                <Zap className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  تست ضربتی و بررسی موانع گروه‌ها در حال اجرا...
                  <span className="text-xs text-cyan-400 font-mono">({probeProgress.probedCount} از {probeProgress.totalGroups})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{probeProgress.statusMessage}</p>
              </div>
            </div>

            {onStopBulkProbe && (
              <button
                onClick={onStopBulkProbe}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
              >
                <XCircle className="w-3.5 h-3.5" />
                توقف تست ضربتی
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${probeProgress.totalGroups > 0 ? (probeProgress.probedCount / probeProgress.totalGroups) * 100 : 0}%` }}
            ></div>
          </div>

          {/* Live Breakdown Stats */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
            <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-lg font-mono">
              🟢 ارسال آزاد: {probeProgress.freeSendCount}
            </span>
            <span className="bg-purple-950/60 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded-lg font-mono">
              📢 قفل کانال: {probeProgress.forceChannelCount}
            </span>
            <span className="bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-lg font-mono">
              🤖 کاپچا: {probeProgress.botCaptchaCount}
            </span>
            <span className="bg-red-950/60 text-red-300 border border-red-800/60 px-2 py-0.5 rounded-lg font-mono">
              👥 ادد اجباری: {probeProgress.forceAddCount}
            </span>
            <span className="bg-orange-950/60 text-orange-300 border border-orange-800/60 px-2 py-0.5 rounded-lg font-mono">
              ⏱️ تاخیر/کند: {probeProgress.slowModeCount}
            </span>
            <span className="bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-lg font-mono">
              🔒 فقط خواندنی: {probeProgress.readOnlyCount}
            </span>
          </div>
        </div>
      )}

      {/* Feature 1 & 2: Barrier Categorization Filter Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            دسته‌بندی گروه‌ها بر اساس نوع مانع ارسال پیام:
          </span>

          {/* Feature 2: Dedicated Copy Button for Currently Selected Category */}
          <button
            onClick={() => handleCopyCategoryHandles(selectedCategory)}
            disabled={activeCategoryCount === 0}
            className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40"
          >
            {copiedCategoryNotice === selectedCategory ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            {copiedCategoryNotice === selectedCategory ? 'آیدی‌ها کپی شدند!' : `کپی آیدی‌های دسته «${currentCategoryObj?.label}» (${activeCategoryCount} آیدی) 📋`}
          </button>
        </div>

        {/* Categories Pills Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {BARRIER_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = cat.id === 'ALL'
              ? groups.length
              : (cat.id === 'UNKNOWN' ? (categoryCounts['UNKNOWN'] || 0) : (categoryCounts[cat.id] || 0));
            const isActive = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-950/40'
                    : 'bg-slate-950 hover:bg-slate-800/80 text-slate-300 border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : cat.color}`} />
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-cyan-700 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feature: Topic / Keyword Filter Chips */}
        {uniqueKeywords.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                فیلتر موضوعی / حوزه کلمه کلیدی:
              </span>
              {selectedKeyword && (
                <button
                  onClick={() => setSelectedKeyword(null)}
                  className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                >
                  نمایش همه موضوعات
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedKeyword(null)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer shrink-0 border ${
                  selectedKeyword === null
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border-slate-800'
                }`}
              >
                همه موضوعات ({groups.length})
              </button>
              {uniqueKeywords.map((kw) => {
                const kwCount = groups.filter(g => g.foundByKeyword === kw).length;
                const isSelected = selectedKeyword === kw;
                return (
                  <button
                    key={kw}
                    onClick={() => setSelectedKeyword(isSelected ? null : kw)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                      isSelected
                        ? 'bg-cyan-600 text-white font-bold border-cyan-400 shadow-md shadow-cyan-950/40'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <span>#{kw}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900 text-slate-400 font-mono border border-slate-800">
                      {kwCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در عنوان، آیدی یا کلمه کلیدی..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
          />
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 shrink-0">مرتب‌سازی:</span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="members">بیشترین اعضا</option>
            <option value="safety">بالاترین امتیاز ایمنی</option>
            <option value="newest">جدیدترین کشف شده</option>
          </select>
        </div>
      </div>

      {/* Group Cards Grid */}
      {filteredGroups.length === 0 ? (
        <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Filter className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-slate-300 font-bold text-sm">هیچ گروهی در این دسته‌بندی یافت نشد</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            برای گروه مورد نظر یا فیلتر دسته‌بندی فعلی نتیجه‌ای وجود ندارد. می‌توانید دکمه «تست ضربتی تمامی گروه‌ها ⚡» را بزنید تا گروه‌های کشف‌شده جدید آنالیز شوند.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 shadow-md hover:shadow-cyan-950/20 flex flex-col justify-between space-y-3"
            >
              <div>
                {/* Top Badge Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-0.5 rounded-full font-mono">
                    #{group.foundByKeyword}
                  </span>

                  {group.barrierType === 'FREE_SEND' ? (
                    <span className="flex items-center gap-1 text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-2 py-0.5 rounded-full font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ارسال کاملاً آزاد
                    </span>
                  ) : group.barrierType === 'FORCE_CHANNEL_JOIN' ? (
                    <span className="flex items-center gap-1 text-[11px] bg-purple-950/80 text-purple-300 border border-purple-700/80 px-2 py-0.5 rounded-full font-bold">
                      <ExternalLink className="w-3 h-3 text-purple-400" /> قفل کانال اسپانسر
                    </span>
                  ) : group.barrierType === 'BOT_CAPTCHA' ? (
                    <span className="flex items-center gap-1 text-[11px] bg-amber-950/80 text-amber-300 border border-amber-700/80 px-2 py-0.5 rounded-full font-bold">
                      <Bot className="w-3 h-3 text-amber-400" /> کاپپچادار (ربات)
                    </span>
                  ) : group.barrierType === 'FORCE_ADD_MEMBERS' ? (
                    <span className="flex items-center gap-1 text-[11px] bg-red-950/80 text-red-300 border border-red-700/80 px-2 py-0.5 rounded-full font-bold">
                      <UserPlus className="w-3 h-3 text-red-400" /> نیازمند ادد مخاطب
                    </span>
                  ) : group.barrierType === 'SLOW_MODE' ? (
                    <span className="flex items-center gap-1 text-[11px] bg-orange-950/80 text-orange-300 border border-orange-700/80 px-2 py-0.5 rounded-full font-bold">
                      <Clock className="w-3 h-3 text-orange-400" /> حالت کند (تاخیر)
                    </span>
                  ) : group.barrierType === 'READ_ONLY' ? (
                    <span className="flex items-center gap-1 text-[11px] bg-slate-900 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
                      <Lock className="w-3 h-3 text-slate-400" /> فقط خواندنی
                    </span>
                  ) : group.canSendMessages ? (
                    <span className="flex items-center gap-1 text-[11px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-medium">
                      <CheckCircle2 className="w-3 h-3" /> ارسال اولیه آزاد
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] bg-amber-950/60 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded-full font-medium">
                      <XCircle className="w-3 h-3" /> ارسال پیام قفل
                    </span>
                  )}
                </div>

                {/* Group Title */}
                <h3
                  onClick={() => onSelectGroup(group)}
                  className="font-bold text-white text-sm hover:text-cyan-400 cursor-pointer transition-colors line-clamp-1"
                >
                  {group.title}
                </h3>

                {/* Username handle */}
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-1">
                  <span>{group.username}</span>
                  <button
                    onClick={() => handleCopyHandle(group.username)}
                    className="text-slate-500 hover:text-cyan-400 p-0.5 transition-colors"
                    title="کپی آیدی"
                  >
                    {copiedHandle === group.username ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400/80 mt-2 line-clamp-2 leading-relaxed">
                  {group.description || 'بدون توضیحات اضافی'}
                </p>

                {/* Smart Barrier details if probed */}
                {group.barrierDetails && (
                  <div className="mt-2.5 bg-slate-900/90 border border-slate-800 rounded-xl p-2 text-[11px] text-cyan-200 flex items-start gap-1.5 leading-snug">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">{group.barrierDetails}</span>
                      {group.autoCleaned && (
                        <span className="text-[10px] text-emerald-400 block mt-0.5 flex items-center gap-1">
                          <Check className="w-3 h-3" /> خروج فوری انجام شد (صفحه تلگرام شما خلوت ماند 🧹)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Metrics & Actions */}
              <div className="pt-3 border-t border-slate-900 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono font-medium">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      {group.membersCount.toLocaleString('fa-IR')}
                    </span>
                    <span className="text-[10px] bg-slate-900 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                      ایمنی: {group.safetyScore}٪
                    </span>
                  </div>

                  <a
                    href={group.link}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-all flex items-center gap-1 text-[10px]"
                    title="مشاهده در تلگرام"
                  >
                    <ExternalLink className="w-3 h-3" />
                    تلگرام
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleProbe(group)}
                    disabled={probingId === group.id}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    {probingId === group.id ? 'در حال تست...' : 'تست ضربتی مانع 🔍'}
                  </button>

                  <button
                    onClick={() => handleSafeJoin(group)}
                    disabled={group.joined || joiningId === group.id}
                    className={`px-2.5 py-1.5 rounded-xl font-bold text-[10px] transition-all flex items-center justify-center gap-1 ${
                      group.joined
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 cursor-default'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
                    }`}
                  >
                    {joiningId === group.id ? 'در حال عضویت...' : group.joined ? 'عضو شده ✅' : 'عضویت دائم'}
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Mass Purge */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 dir-rtl">
            <div className="flex items-center gap-3 text-purple-400 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/30">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-base">تایید نهایی خروج و پاکسازی چت‌های تلگرام</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              آیا ۱۰۰٪ اطمینان دارید که می‌خواهید به صورت خودکار از <strong>تمامی گروه و کانال‌های تلگرام</strong> عضو شده خارج شوید؟
            </p>

            <div className="bg-purple-950/50 border border-purple-800/60 rounded-xl p-3 text-[11px] text-purple-200 space-y-1">
              <span className="font-bold block">💡 چرا این ابزار مفید است؟</span>
              <span>
                این عمل باعث می‌شود تا صفحه پیام‌های تلگرام شما از چت‌های متعدد خلوت شده و اکانت شما کاملاً پاکیزه و بدون شلوغی بماند.
              </span>
            </div>

            {purgeResult && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{purgeResult}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPurgeModal(false)}
                disabled={isPurging}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-all"
              >
                انصراف
              </button>

              <button
                onClick={handleExecutePurge}
                disabled={isPurging}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isPurging ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    در حال خروج ایمن...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    بله، خارج شو و خلوت کن 🧹
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
