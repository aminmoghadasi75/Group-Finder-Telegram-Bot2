import React from 'react';
import { Bot, ShieldCheck, ShieldAlert, Key, Sparkles, RefreshCw } from 'lucide-react';
import { AuthStep } from '../types';

interface NavbarProps {
  authStep: AuthStep;
  activeTab: 'search' | 'groups' | 'auth' | 'safety';
  setActiveTab: (tab: 'search' | 'groups' | 'auth' | 'safety') => void;
  groupsCount: number;
  isSearching: boolean;
  userPhone?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  authStep,
  activeTab,
  setActiveTab,
  groupsCount,
  isSearching,
  userPhone
}) => {
  const isConnected = authStep === 'connected';

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white tracking-tight">یوزربات کاوشگر تلگرام</h1>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">
                  v2.5 Anti-Flood
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                کشف هوشمند و ایمن گروه‌های عمومی تلگرام بر اساس کلمات کلیدی
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'search'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              موتور جستجو
              {isSearching && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'groups'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              گروه‌های کشف‌شده
              {groupsCount > 0 && (
                <span className="bg-slate-800 text-cyan-300 text-[11px] px-1.5 py-0.2 rounded-full border border-slate-700">
                  {groupsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('safety')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'safety'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              مرکز ایمنی و ضدمسدودی
            </button>

            <button
              onClick={() => setActiveTab('auth')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'auth'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Key className="w-4 h-4" />
              تنظیمات API & اکانت
            </button>
          </nav>

          {/* Account Connection Status Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('auth')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                isConnected
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/50'
              }`}
            >
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="hidden sm:inline">متصل به تلگرام</span>
                  <span className="font-mono text-[11px] text-emerald-400/80">{userPhone || 'اکانت فعال'}</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>حالت دمو / غیرمتصل</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Nav Menu */}
      <div className="md:hidden flex items-center justify-around bg-slate-950 border-t border-slate-800 py-2 px-2 text-xs">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'search' ? 'text-cyan-400' : 'text-slate-400'}`}
        >
          <Sparkles className="w-4 h-4" />
          <span>جستجو</span>
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex flex-col items-center gap-1 relative ${activeTab === 'groups' ? 'text-cyan-400' : 'text-slate-400'}`}
        >
          <span>گروه‌ها ({groupsCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('safety')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'safety' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>ایمنی</span>
        </button>
        <button
          onClick={() => setActiveTab('auth')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'auth' ? 'text-cyan-400' : 'text-slate-400'}`}
        >
          <Key className="w-4 h-4" />
          <span>اکانت</span>
        </button>
      </div>
    </header>
  );
};
