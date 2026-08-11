import React, { useState } from 'react';
import { Key, Phone, Lock, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, ExternalLink, RefreshCw, Copy, Check, Info } from 'lucide-react';
import { AuthStep, TelegramUser } from '../types';
import { normalizePersianDigits, cleanPhoneCode, cleanPhoneNumber } from '../utils/numberUtils';

interface TelegramAuthCardProps {
  authStep: AuthStep;
  userProfile: TelegramUser | null;
  onConnectApi: (apiId: string, apiHash: string, sessionString?: string) => Promise<{ success: boolean; message?: string }>;
  onSendCode: (phone: string) => Promise<{ success: boolean; message?: string }>;
  onVerifyCode: (code: string, password?: string) => Promise<{ success: boolean; is2FA?: boolean; message?: string }>;
  onDisconnect: () => void;
  onRunDemo: () => void;
}

export const TelegramAuthCard: React.FC<TelegramAuthCardProps> = ({
  authStep,
  userProfile,
  onConnectApi,
  onSendCode,
  onVerifyCode,
  onDisconnect,
  onRunDemo,
}) => {
  const [apiId, setApiId] = useState<string>('');
  const [apiHash, setApiHash] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [phoneCode, setPhoneCode] = useState<string>('');
  const [twoFactorPass, setTwoFactorPass] = useState<string>('');
  const [sessionStr, setSessionStr] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  const handleStep1Connect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = normalizePersianDigits(apiId).trim();
    const cleanHash = apiHash.trim();
    if (!cleanId || !cleanHash) {
      setErrorMessage('لطفاً هر دو مقادیر API_ID و API_HASH را وارد کنید.');
      return;
    }
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await onConnectApi(cleanId, cleanHash, sessionStr.trim());
      if (!res.success) {
        setErrorMessage(res.message || 'برقراری ارتباط با API تلگرام ناموفق بود.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در اتصال به API');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2SendPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedPhone = cleanPhoneNumber(phoneNumber);
    if (!formattedPhone || formattedPhone.length < 10) {
      setErrorMessage('شماره تلفن اکانت تلگرام را با پیش‌شماره کشور وارد کنید (مثال: +989123456789 یا 09123456789)');
      return;
    }
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await onSendCode(formattedPhone);
      if (!res.success) {
        setErrorMessage(res.message || 'ارسال کد تایید با خطا مواجه شد.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در ارسال کد');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedCode = cleanPhoneCode(phoneCode);
    if (!cleanedCode || cleanedCode.length < 5) {
      setErrorMessage('کد تایید ۵ یا ۶ رقمی ارسال شده به تلگرام را وارد کنید.');
      return;
    }
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await onVerifyCode(cleanedCode, twoFactorPass);
      if (!res.success) {
        if (res.is2FA) {
          setErrorMessage(res.message || 'حساب شما دارای رمز عبور تایید دو مرحله‌ای (2FA) است. لطفاً رمز عبور را وارد کنید.');
        } else {
          setErrorMessage(res.message || 'کد وارد شده معتبر نیست یا منقضی شده است.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در تایید کد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400">
              <Key className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">تنظیمات و اتصال به API_ID و API_HASH تلگرام</h2>
              <p className="text-sm text-slate-400 mt-1">
                جهت متصل کردن کاوشگر به حساب شخصی تلگرام و شروع شخم‌زدن گروه‌های عمومی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              راهنمای دریافت API_ID
            </button>
            <button
              onClick={onRunDemo}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-medium border border-cyan-500/30 transition-all"
            >
              امتحان در حالت دمو (بدون ورود)
            </button>
          </div>
        </div>

        {/* Instructions Collapsible Panel */}
        {showInstructions && (
          <div className="mt-6 pt-6 border-t border-slate-800 text-sm text-slate-300 space-y-3 bg-slate-950/60 p-4 rounded-xl border">
            <h3 className="font-bold text-cyan-300 flex items-center gap-2">
              <Info className="w-4 h-4" />
              چگونه API_ID و API_HASH دریافت کنیم؟ (رایگان و رسمی از خود تلگرام)
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-400 leading-relaxed">
              <li>به سایت رسمی تلگرام به آدرس <a href="https://my.telegram.org" target="_blank" rel="noreferrer" className="text-cyan-400 underline inline-flex items-center gap-1">my.telegram.org <ExternalLink className="w-3 h-3" /></a> مراجعه کنید.</li>
              <li>شماره تلفن حساب تلگرام خود را وارد کرده و کد تایید ارسال‌شده در تلگرام را وارد کنید.</li>
              <li>به بخش <strong className="text-slate-200">API development tools</strong> بروید.</li>
              <li>یک عنوان دلخواه (مثلاً MyUserBot) برای App Title و Short Name وارد کرده و فرم را ثبت کنید.</li>
              <li>مقادیر <strong className="text-cyan-400 font-mono">App api_id</strong> (عدد) و <strong className="text-cyan-400 font-mono">App api_hash</strong> (رشته کد) را کپی کرده و در فرم زیر جای‌گذاری نمایید.</li>
            </ol>
          </div>
        )}
      </div>

      {/* Connected Account View */}
      {authStep === 'connected' && userProfile && (
        <div className="bg-slate-900 border border-emerald-800/60 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg">
                {userProfile.firstName.charAt(0) || 'T'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{userProfile.firstName} {userProfile.lastName}</h3>
                  <span className="flex items-center gap-1 bg-emerald-950 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full border border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" /> متصل و آماده
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  @{userProfile.username || 'بدون_آیدی'} | {userProfile.phone}
                </p>
              </div>
            </div>

            <button
              onClick={onDisconnect}
              className="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 rounded-xl text-xs font-medium transition-all"
            >
              قطع اتصال اکانت
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400">وضعیت سشن (Session)</span>
              <p className="text-emerald-400 font-medium">ذخیره‌شده و فعال در سرور</p>
            </div>
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400">سطح ایمنی الگوریتم</span>
              <p className="text-cyan-400 font-medium">پروتکل ضدمسدودی فعال (Anti-Flood)</p>
            </div>
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400">دستور آماده به کار</span>
              <p className="text-slate-200 font-medium">آماده دریافت کلمات کلیدی</p>
            </div>
          </div>
        </div>
      )}

      {/* Auth Setup Wizard Form */}
      {authStep !== 'connected' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 bg-red-950/50 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: API_ID & API_HASH */}
          {authStep === 'disconnected' && (
            <form onSubmit={handleStep1Connect} className="space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="font-bold text-white text-sm">مرحله ۱: ورود اطلاعات API تلگرام</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    API ID (شناسه برنامه‌نویسی)
                  </label>
                  <input
                    type="number"
                    value={apiId}
                    onChange={(e) => setApiId(e.target.value)}
                    placeholder="مثال: 12345678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    API HASH (کد رمز گذاری)
                  </label>
                  <input
                    type="text"
                    value={apiHash}
                    onChange={(e) => setApiHash(e.target.value)}
                    placeholder="مثال: a1b2c3d4e5f6g7h8..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
                  />
                </div>
              </div>

              {/* Optional existing Session String input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  String Session (اختیاری - در صورت داشتن سشن قبلی)
                </label>
                <input
                  type="text"
                  value={sessionStr}
                  onChange={(e) => setSessionStr(e.target.value)}
                  placeholder="اگر قبلا سشن تلگرام دریافت کرده‌اید کپی کنید..."
                  className="w-full bg-slate-950 border border-slate-800/80 rounded-xl px-3.5 py-2 text-xs text-slate-300 font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onRunDemo}
                  className="text-xs text-slate-400 hover:text-cyan-400 underline transition-all"
                >
                  ورود بدون اکانت (حالت کاوشگر دمو)
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-900/30 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  اتصال اولیه به API تلگرام
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: PHONE NUMBER */}
          {(authStep === 'phone_required' || authStep === 'code_required' || authStep === 'password_required') && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-xs font-bold">2</span>
                <h3 className="font-bold text-white text-sm">مرحله ۲: شماره تلفن و کد ورود تلگرام</h3>
              </div>

              {authStep === 'phone_required' && (
                <form onSubmit={handleStep2SendPhone} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-cyan-400" />
                      شماره تلفن همراه (همراه با پیش‌شماره کشور)
                    </label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+989123456789"
                      dir="ltr"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all text-left"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    ارسال کد تایید به پیام‌رسان تلگرام
                  </button>
                </form>
              )}

              {/* STEP 3: CODE & 2FA */}
              {(authStep === 'code_required' || authStep === 'password_required') && (
                <form onSubmit={handleStep3Verify} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                        کد تایید ۵ یا ۶ رقمی ارسال شده در تلگرام
                      </label>
                      <span className="text-[10px] text-cyan-400">اعداد فارسی به طور خودکار انگلیسی می‌شوند</span>
                    </div>
                    <input
                      type="text"
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                      placeholder="12345"
                      dir="ltr"
                      maxLength={7}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-center text-lg tracking-widest text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
                    />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      💡 نکته مهم: اگر چند کد در تلگرام دریافت کرده‌اید، حتماً آخرین و جدیدترین کد ارسال شده را وارد کنید.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      رمز عبور دو مرحله‌ای / 2FA (اگر تایید دو مرحله‌ای فعال است)
                    </label>
                    <input
                      type="password"
                      value={twoFactorPass}
                      onChange={(e) => setTwoFactorPass(e.target.value)}
                      placeholder="رمز ورود دو مرحله‌ای تلگرام"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                    تایید نهایی و ورود به اکانت
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
