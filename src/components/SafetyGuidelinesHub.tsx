import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Clock, Zap, Flame, CheckCircle2, Info, HelpCircle, Lock, LogOut, Check, Sparkles } from 'lucide-react';
import { SafetyMetrics } from '../types';

interface SafetyGuidelinesHubProps {
  onOpenPurgeModal?: () => void;
}

export const SafetyGuidelinesHub: React.FC<SafetyGuidelinesHubProps> = ({ onOpenPurgeModal }) => {
  const [accountAge, setAccountAge] = useState<'fresh' | 'established' | 'aged'>('established');

  const handleExecutePurge = () => {
    if (onOpenPurgeModal) {
      onOpenPurgeModal();
    }
  };

  const getSafetyConfig = () => {
    switch (accountAge) {
      case 'fresh':
        return {
          title: 'اکانت تازه‌ساخت (زیر ۱ ماه)',
          riskColor: 'text-amber-400',
          borderColor: 'border-amber-800/60',
          bgColor: 'bg-amber-950/30',
          recommendedDelay: '۱۰ تا ۲۵ ثانیه',
          maxDailySearches: 50,
          maxDailyJoins: 3,
          advice: 'اکانت‌های تازه ساخت به شدّت زیر ذره‌بین سیستم‌های ضداسپام تلگرام قرار دارند. حتماً از تاخیرهای بلند استفاده کنید و روزانه بیش از ۳ گروه جوین نشوید.'
        };
      case 'established':
        return {
          title: 'اکانت فعال (۱ تا ۶ ماه)',
          riskColor: 'text-cyan-400',
          borderColor: 'border-cyan-800/60',
          bgColor: 'bg-cyan-950/30',
          recommendedDelay: '۵ تا ۱۵ ثانیه',
          maxDailySearches: 150,
          maxDailyJoins: 8,
          advice: 'حالت ایمن استاندار. تاخیر ۵ الی ۱۵ ثانیه‌ای میان جستجوها رفتاری مانند انسان ایجاد می‌کند و ریسک مسدودی را بسیار پایین می‌آورد.'
        };
      case 'aged':
        return {
          title: 'اکانت قدیمی و معتبر (بالای ۱ سال)',
          riskColor: 'text-emerald-400',
          borderColor: 'border-emerald-800/60',
          bgColor: 'bg-emerald-950/30',
          recommendedDelay: '۴ تا ۱۰ ثانیه',
          maxDailySearches: 300,
          maxDailyJoins: 15,
          advice: 'اکانت‌های قدیمی دارای نمره اعتبار (Trust Score) بالا در تلگرام هستند و تحمل بیشتری در برابر درخواست‌های مداوم دارند.'
        };
    }
  };

  const config = getSafetyConfig();

  return (
    <div className="space-y-6">
      
      {/* Safety Score Meter Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">مرکز پایش ایمنی و الگوریتم‌های ضدمسدودی تلگرام</h2>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  Anti-Ban 100% Guaranteed
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                دستورالعمل‌ها، حد نصاب‌های مجاز و ابزارهای خلوت‌سازی جهت جلوگیری از فیلتر، ریپورت یا شلوغی حساب تلگرام شما.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Leave & Chat Purge Section (دکمه خروج دسته‌جمعی و خلوت‌سازی تلگرام) */}
      <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border border-purple-800/50 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-500/30">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                ابزار خلوت‌سازی دائم تلگرام (پاکسازی کانال‌ها، گروه‌ها، ربات‌ها و چت‌ها)
                <span className="bg-purple-900/80 text-purple-200 border border-purple-700 text-[10px] px-2 py-0.5 rounded-full">
                  Zero Clutter 🧹
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                با این ابزار هوشمند می‌توانید تلگرام خود را از کانال‌ها، گروه‌ها، ربات‌ها و چت‌های شخصی اضافی کاملاً پاکسازی کنید. تایمر زنده و شمارنده تعداد پاکسازی‌شده در هر لحظه به شما نشان داده می‌شود.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenPurgeModal}
            className="px-5 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-900/40 flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            شروع خلوت‌سازی دائم تلگرام 🧹
          </button>
        </div>
      </div>

      {/* Account Age Safety Calculator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
          <Zap className="w-4 h-4 text-cyan-400" />
          محاسبه‌گر حد نصاب ایمن بر اساس قدمت حساب تلگرام شما
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => setAccountAge('fresh')}
            className={`p-4 rounded-xl border text-right transition-all ${
              accountAge === 'fresh'
                ? 'bg-amber-950/40 border-amber-600 text-amber-200 shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <span className="font-bold text-sm block">اکانت جدید (زیر ۱ ماه)</span>
            <span className="text-xs text-slate-500 mt-1 block">ریسک بالاتر - نیازمند احتیاط</span>
          </button>

          <button
            onClick={() => setAccountAge('established')}
            className={`p-4 rounded-xl border text-right transition-all ${
              accountAge === 'established'
                ? 'bg-cyan-950/40 border-cyan-600 text-cyan-200 shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <span className="font-bold text-sm block">اکانت متوسط (۱ الی ۶ ماه)</span>
            <span className="text-xs text-slate-500 mt-1 block">حالت متوازن و استاندارد</span>
          </button>

          <button
            onClick={() => setAccountAge('aged')}
            className={`p-4 rounded-xl border text-right transition-all ${
              accountAge === 'aged'
                ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200 shadow-md'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <span className="font-bold text-sm block">اکانت قدیمی (بالای ۱ سال)</span>
            <span className="text-xs text-slate-500 mt-1 block">نمره اعتبار بالا در تلگرام</span>
          </button>
        </div>

        {/* Dynamic Safety Parameter Display */}
        <div className={`p-5 rounded-2xl border ${config.borderColor} ${config.bgColor} space-y-4`}>
          <div className="flex items-center justify-between">
            <h4 className={`font-bold text-base ${config.riskColor}`}>{config.title}</h4>
            <span className="text-xs font-mono text-slate-300">پارامترهای پیشنهادی موتور</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">تاخیر پیشنهادی بین استعلام‌ها:</span>
              <span className="text-cyan-300 font-bold text-sm block mt-1">{config.recommendedDelay}</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">حداکثر استعلام مجاز روزانه:</span>
              <span className="text-emerald-400 font-bold text-sm block mt-1">{config.maxDailySearches} کلمه کلیدی</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[11px]">حداکثر جوین اتوماتیک روزانه:</span>
              <span className="text-amber-300 font-bold text-sm block mt-1">{config.maxDailyJoins} گروه</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed pt-1">
            💡 <strong>توصیه ایمنی:</strong> {config.advice}
          </p>
        </div>
      </div>

      {/* 5 Golden Rules of Telegram UserBot Safety */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          اصول ۵ گانه تضمین امنیت و عدم مسدودی (Zero-Ban Checklist)
        </h3>

        <div className="space-y-4 text-xs leading-relaxed">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">۱</div>
            <div>
              <h4 className="font-bold text-white text-sm">استفاده از تاخیرهای متغیر و تصادفی (Randomized Jitter)</h4>
              <p className="text-slate-400 mt-1">
                هرگز درخواست‌ها را با فاصله ثابت (مثلا دقیقا سر ۵ ثانیه) ارسال نکنید. الگوریتم این یوزربات به صورت خودکار تاخیر را بین ۵ تا ۱۵ ثانیه کم و زیاد می‌کند تا الگوی کارکرد دقیقاً مشابه حرکت دست انسان ثبت شود.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">۲</div>
            <div>
              <h4 className="font-bold text-white text-sm">مدیریت هوشمند خطای FLOOD_WAIT تلگرام</h4>
              <p className="text-slate-400 mt-1">
                اگر تلگرام پیغام محدودیت موقت (FLOOD_WAIT) صادر کرد، ربات سیستم را بلافاصله متوقف کرده و دقیقا به همان میزان ثانیه اعلان‌شده صبوری می‌کند. نادیده گرفتن این خطا بیشترین دلیل مسدودی اکانت‌هاست.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">۳</div>
            <div>
              <h4 className="font-bold text-white text-sm">عدم ارسال پیام اسپام آنی پس از جوین شدن</h4>
              <p className="text-slate-400 mt-1">
                هنگامی که در یک گروه عمومی جدید عضو می‌شوید، بلافاصله پیام تبلیغاتی یا لینک ارسال نکنید. بسیاری از گروه‌ها دارای ربات‌های Anti-Spam و ادمین‌های زنده هستند که اکانت‌های تازه‌وارد مجری پیام را سریعا Ban می‌کنند.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">۴</div>
            <div>
              <h4 className="font-bold text-white text-sm">تفکیک جستجوی عمومی از عضویت انبوه</h4>
              <p className="text-slate-400 mt-1">
                جستجو و استعلام آیدی گروه‌های عمومی در تلگرام بسیار کم‌ریسک‌تر از جوین شدن واقعی است. ابتدا صدها گروه را پیدا و ذخیره کنید، سپس در روزهای مختلف به صورت تدریجی (مثلا روزی ۵ گروه) در آن‌ها عضو شوید.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">۵</div>
            <div>
              <h4 className="font-bold text-white text-sm">عدم استفاده از حساب‌های بی‌هویت یا بدون 2FA</h4>
              <p className="text-slate-400 mt-1">
                حساب تلگرامی که برای یوزربات استفاده می‌کنید بهتر است دارای عکس پروفایل، بیوگرافی واقعی و تایید دو مرحله‌ای (2FA) باشد تا امتیاز اعتبار آن در دیتابیس‌های تلگرام حفظ گردد.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
