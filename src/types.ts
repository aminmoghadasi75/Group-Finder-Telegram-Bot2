export interface TelegramCredentials {
  apiId: number;
  apiHash: string;
  phoneNumber?: string;
  sessionString?: string;
}

export type AuthStep = 
  | 'disconnected'
  | 'phone_required'
  | 'code_required'
  | 'password_required'
  | 'connected';

export interface TelegramUser {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
}

export type GroupBarrierType = 
  | 'FREE_SEND'           // ارسال کاملاً آزاد و بدون شرط
  | 'FORCE_CHANNEL_JOIN'  // نیازمند عضویت در کانال اسپانسر/قفل کانال
  | 'BOT_CAPTCHA'          // نیازمند تایید دکمه/کاپچا
  | 'FORCE_ADD_MEMBERS'    // نیازمند افزودن مخاطب (مثلاً ۵ یا ۱۰ نفر)
  | 'SLOW_MODE'           // دارای محدودیت زمانی بین پیام‌ها
  | 'NO_LINK_ALLOWED'     // ارسال لینک/عکس ممنوع
  | 'READ_ONLY'           // فقط خواندنی / مسدود
  | 'UNKNOWN';            // بررسی نشده

export interface GroupInfo {
  id: string;
  title: string;
  username: string;
  link: string;
  membersCount: number;
  description: string;
  isPublic: boolean;
  canSendMessages: boolean;
  isSupergroup: boolean;
  isRestricted: boolean;
  isScam: boolean;
  isFake: boolean;
  foundByKeyword: string;
  discoveredAt: string;
  joined: boolean;
  safetyScore: number; // 0 to 100
  recentActivityStatus?: string;
  
  // Smart Barrier Analysis properties
  barrierType?: GroupBarrierType;
  barrierDetails?: string; // e.g. "نیاز به افزودن ۱۰ مخاطب" or "تاخیر ۶۰ ثانیه"
  autoCleaned?: boolean;   // true if joined and auto-left to keep Telegram home screen clean
}

export interface SearchSettings {
  keywords: string[];
  minMembers: number;
  onlyCanSendMessages: boolean;
  delayBetweenRequestsMin: number; // in seconds
  delayBetweenRequestsMax: number; // in seconds
  maxGroupsPerKeyword: number;
  autoJoin: boolean;
  maxDailyJoins: number;
  safeMode: boolean;
  searchDepth: 'fast' | 'deep' | 'comprehensive';
}

export interface LogMessage {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'safety';
  message: string;
}

export interface SearchProgress {
  isSearching: boolean;
  currentKeyword: string;
  completedKeywords: number;
  totalKeywords: number;
  totalFound: number;
  validGroupsCount: number;
  statusMessage: string;
  floodWaitSeconds: number;
  requestsMade: number;
  dailyJoinsCount: number;
  logs: LogMessage[];
}

export interface SafetyMetrics {
  accountAgeMode: 'fresh' | 'established' | 'aged';
  healthScore: number; // 0 to 100
  floodRiskLevel: 'low' | 'medium' | 'high';
  recommendedDelay: string;
  dailySearchLimit: number;
  searchesToday: number;
  dailyJoinLimit: number;
  joinsToday: number;
}

export interface PurgeOptions {
  purgeGroups: boolean;
  purgeChannels: boolean;
  purgeBots: boolean;
  purgePrivateChats: boolean;
}

export interface PurgeProgress {
  isPurging: boolean;
  totalTargets: number;
  processedCount: number;
  groupsLeft: number;
  channelsLeft: number;
  botsCleared: number;
  privateChatsCleared: number;
  currentTitle: string;
  currentType: 'channel' | 'group' | 'bot' | 'user' | 'unknown';
  estimatedTimeRemainingSec: number;
  statusMessage: string;
  isCompleted: boolean;
  error?: string;
}

export interface ProbeBatchProgress {
  isProbing: boolean;
  totalGroups: number;
  probedCount: number;
  currentTitle: string;
  currentUsername: string;
  statusMessage: string;
  freeSendCount: number;
  forceChannelCount: number;
  botCaptchaCount: number;
  forceAddCount: number;
  slowModeCount: number;
  readOnlyCount: number;
  unknownCount: number;
  isCompleted: boolean;
  error?: string;
}


