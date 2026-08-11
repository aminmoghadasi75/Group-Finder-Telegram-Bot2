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

        {/* Safety Metric Rating */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              امتیاز سلامت و ایمنی گروه (Safety Rating):
            </span>
            <span className="font-mono text-emerald-400 font-bold">{group.safetyScore}٪</span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${group.safetyScore}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500">
            گروه بدون ریپورت، بدون نمره ریستریکت و سوپرگروه عمومی معتبر با امکان ارسال لینک.
          </p>
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
