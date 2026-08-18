import React from 'react';
import { GroupInfo } from '../types';
import { X, ExternalLink, ShieldCheck, CheckCircle2, XCircle, Users, MessageSquare, Copy, Check, Info, Flame } from 'lucide-react';

interface GroupDetailModalProps {
  group: GroupInfo | null;
  onClose: () => void;
  onJoinGroup: (usernameOrLink: string) => Promise<boolean>;
}

export const GroupDetailModal: React.FC<GroupDetailModalProps> = ({
  group,
  onClose,
  onJoinGroup
}) => {
  const [copied, setCopied] = React.useState(false);
  const [joining, setJoining] = React.useState(false);

  if (!group) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(group.username);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      await onJoinGroup(group.username);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in dir-rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative space-y-5 p-6 text-slate-100">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 text-slate-400 hover:text-white bg-slate-950/60 rounded-full border border-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800 px-2.5 py-0.5 rounded-full font-mono">
              گروه عمومی تلگرام
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono">
              کلمه: {group.foundByKeyword}
            </span>
          </div>

          <h2 className="text-xl font-bold text-white pt-1">{group.title}</h2>
          
          <div className="flex items-center gap-2 text-sm text-cyan-400 font-mono">
            <span>{group.username}</span>
            <button
              onClick={handleCopy}
              className="text-slate-400 hover:text-cyan-300 p-1 transition-colors"
              title="کپی آیدی"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Status badges */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 block">امکان ارسال پیام:</span>
            {group.canSendMessages ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> مجاز و عمومی ✅
              </span>
            ) : (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <XCircle className="w-4 h-4" /> غیرمجاز / قفل ادمین ❌
              </span>
            )}
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-500 block">تعداد اعضا:</span>
            <span className="text-white font-mono font-bold text-sm flex items-center gap-1">
              <Users className="w-4 h-4 text-cyan-400" />
              {group.membersCount.toLocaleString('fa-IR')} عضو
            </span>
          </div>
        </div>

        {/* Group Description */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-400 block">توضیحات و درباره گروه:</span>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto">
            {group.description || 'هیچ توضیحات دیگری ثبت نشده است.'}
          </div>
        </div>

        {/* Safety Metric Rating & Factors Breakdown */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-1.5 font-bold">
              <ShieldCheck className={`w-4 h-4 ${
                group.safetyScore >= 90 ? 'text-emerald-400' :
                group.safetyScore >= 75 ? 'text-cyan-400' :
                group.safetyScore >= 60 ? 'text-amber-400' : 'text-red-400'
              }`} />
              شاخص سلامت و ایمنی گروه (Safety Rating):
            </span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
              group.safetyScore >= 90 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' :
              group.safetyScore >= 75 ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60' :
              group.safetyScore >= 60 ? 'bg-amber-950 text-amber-400 border border-amber-800/60' :
              'bg-red-950 text-red-400 border border-red-800/60'
            }`}>
              {group.safetyScore}٪ ({
                group.safetyScore >= 90 ? 'بسیار ایمن و آزاد' :
                group.safetyScore >= 75 ? 'ایمن و استاندارد' :
                group.safetyScore >= 60 ? 'دارای محدودیت / قفل' : 'ریسک بالا'
              })
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                group.safetyScore >= 90 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                group.safetyScore >= 75 ? 'bg-gradient-to-r from-cyan-500 to-blue-400' :
                group.safetyScore >= 60 ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                'bg-gradient-to-r from-red-500 to-rose-400'
              }`}
              style={{ width: `${group.safetyScore}%` }}
            ></div>
          </div>

          {/* Factors Checklist */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-emerald-400">✔</span>
              <span>بدون علامت اسپم/Fake تلگرام</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className={group.isRestricted ? "text-red-400" : "text-emerald-400"}>
                {group.isRestricted ? "✖" : "✔"}
              </span>
              <span>{group.isRestricted ? "دارای محدودیت منطقه‌ای" : "بدون ریستریکت تلگرام"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className={group.barrierType === 'FORCE_ADD_MEMBERS' ? "text-red-400" : group.barrierType === 'FORCE_CHANNEL_JOIN' ? "text-amber-400" : "text-emerald-400"}>
                {group.barrierType === 'FORCE_ADD_MEMBERS' ? "⚠️" : group.barrierType === 'FORCE_CHANNEL_JOIN' ? "📢" : "✔"}
              </span>
              <span>
                {group.barrierType === 'FREE_SEND' ? 'ارسال کاملاً آزاد (امتیاز مثبت)' :
                 group.barrierType === 'BOT_CAPTCHA' ? 'کاپچا ناظم (مدیریت شده)' :
                 group.barrierType === 'FORCE_CHANNEL_JOIN' ? 'قفل کانال (کسر امتیاز)' :
                 group.barrierType === 'FORCE_ADD_MEMBERS' ? 'ادد اجباری (ریسک بالا)' :
                 group.barrierType === 'SLOW_MODE' ? 'حالت کند / تاخیر زمانی' :
                 group.barrierType === 'READ_ONLY' ? 'فقط خواندنی' : 'بررسی اولیه'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-emerald-400">✔</span>
              <span>سوپرگروه با اعضای فعال</span>
            </div>
          </div>

          {group.barrierDetails && (
            <p className="text-[11px] text-cyan-300/90 bg-cyan-950/40 p-2 rounded-lg border border-cyan-900/40 leading-relaxed">
              💡 <strong>تحلیل مانع:</strong> {group.barrierDetails}
            </p>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="pt-2 flex items-center justify-between gap-3">
          <a
            href={group.link}
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            بازکردن مستقیم در تلگرام
          </a>

          <button
            onClick={handleJoin}
            disabled={group.joined || joining}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              group.joined
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/30'
            }`}
          >
            {joining ? 'در حال عضویت...' : group.joined ? 'عضو شده در گروه ✅' : 'عضویت ایمن در گروه'}
          </button>
        </div>

      </div>
    </div>
  );
};
