import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { TelegramAuthCard } from './components/TelegramAuthCard';
import { KeywordSearchPanel } from './components/KeywordSearchPanel';
import { LiveTerminalLogger } from './components/LiveTerminalLogger';
import { GroupDatabaseGrid } from './components/GroupDatabaseGrid';
import { SafetyGuidelinesHub } from './components/SafetyGuidelinesHub';
import { GroupDetailModal } from './components/GroupDetailModal';
import { PurgeModal } from './components/PurgeModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { 
  AuthStep, 
  TelegramUser, 
  SearchSettings, 
  SearchProgress, 
  GroupInfo, 
  ProbeBatchProgress 
} from './types';
import { MOCK_DISCOVERED_GROUPS } from './utils/mockData';
import { Database, Save, Download, Upload, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [authStep, setAuthStep] = useState<AuthStep>('disconnected');
  const [userProfile, setUserProfile] = useState<TelegramUser | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'groups' | 'auth' | 'safety'>('search');
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [isQuickDownloading, setIsQuickDownloading] = useState(false);

  const quickFileInputRef = useRef<HTMLInputElement>(null);

  const [probeBatchProgress, setProbeBatchProgress] = useState<ProbeBatchProgress>({
    isProbing: false,
    totalGroups: 0,
    probedCount: 0,
    currentTitle: '',
    currentUsername: '',
    statusMessage: 'آماده برای تست ضربتی',
    freeSendCount: 0,
    forceChannelCount: 0,
    botCaptchaCount: 0,
    forceAddCount: 0,
    slowModeCount: 0,
    readOnlyCount: 0,
    unknownCount: 0,
    isCompleted: false
  });

  // Search Settings with JSON disk file & LocalStorage persistence
  const [settings, setSettings] = useState<SearchSettings>(() => {
    try {
      const saved = localStorage.getItem('telegram_search_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      keywords: ['برنامه نویسی', 'پایتون', 'ترید', 'طراحی وب', 'استارتاپ'],
      minMembers: 50,
      onlyCanSendMessages: true,
      delayBetweenRequestsMin: 5,
      delayBetweenRequestsMax: 15,
      maxGroupsPerKeyword: 20,
      autoJoin: false,
      maxDailyJoins: 10,
      safeMode: true,
      searchDepth: 'deep'
    };
  });

  // Fetch settings from server data/app_storage.json on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/telegram/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (e) {}
  };

  // Save settings to LocalStorage and server app_storage.json when changed
  useEffect(() => {
    try {
      localStorage.setItem('telegram_search_settings', JSON.stringify(settings));
      // Sync with server disk storage
      fetch('/api/telegram/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      }).catch(() => {});
    } catch (e) {}
  }, [settings]);

  // Search Progress State
  const [progress, setProgress] = useState<SearchProgress>({
    isSearching: false,
    currentKeyword: '',
    completedKeywords: 0,
    totalKeywords: 0,
    totalFound: 0,
    validGroupsCount: 0,
    statusMessage: 'آماده برای شروع',
    floodWaitSeconds: 0,
    requestsMade: 0,
    dailyJoinsCount: 0,
    logs: [
      {
        id: 'init-1',
        timestamp: new Date().toLocaleTimeString('fa-IR'),
        level: 'info',
        message: 'سامانه کاوشگر گروه‌های عمومی تلگرام به همراه پروتکل ایمنی Anti-Flood بارگذاری گردید.'
      }
    ]
  });

  const [groups, setGroups] = useState<GroupInfo[]>(MOCK_DISCOVERED_GROUPS);
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Poll backend status on mount
  useEffect(() => {
    checkTelegramStatus();
    fetchGroups();
  }, []);

  // Poll search progress during active search
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (progress.isSearching) {
      interval = setInterval(() => {
        pollProgress();
        fetchGroups();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [progress.isSearching]);

  // Poll probe progress during active bulk probe
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (probeBatchProgress.isProbing) {
      interval = setInterval(() => {
        pollProbeProgress();
        fetchGroups();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [probeBatchProgress.isProbing]);

  const pollProbeProgress = async () => {
    try {
      const res = await fetch('/api/telegram/probe-progress');
      const data = await res.json();
      if (data) {
        setProbeBatchProgress(data);
      }
    } catch (e) {}
  };

  const checkTelegramStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      if (data.success && data.status) {
        if (data.status.isConnected) {
          setAuthStep('connected');
          setUserProfile(data.user);
        }
      }
    } catch (e) {
      console.warn('Backend polling notice:', e);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/telegram/groups');
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setGroups(data.groups);
      }
    } catch (e) {
      console.warn('Fetch groups notice:', e);
    }
  };

  const pollProgress = async () => {
    try {
      const res = await fetch('/api/telegram/search/progress');
      const data = await res.json();
      if (data.success && data.progress) {
        setProgress(data.progress);
      }
    } catch (e) {
      console.warn('Poll progress notice:', e);
    }
  };

  // Auth Handlers
  const handleConnectApi = async (apiId: string, apiHash: string, sessionString?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiId, apiHash, sessionString })
      });
      const data = await res.json();
      if (data.success) {
        if (data.connected) {
          setAuthStep('connected');
          checkTelegramStatus();
        } else {
          setAuthStep('phone_required');
        }
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || data.error || 'خطا در اتصال به API' };
    } catch (e: any) {
      return { success: false, message: e.message || 'خطا در ارتباط با سرور' };
    }
  };

  const handleSendCode = async (phoneNumber: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/telegram/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await res.json();
      if (data.success) {
        setAuthStep('code_required');
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || data.error || 'خطا در ارسال کد' };
    } catch (e: any) {
      return { success: false, message: e.message || 'خطا در ارتباط با سرور' };
    }
  };

  const handleVerifyCode = async (phoneCode: string, password?: string): Promise<{ success: boolean; is2FA?: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/telegram/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneCode, password })
      });
      const data = await res.json();
      if (data.success) {
        setAuthStep('connected');
        checkTelegramStatus();
        return { success: true };
      }
      if (data.message === '2FA_REQUIRED') {
        setAuthStep('password_required');
        return { success: false, is2FA: true, message: 'حساب شما دارای رمز عبور تایید دو مرحله‌ای (2FA) است. لطفاً رمز عبور را وارد کنید.' };
      }
      return { success: false, message: data.message || 'کد وارد شده معتبر نیست یا منقضی شده است' };
    } catch (e: any) {
      return { success: false, message: e.message || 'خطا در ارتباط با سرور' };
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/telegram/disconnect', { method: 'POST' });
    } catch (e) {}
    setAuthStep('disconnected');
    setUserProfile(null);
  };

  const handleRunDemo = () => {
    setActiveTab('search');
  };

  // Search Controls
  const handleStartSearch = async () => {
    try {
      const res = await fetch('/api/telegram/search/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      const data = await res.json();
      if (data.success) {
        setProgress(prev => ({ ...prev, isSearching: true }));
      }
    } catch (e) {
      console.error("Start search error:", e);
    }
  };

  const handleStopSearch = async () => {
    try {
      await fetch('/api/telegram/search/stop', { method: 'POST' });
      setProgress(prev => ({ ...prev, isSearching: false }));
    } catch (e) {}
  };

  const handleClearGroups = async () => {
    try {
      await fetch('/api/telegram/groups/clear', { method: 'POST' });
    } catch (e) {}
    setGroups([]);
  };

  const handleJoinGroup = async (usernameOrLink: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/telegram/group/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrLink })
      });
      const data = await res.json();
      fetchGroups();
      return data.success;
    } catch (e) {
      return false;
    }
  };

  const handleProbeGroup = async (usernameOrLink: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/telegram/group/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrLink })
      });
      const data = await res.json();
      fetchGroups();
      return data.success;
    } catch (e) {
      return false;
    }
  };

  const handleLeaveAllGroups = async (): Promise<{ success: boolean; count?: number; message?: string }> => {
    try {
      const res = await fetch('/api/telegram/leave-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      fetchGroups();
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || 'خطا در ارتباط با سرور' };
    }
  };

  const handleStartBulkProbe = async (onlyUnprobed = false): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/telegram/groups/probe-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyUnprobed })
      });
      const data = await res.json();
      if (data.success) {
        setProbeBatchProgress(prev => ({ ...prev, isProbing: true }));
        pollProbeProgress();
      }
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || 'خطا در ارتباط با سرور' };
    }
  };

  const handleStopBulkProbe = async () => {
    try {
      await fetch('/api/telegram/probe-stop', { method: 'POST' });
      setProbeBatchProgress(prev => ({ ...prev, isProbing: false }));
    } catch (e) {}
  };

  // AI Keyword Expansion
  const handleExpandAiKeywords = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/expand-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: settings.keywords })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.keywords)) {
        setSettings(prev => ({ ...prev, keywords: data.keywords }));
      }
    } catch (e) {
      console.error("AI Expansion Error:", e);
    } finally {
      setAiLoading(false);
    }
  };

  // Full Refresh handler
  const handleFullRefresh = async () => {
    await fetchGroups();
    await fetchSettings();
    await checkTelegramStatus();
  };

  // 1. Quick Save 100% Snapshot Handler
  const handleQuickSave = async () => {
    setIsQuickSaving(true);
    try {
      const res = await fetch('/api/telegram/backup/save', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToastMessage({ type: 'success', text: data.message || 'تمامی اطلاعات ۱۰۰٪ در سرور ذخیره و فریز شدند 💾' });
      } else {
        setToastMessage({ type: 'error', text: data.error || 'خطا در ذخیره‌سازی داده‌ها' });
      }
    } catch (e: any) {
      setToastMessage({ type: 'error', text: e.message || 'خطا در ارتباط با سرور' });
    } finally {
      setIsQuickSaving(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // 2. Quick Download JSON Backup Handler
  const handleQuickDownload = async () => {
    setIsQuickDownloading(true);
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

      setToastMessage({ type: 'success', text: 'فایل پشتیبان JSON با موفقیت تولید و دانلود شد ⬇️' });
    } catch (e: any) {
      setToastMessage({ type: 'error', text: e.message || 'خطا در دانلود فایل پشتیبان' });
    } finally {
      setIsQuickDownloading(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // 3. Quick Upload / Restore Backup Handler
  const handleQuickUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          setToastMessage({ type: 'success', text: data.message || 'پشتیبان با موفقیت ۱۰۰٪ بازگردانی شد ✅' });
          await handleFullRefresh();
        } else {
          setToastMessage({ type: 'error', text: data.error || 'خطا در بازگردانی پشتیبان' });
        }
      } catch (err: any) {
        setToastMessage({ type: 'error', text: 'فایل انتخاب‌شده یک JSON معتبر نیست.' });
      } finally {
        if (quickFileInputRef.current) quickFileInputRef.current.value = '';
        setTimeout(() => setToastMessage(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased dir-rtl selection:bg-cyan-500 selection:text-white">
      
      {/* Hidden file input for quick restore */}
      <input
        ref={quickFileInputRef}
        type="file"
        accept=".json"
        onChange={handleQuickUploadFile}
        className="hidden"
      />

      {/* Top Header Navbar */}
      <Navbar
        authStep={authStep}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        groupsCount={groups.length}
        isSearching={progress.isSearching}
        userPhone={userProfile?.phone}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
      />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-bold ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-300 shadow-emerald-950/50'
              : 'bg-red-950/90 border-red-800 text-red-300 shadow-red-950/50'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Prominent Quick Backup & Restore Three-Button Action Hub */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">مرکز فریز، پشتیبان‌گیری و بازیابی داده‌ها</h2>
                <span className="text-[10px] bg-slate-800 text-cyan-300 px-2 py-0.5 rounded-full font-mono border border-slate-700">
                  {groups.length} گروه | {settings.keywords.length} کلیدواژه
                </span>
              </div>
              <p className="text-xs text-slate-400">
                قبل از خروج یا خاموش کردن اپ، از این سه دکمه برای فریز ۱۰۰٪ و بازیابی سریع وضعیت استفاده کنید:
              </p>
            </div>
          </div>

          {/* The 3 Core Buttons Requested by User */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            
            {/* Button 1: Save 100% */}
            <button
              onClick={handleQuickSave}
              disabled={isQuickSaving}
              className="flex-1 sm:flex-none py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold border border-slate-700 hover:border-cyan-500/60 flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              title="ذخیره‌سازی کامل وضعیت در دیسک"
            >
              {isQuickSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Save className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>ذخیره‌سازی ۱۰۰٪ کل اطلاعات</span>
            </button>

            {/* Button 2: Download Backup JSON */}
            <button
              onClick={handleQuickDownload}
              disabled={isQuickDownloading}
              className="flex-1 sm:flex-none py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/30 active:scale-95"
              title="دانلود فایل JSON حاوی تمامی گروه‌ها، نشست تلگرام و تنظیمات"
            >
              {isQuickDownloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Download className="w-3.5 h-3.5 text-white" />
              )}
              <span>دانلود پشتیبان (JSON)</span>
            </button>

            {/* Button 3: Restore Backup */}
            <button
              onClick={() => quickFileInputRef.current?.click()}
              className="flex-1 sm:flex-none py-2 px-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-900/30 active:scale-95"
              title="آپلود فایل JSON پشتیبان و بازگردانی فوری تمام اطلاعات"
            >
              <Upload className="w-3.5 h-3.5 text-white" />
              <span>بازیابی پشتیبان</span>
            </button>

            {/* Advanced Modal Trigger */}
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 text-xs transition-all"
              title="مشاهده جزئیات و پیش‌نمایش فایل پشتیبان"
            >
              <Database className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {activeTab === 'search' && (
          <div className="space-y-8 animate-fade-in">
            {/* Keyword Search Control Panel */}
            <KeywordSearchPanel
              settings={settings}
              setSettings={setSettings}
              isSearching={progress.isSearching}
              onStartSearch={handleStartSearch}
              onStopSearch={handleStopSearch}
              onExpandAiKeywords={handleExpandAiKeywords}
              aiLoading={aiLoading}
            />

            {/* Real-time Terminal Log Console */}
            <LiveTerminalLogger
              progress={progress}
              onClearLogs={() => setProgress(prev => ({ ...prev, logs: [] }))}
            />

            {/* Recent Discovered Groups Preview */}
            <GroupDatabaseGrid
              groups={groups}
              onJoinGroup={handleJoinGroup}
              onProbeGroup={handleProbeGroup}
              onStartBulkProbe={handleStartBulkProbe}
              onStopBulkProbe={handleStopBulkProbe}
              probeProgress={probeBatchProgress}
              onClearGroups={handleClearGroups}
              onLeaveAllGroups={handleLeaveAllGroups}
              onOpenPurgeModal={() => setIsPurgeModalOpen(true)}
              onSelectGroup={(g) => setSelectedGroup(g)}
            />
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="animate-fade-in">
            <GroupDatabaseGrid
              groups={groups}
              onJoinGroup={handleJoinGroup}
              onProbeGroup={handleProbeGroup}
              onStartBulkProbe={handleStartBulkProbe}
              onStopBulkProbe={handleStopBulkProbe}
              probeProgress={probeBatchProgress}
              onClearGroups={handleClearGroups}
              onLeaveAllGroups={handleLeaveAllGroups}
              onOpenPurgeModal={() => setIsPurgeModalOpen(true)}
              onSelectGroup={(g) => setSelectedGroup(g)}
            />
          </div>
        )}

        {activeTab === 'auth' && (
          <div className="animate-fade-in">
            <TelegramAuthCard
              authStep={authStep}
              userProfile={userProfile}
              onConnectApi={handleConnectApi}
              onSendCode={handleSendCode}
              onVerifyCode={handleVerifyCode}
              onDisconnect={handleDisconnect}
              onRunDemo={handleRunDemo}
            />
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="animate-fade-in">
            <SafetyGuidelinesHub onOpenPurgeModal={() => setIsPurgeModalOpen(true)} />
          </div>
        )}

      </main>

      {/* Detail Modal */}
      <GroupDetailModal
        group={selectedGroup}
        onClose={() => setSelectedGroup(null)}
        onJoinGroup={handleJoinGroup}
      />

      {/* Comprehensive Purge Modal */}
      <PurgeModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        onRefreshData={fetchGroups}
      />

      {/* 100% Full Freeze, Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        groupsCount={groups.length}
        keywordsCount={settings.keywords.length}
        isConnected={authStep === 'connected'}
        userPhone={userProfile?.phone}
        onRefreshData={handleFullRefresh}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 font-mono">
        پروژه ربات هوشمند کاوشگر تلگرام با پشتیبانی از GramJS MTProto و پایش عدم فیلتر و Flood.
      </footer>

    </div>
  );
}
