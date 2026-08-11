import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import fs from "fs";
import path from "path";
import { GroupInfo, SearchSettings, LogMessage, SearchProgress, GroupBarrierType, PurgeProgress, PurgeOptions, ProbeBatchProgress } from "../src/types.js";
import { normalizePersianDigits, cleanPhoneCode, cleanPhoneNumber } from "../src/utils/numberUtils.js";

// Storage path configuration
const DATA_DIR = path.join(process.cwd(), "data");
const STORAGE_FILE = path.join(DATA_DIR, "app_storage.json");

// Global singleton state for Telegram Client
class TelegramManager {
  private client: TelegramClient | null = null;
  private apiId: number = 0;
  private apiHash: string = "";
  private sessionString: string = "";
  private phoneCodeHash: string = "";
  private currentPhone: string = "";
  private isSearching: boolean = false;
  private shouldStopSearch: boolean = false;
  private shouldStopPurge: boolean = false;
  private shouldStopProbe: boolean = false;
  private discoveredGroupsMap: Map<string, GroupInfo> = new Map();

  private savedSettings: SearchSettings = {
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

  private probeBatchProgress: ProbeBatchProgress = {
    isProbing: false,
    totalGroups: 0,
    probedCount: 0,
    currentTitle: "",
    currentUsername: "",
    statusMessage: "آماده برای تست ضربتی",
    freeSendCount: 0,
    forceChannelCount: 0,
    botCaptchaCount: 0,
    forceAddCount: 0,
    slowModeCount: 0,
    readOnlyCount: 0,
    unknownCount: 0,
    isCompleted: false
  };

  private purgeProgress: PurgeProgress = {
    isPurging: false,
    totalTargets: 0,
    processedCount: 0,
    groupsLeft: 0,
    channelsLeft: 0,
    botsCleared: 0,
    privateChatsCleared: 0,
    currentTitle: "",
    currentType: "unknown",
    estimatedTimeRemainingSec: 0,
    statusMessage: "آماده برای خلوت‌سازی",
    isCompleted: false
  };

  private searchProgress: SearchProgress = {
    isSearching: false,
    currentKeyword: "",
    completedKeywords: 0,
    totalKeywords: 0,
    totalFound: 0,
    validGroupsCount: 0,
    statusMessage: "آماده برای شروع",
    floodWaitSeconds: 0,
    requestsMade: 0,
    dailyJoinsCount: 0,
    logs: []
  };

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (e) {
        console.error("Failed to create data dir:", e);
      }
    }
  }

  public saveToDisk() {
    try {
      this.ensureDataDir();
      const payload = {
        apiId: this.apiId,
        apiHash: this.apiHash,
        sessionString: this.sessionString,
        currentPhone: this.currentPhone,
        groups: Array.from(this.discoveredGroupsMap.values()),
        dailyJoinsCount: this.searchProgress.dailyJoinsCount || 0,
        settings: this.savedSettings,
        logs: this.searchProgress.logs.slice(0, 150),
        lastSavedAt: new Date().toISOString()
      };
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(payload, null, 2), "utf-8");
    } catch (err) {
      console.error("Failed to save state to disk:", err);
    }
  }

  public getSettings(): SearchSettings {
    return this.savedSettings;
  }

  public setSettings(newSettings: Partial<SearchSettings>): SearchSettings {
    this.savedSettings = { ...this.savedSettings, ...newSettings };
    this.saveToDisk();
    return this.savedSettings;
  }

  public async loadFromDiskAndConnect(): Promise<boolean> {
    try {
      this.ensureDataDir();
      if (!fs.existsSync(STORAGE_FILE)) {
        this.seedInitialGroups();
        this.saveToDisk();
        this.searchProgress.totalFound = this.discoveredGroupsMap.size;
        this.searchProgress.validGroupsCount = Array.from(this.discoveredGroupsMap.values()).filter(g => g.canSendMessages).length;
        return false;
      }

      const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
      if (!raw) {
        this.seedInitialGroups();
        this.saveToDisk();
        this.searchProgress.totalFound = this.discoveredGroupsMap.size;
        this.searchProgress.validGroupsCount = Array.from(this.discoveredGroupsMap.values()).filter(g => g.canSendMessages).length;
        return false;
      }

      const data = JSON.parse(raw);
      if (data.apiId) this.apiId = data.apiId;
      if (data.apiHash) this.apiHash = data.apiHash;
      if (data.sessionString) this.sessionString = data.sessionString;
      if (data.currentPhone) this.currentPhone = data.currentPhone;

      if (data.settings && typeof data.settings === 'object') {
        this.savedSettings = { ...this.savedSettings, ...data.settings };
      }

      if (Array.isArray(data.logs) && data.logs.length > 0) {
        this.searchProgress.logs = data.logs;
      }

      if (Array.isArray(data.groups) && data.groups.length > 0) {
        this.discoveredGroupsMap.clear();
        for (const g of data.groups) {
          if (g && g.id) {
            this.discoveredGroupsMap.set(g.id, g);
          }
        }
        this.searchProgress.totalFound = this.discoveredGroupsMap.size;
        this.searchProgress.validGroupsCount = Array.from(this.discoveredGroupsMap.values()).filter(g => g.canSendMessages).length;
      } else {
        this.seedInitialGroups();
        this.saveToDisk();
        this.searchProgress.totalFound = this.discoveredGroupsMap.size;
        this.searchProgress.validGroupsCount = Array.from(this.discoveredGroupsMap.values()).filter(g => g.canSendMessages).length;
      }

      if (data.dailyJoinsCount) {
        this.searchProgress.dailyJoinsCount = data.dailyJoinsCount;
      }

      if (this.apiId && this.apiHash && this.sessionString) {
        this.addLog('info', '[ذخیره‌سازی هوشمند 💾] تمامی داده‌ها (نشست تلگرام، گروه‌ها، کلمات کلیدی و تنظیمات) با موفقیت از فایل data/app_storage.json بارگذاری شدند.');
        const initRes = await this.initClient(this.apiId, this.apiHash, this.sessionString);
        if (initRes.success && initRes.connected) {
          this.addLog('success', '[اتصال مجدد خودکار ✅] نشست تلگرام شما بازیابی شد. نیازی به ورود مجدد نیست.');
          return true;
        }
      } else if (this.discoveredGroupsMap.size > 0) {
        this.addLog('info', `[ذخیره‌سازی هوشمند 💾] تمامی داده‌های برنامه شامل ${this.discoveredGroupsMap.size} گروه و کلمات کلیدی از فایل data/app_storage.json بازیابی شدند.`);
      }
    } catch (err: any) {
      console.error("Failed to load state from disk:", err);
    }
    return false;
  }

  private seedInitialGroups() {
    const seedGroups: GroupInfo[] = [
      {
        id: 'seed-1',
        title: 'دورهمی برنامه‌نویسان ایران',
        username: '@iran_dev_community',
        link: 'https://t.me/iran_dev_community',
        membersCount: 4850,
        description: 'گروه تخصصی تبادل نظر، رفع اشکال و شبکه‌سازی توسعه‌دهندگان فرانت‌اند، بک‌اند و موبایل.',
        isPublic: true,
        canSendMessages: true,
        isSupergroup: true,
        isRestricted: false,
        isScam: false,
        isFake: false,
        foundByKeyword: 'برنامه نویسی',
        discoveredAt: new Date().toISOString(),
        joined: false,
        safetyScore: 95,
        recentActivityStatus: 'فعال',
        barrierType: 'FREE_SEND',
        barrierDetails: 'ارسال پیام کاملاً آزاد و بدون هیچگونه محدودیت یا ربات ناظم است ✅'
      },
      {
        id: 'seed-2',
        title: 'گپ متخصصین پایتون و هوش مصنوعی',
        username: '@python_ai_group_ir',
        link: 'https://t.me/python_ai_group_ir',
        membersCount: 12400,
        description: 'بحث و گفتگو درباره Python، PyTorch، TensorFlow، NLP و یادگیری ماشین.',
        isPublic: true,
        canSendMessages: true,
        isSupergroup: true,
        isRestricted: false,
        isScam: false,
        isFake: false,
        foundByKeyword: 'پایتون',
        discoveredAt: new Date().toISOString(),
        joined: false,
        safetyScore: 98,
        recentActivityStatus: 'بسیار فعال',
        barrierType: 'BOT_CAPTCHA',
        barrierDetails: 'نیازمند کلیک روی دکمه «من ربات نیستم» در پیام خوش‌آمدگویی'
      },
      {
        id: 'seed-3',
        title: 'انجمن طراحان وب و UI/UX',
        username: '@webdesigners_persian',
        link: 'https://t.me/webdesigners_persian',
        membersCount: 3120,
        description: 'محل اشتراک‌گذاری نمونه کارها، فیگما، تایپوگرافی و اصول طراحی رابط کاربری.',
        isPublic: true,
        canSendMessages: true,
        isSupergroup: true,
        isRestricted: false,
        isScam: false,
        isFake: false,
        foundByKeyword: 'طراحی وب',
        discoveredAt: new Date().toISOString(),
        joined: false,
        safetyScore: 90,
        recentActivityStatus: 'فعال',
        barrierType: 'FORCE_CHANNEL_JOIN',
        barrierDetails: 'قفل کانال اسپانسر: برای ارسال پیام باید ابتدا در کانال مربوطه عضو شوید.'
      },
      {
        id: 'seed-4',
        title: 'دیجیتال مارکتینگ و سئو ایران',
        username: '@seo_marketing_chat',
        link: 'https://t.me/seo_marketing_chat',
        membersCount: 8900,
        description: 'پرسش و پاسخ الگوریتم‌های گوگل، بازاریابی محتوایی و کمپین‌های تبلیغاتی.',
        isPublic: true,
        canSendMessages: true,
        isSupergroup: true,
        isRestricted: false,
        isScam: false,
        isFake: false,
        foundByKeyword: 'سئو',
        discoveredAt: new Date().toISOString(),
        joined: false,
        safetyScore: 92,
        recentActivityStatus: 'فعال',
        barrierType: 'FREE_SEND',
        barrierDetails: 'ارسال پیام کاملاً آزاد و بدون هیچگونه محدودیت یا ربات ناظم است ✅'
      },
      {
        id: 'seed-5',
        title: 'دورهمی کسب‌وکارهای نوپا (استارتاپ)',
        username: '@iran_startups_hub',
        link: 'https://t.me/iran_startups_hub',
        membersCount: 6500,
        description: 'شبکه‌سازی بنیان‌گذاران استارتاپ‌ها، سرمایه‌گذاران فرشته و منتورهای اکوسیستم فناوری.',
        isPublic: true,
        canSendMessages: true,
        isSupergroup: true,
        isRestricted: false,
        isScam: false,
        isFake: false,
        foundByKeyword: 'استارتاپ',
        discoveredAt: new Date().toISOString(),
        joined: false,
        safetyScore: 88,
        recentActivityStatus: 'فعال',
        barrierType: 'FORCE_ADD_MEMBERS',
        barrierDetails: 'نیازمند افزودن ۵ مخاطب جدید به گروه برای رفع محدودیت ارسال پیام'
      },
      {
        id: 'seed-6',
        title: 'کانال اطلاعیه‌های ترید (فقط خواندنی)',
        username: '@crypto_news_read_only',
        link: 'https://t.me/crypto_news_read_only',
        membersCount: 15400,
        description: 'تحلیل‌های روزانه بازار رمزارزها. کانال عمومی جهت اطلاع‌رسانی.',
        isPublic: true,
        canSendMessages: false,
        isSupergroup: false,
        isRestricted: false,
        isScam: false,
        isFake: false,
        foundByKeyword: 'ارز دیجیتال',
        discoveredAt: new Date().toISOString(),
        joined: false,
        safetyScore: 75,
        recentActivityStatus: 'اطلاعیه',
        barrierType: 'READ_ONLY',
        barrierDetails: 'امکان ارسال پیام در این کانال وجود ندارد (فقط خواندنی).'
      }
    ];

    for (const g of seedGroups) {
      if (!this.discoveredGroupsMap.has(g.id)) {
        this.discoveredGroupsMap.set(g.id, g);
      }
    }
  }

  // Helper log emitter
  private addLog(level: 'info' | 'success' | 'warning' | 'error' | 'safety', message: string) {
    const newLog: LogMessage = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      level,
      message
    };
    this.searchProgress.logs.unshift(newLog);
    if (this.searchProgress.logs.length > 200) {
      this.searchProgress.logs.pop();
    }
  }

  public getStatus() {
    return {
      isConnected: !!(this.client && this.client.connected),
      apiId: this.apiId,
      sessionSaved: !!this.sessionString,
      isSearching: this.isSearching,
      totalDiscovered: this.discoveredGroupsMap.size
    };
  }

  public async getMe() {
    if (!this.client || !this.client.connected) return null;
    try {
      const me = await this.client.getMe();
      if (!me) return null;
      return {
        id: me.id?.toString() || "",
        firstName: me.firstName || "",
        lastName: me.lastName || "",
        username: me.username || "",
        phone: me.phone || ""
      };
    } catch (err) {
      console.error("Failed to getMe:", err);
      return null;
    }
  }

  // Step 1: Initialize connection with credentials
  public async initClient(apiId: number, apiHash: string, sessionStr: string = ""): Promise<{ success: boolean; message: string; connected: boolean }> {
    try {
      this.apiId = apiId;
      this.apiHash = apiHash;
      this.sessionString = sessionStr;

      const stringSession = new StringSession(sessionStr);
      this.client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
      });

      await this.client.connect();
      const isAuthorized = await this.client.isUserAuthorized();

      if (isAuthorized) {
        const savedSession = this.client.session.save() as unknown as string;
        this.sessionString = savedSession;
        this.saveToDisk();
        this.addLog('success', 'اتصال به تلگرام با موفقیت برقرار شد.');
        return { success: true, message: 'متصل شد', connected: true };
      } else {
        this.saveToDisk();
        this.addLog('info', 'اطلاعات API_ID و API_HASH دریافت شد. لطفاً شماره تلفن خود را وارد کنید.');
        return { success: true, message: 'نیاز به کد تایید تلفن', connected: false };
      }
    } catch (error: any) {
      console.error("GramJS Init Error:", error);
      this.addLog('error', `خطا در اتصال: ${error.message || error}`);
      return { success: false, message: error.message || 'خطا در برقراری ارتباط با تلگرام', connected: false };
    }
  }

  // Step 2: Send Auth SMS/Telegram code to user's phone
  public async sendCode(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return { success: false, message: 'ابتدا API_ID و API_HASH را تنظیم کنید.' };
    }
    try {
      const cleanPhone = cleanPhoneNumber(phoneNumber);
      if (!cleanPhone || cleanPhone.length < 10) {
        return { success: false, message: 'شماره تلفن وارد شده معتبر نیست. لطفاً شماره را با پیش‌شماره کشور (مثال: +989123456789) وارد کنید.' };
      }

      this.currentPhone = cleanPhone;
      this.addLog('info', `در حال ارسال کد تایید به شماره ${cleanPhone}...`);

      if (!this.client.connected) {
        await this.client.connect();
      }

      const res = await this.client.sendCode(
        { apiId: this.apiId, apiHash: this.apiHash },
        cleanPhone
      );
      this.phoneCodeHash = res.phoneCodeHash;
      this.addLog('success', `کد تایید تلگرام به شماره ${cleanPhone} ارسال شد. لطفاً کد ۵ رقمی را وارد کنید.`);
      return { success: true, message: 'کد با موفقیت ارسال شد' };
    } catch (error: any) {
      console.error("sendCode Error:", error);
      const errMsg = error.errorMessage || error.message || String(error);
      if (errMsg.includes('PHONE_NUMBER_INVALID')) {
        const msg = 'شماره تلفن وارد شده نامعتبر است. لطفاً فرمت شماره را بررسی کنید (مثال: +989123456789).';
        this.addLog('error', msg);
        return { success: false, message: msg };
      }
      if (errMsg.includes('PHONE_NUMBER_FLOOD') || errMsg.includes('FLOOD_WAIT')) {
        const msg = 'به دلیل تلاش‌های مکرر، تلگرام موقتاً ارسال کد به این شماره را محدود کرده است. لطفاً چند دقیقه بعد تلاش کنید.';
        this.addLog('error', msg);
        return { success: false, message: msg };
      }
      if (errMsg.includes('API_ID_INVALID')) {
        const msg = 'شناسه API_ID یا API_HASH اشتباه است. لطفاً مقادیر مرحله ۱ را بررسی کنید.';
        this.addLog('error', msg);
        return { success: false, message: msg };
      }
      this.addLog('error', `خطا در ارسال کد: ${errMsg}`);
      return { success: false, message: errMsg || 'خطا در ارسال کد تایید' };
    }
  }

  // Step 3: Verify Code & Password (2FA)
  public async verifyCode(phoneCode: string, password?: string): Promise<{ success: boolean; sessionString?: string; message: string }> {
    if (!this.client) {
      return { success: false, message: 'کلاینت تلگرام آماده نیست. ابتدا مرحله ۱ (API_ID) را بررسی کنید.' };
    }

    const cleanCode = cleanPhoneCode(phoneCode);
    if (!cleanCode || cleanCode.length < 5) {
      return { success: false, message: 'کد تایید تلگرام باید ۵ یا ۶ رقم باشد.' };
    }

    try {
      this.addLog('info', `در حال اعتبارسنجی کد ورود (${cleanCode})...`);

      if (!this.client.connected) {
        await this.client.connect();
      }

      // 1. Try sign in using Api.auth.SignIn
      try {
        await this.client.invoke(
          new Api.auth.SignIn({
            phoneNumber: this.currentPhone,
            phoneCodeHash: this.phoneCodeHash,
            phoneCode: cleanCode,
          })
        );
      } catch (innerErr: any) {
        const innerMsg = innerErr.errorMessage || innerErr.message || String(innerErr);
        if ((innerMsg.includes('SESSION_PASSWORD_NEEDED') || innerErr.errorMessage === 'SESSION_PASSWORD_NEEDED')) {
          if (password && password.trim()) {
            this.addLog('info', 'کد تایید پذیرفته شد. در حال برقراری ورود با رمز عبور دو مرحله‌ای (2FA)...');
            await this.client.signInWithPassword(
              { apiId: Number(this.apiId), apiHash: this.apiHash },
              {
                password: async () => password.trim(),
                onError: (pErr) => {
                  throw pErr;
                }
              }
            );
          } else {
            this.addLog('warning', 'حساب شما دارای رمز عبور تایید دو مرحله‌ای (2FA) است. لطفاً رمز عبور را وارد نمایید.');
            return { success: false, message: '2FA_REQUIRED' };
          }
        } else {
          throw innerErr;
        }
      }

      const savedSession = this.client.session.save() as unknown as string;
      this.sessionString = savedSession;
      this.saveToDisk();
      this.addLog('success', 'ورود به حساب تلگرام با موفقیت انجام شد!');
      return { success: true, sessionString: savedSession, message: 'ورود موفقیت‌آمیز' };
    } catch (error: any) {
      console.error("verifyCode Error:", error);
      const errMsg = error.errorMessage || error.message || String(error);

      if (errMsg.includes('SESSION_PASSWORD_NEEDED') || error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        this.addLog('warning', 'حساب شما دارای تایید دو مرحله‌ای (2FA) است. لطفاً رمز عبور را وارد نمایید.');
        return { success: false, message: '2FA_REQUIRED' };
      }
      if (errMsg.includes('PHONE_CODE_INVALID')) {
        const msg = 'کد تایید وارد شده اشتباه است. توجه کنید که اگر کد جدیدی برای شما پیامک یا تلگرام شده، فقط کد جدید معتبر است.';
        this.addLog('error', msg);
        return { success: false, message: msg };
      }
      if (errMsg.includes('PHONE_CODE_EXPIRED')) {
        const msg = 'کد تایید ارسال شده منقضی شده است. لطفاً مجدداً دکمه ارسال کد را بزنید.';
        this.addLog('error', msg);
        return { success: false, message: msg };
      }
      if (errMsg.includes('PASSWORD_HASH_INVALID')) {
        const msg = 'رمز عبور تایید دو مرحله‌ای (2FA) اشتباه است.';
        this.addLog('error', msg);
        return { success: false, message: msg };
      }
      if (errMsg.includes('PHONE_NUMBER_INVALID')) {
        const msg = 'شماره تلفن ثبت شده معتبر نیست.';
        this.addLog('error', msg);
        return { success: false, message: msg };
      }

      this.addLog('error', `خطا در اعتبارسنجی: ${errMsg}`);
      return { success: false, message: errMsg || 'کد وارد شده معتبر نیست' };
    }
  }

  // Step 4: Disconnect session
  public async disconnect() {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (e) {}
      this.client = null;
    }
    this.sessionString = "";
    this.saveToDisk();
    this.addLog('safety', 'اتصال حساب تلگرام قطع گردید.');
  }

  // Public Group Finder Engine
  public async startSearch(settings: SearchSettings): Promise<void> {
    if (this.isSearching) {
      this.addLog('warning', 'عملیات جستجو در حال حاضر فعال است.');
      return;
    }

    this.savedSettings = settings;
    this.saveToDisk();

    this.isSearching = true;
    this.shouldStopSearch = false;
    this.searchProgress = {
      isSearching: true,
      currentKeyword: "",
      completedKeywords: 0,
      totalKeywords: settings.keywords.length,
      totalFound: this.discoveredGroupsMap.size,
      validGroupsCount: Array.from(this.discoveredGroupsMap.values()).filter(g => g.canSendMessages).length,
      statusMessage: "آغاز الگوریتم هوشمند جستجو...",
      floodWaitSeconds: 0,
      requestsMade: 0,
      dailyJoinsCount: this.searchProgress.dailyJoinsCount || 0,
      logs: this.searchProgress.logs
    };

    this.addLog('safety', `[پروتکل ایمنی فعال] جستجو با تاخیر تصادفی ${settings.delayBetweenRequestsMin} تا ${settings.delayBetweenRequestsMax} ثانیه آغاز شد.`);

    // If client is not connected, run in demo/simulated mode or require connection
    const useRealTelegram = !!(this.client && this.client.connected);

    if (!useRealTelegram) {
      this.addLog('warning', 'توجه: اکانت تلگرام متصل نیست. جستجو در حالت شبیه‌سازی هوشمند (Demo Mode) اجرا می‌شود.');
    }

    try {
      for (let i = 0; i < settings.keywords.length; i++) {
        if (this.shouldStopSearch) {
          this.addLog('warning', 'عملیات جستجو توسط کاربر متوقف شد.');
          break;
        }

        const keyword = settings.keywords[i];
        this.searchProgress.currentKeyword = keyword;
        this.searchProgress.completedKeywords = i;
        this.searchProgress.statusMessage = `در حال جستجوی کلمه کلیدی: "${keyword}" (${i + 1} از ${settings.keywords.length})`;
        this.addLog('info', `شروع جستجو برای کلمه: "${keyword}"...`);

        if (useRealTelegram && this.client) {
          await this.searchTelegramReal(keyword, settings);
        } else {
          await this.searchTelegramSimulated(keyword, settings);
        }

        this.searchProgress.completedKeywords = i + 1;

        // Safety Delay between keyword iterations
        if (i < settings.keywords.length - 1 && !this.shouldStopSearch) {
          const delaySec = Math.floor(
            Math.random() * (settings.delayBetweenRequestsMax - settings.delayBetweenRequestsMin + 1) + settings.delayBetweenRequestsMin
          );
          this.addLog('safety', `[تاخیر ضدمسدودی] شبیه‌سازی رفتار طبیعی انسان. انتظار به مدت ${delaySec} ثانیه...`);
          await this.sleep(delaySec * 1000);
        }
      }
    } catch (error: any) {
      console.error("Search Process Exception:", error);
      this.addLog('error', `خطا در جریان فرآیند جستجو: ${error.message || error}`);
    } finally {
      this.isSearching = false;
      this.searchProgress.isSearching = false;
      this.searchProgress.statusMessage = "عملیات جستجو به پایان رسید.";
      this.saveToDisk();
      this.addLog('success', `پایان عملیات جستجو. تعداد کل گروه‌های کشف شده: ${this.discoveredGroupsMap.size}`);
    }
  }

  private isGroupAlreadyDiscovered(username?: string, title?: string, id?: string): boolean {
    if (id && this.discoveredGroupsMap.has(id)) return true;

    const cleanUser = username ? username.replace('https://t.me/', '').replace('@', '').trim().toLowerCase() : '';
    const cleanTitle = title ? title.trim().toLowerCase() : '';

    for (const group of this.discoveredGroupsMap.values()) {
      if (id && group.id === id) return true;
      if (cleanUser && group.username.replace('https://t.me/', '').replace('@', '').trim().toLowerCase() === cleanUser) {
        return true;
      }
      if (cleanTitle && group.title.trim().toLowerCase() === cleanTitle) {
        return true;
      }
    }
    return false;
  }

  // Real Telegram MTProto Global Search
  private async searchTelegramReal(keyword: string, settings: SearchSettings) {
    if (!this.client) return;

    try {
      this.searchProgress.requestsMade++;
      // Search public chats globally
      const searchResult = await this.client.invoke(
        new Api.contacts.Search({
          q: keyword,
          limit: 50
        })
      );

      const chats = searchResult.chats || [];
      this.addLog('info', `دریافت ${chats.length} نتیجه اولیه از تلگرام برای "${keyword}". در حال بررسی نوع و دسترسی‌ها...`);

      for (const chat of chats) {
        if (this.shouldStopSearch) break;

        // Check if chat is a Channel/Megagroup with a public username
        const anyChat = chat as any;
        const isMegagroup = anyChat.megagroup || anyChat.className === 'Channel' && anyChat.megagroup;
        const username = anyChat.username;

        if (isMegagroup && username) {
          const title = anyChat.title || username;
          const membersCount = anyChat.participantsCount || 0;
          
          // Check sending restrictions
          // defaultBannedRights: if sendMessages is true -> user banned from sending
          const bannedRights = anyChat.defaultBannedRights;
          const canSendMessages = !(bannedRights && bannedRights.sendMessages);
          const isRestricted = !!anyChat.restricted;
          const isScam = !!anyChat.scam;
          const isFake = !!anyChat.fake;

          const groupId = `tg-${anyChat.id}`;

          // Strict Deduplication check: Do not re-propose groups already in database
          if (this.isGroupAlreadyDiscovered(`@${username}`, title, groupId)) {
            this.addLog('info', `[تکراری 🔁] گروه "${title}" (@${username}) قبلاً کشف و ذخیره شده بود (عدم پیشنهاد مجدد).`);
            continue;
          }

          // Apply user filters
          if (membersCount >= settings.minMembers) {
            if (!settings.onlyCanSendMessages || canSendMessages) {
              const link = `https://t.me/${username}`;
              
              const groupInfo: GroupInfo = {
                id: groupId,
                title: title,
                username: `@${username}`,
                link: link,
                membersCount: membersCount,
                description: anyChat.about || `گروه عمومی تلگرام با موضوع ${keyword}`,
                isPublic: true,
                canSendMessages: canSendMessages,
                isSupergroup: true,
                isRestricted: isRestricted,
                isScam: isScam,
                isFake: isFake,
                foundByKeyword: keyword,
                discoveredAt: new Date().toISOString(),
                joined: false,
                safetyScore: isScam || isFake ? 20 : (isRestricted ? 50 : 95)
              };

              this.discoveredGroupsMap.set(groupId, groupInfo);
              this.searchProgress.totalFound = this.discoveredGroupsMap.size;
              if (canSendMessages) this.searchProgress.validGroupsCount++;

              this.addLog('success', `گروه جدید کشف شد: ${title} (${username}) - اعضا: ${membersCount} - دسته: #${keyword}`);
              this.saveToDisk();
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Real Search Error:", error);
      if (error.errorMessage?.startsWith('FLOOD_WAIT_')) {
        const seconds = parseInt(error.errorMessage.split('_')[2], 10) || 60;
        this.searchProgress.floodWaitSeconds = seconds;
        this.addLog('error', `🚨 هشدار FloodWait تلگرام: دریافت محدودیت زمان‌بندی. سیستم به مدت ${seconds} ثانیه متوقف شده و به طور ایمن صبر می‌کند.`);
        await this.sleep(seconds * 1000);
        this.searchProgress.floodWaitSeconds = 0;
      } else {
        this.addLog('error', `خطا هنگام استعلام از تلگرام: ${error.message || error}`);
      }
    }
  }

  // Simulated search for Demo/preview mode or expanded catalog
  private async searchTelegramSimulated(keyword: string, settings: SearchSettings) {
    await this.sleep(1200); // Simulate network query

    const simulatedVariations = [
      { nameSuffix: 'جامع', handleSuffix: 'community' },
      { nameSuffix: 'دورهمی متخصصین', handleSuffix: 'chat' },
      { nameSuffix: 'پرسش و پاسخ', handleSuffix: 'qa' },
      { nameSuffix: 'شبکه', handleSuffix: 'network' },
      { nameSuffix: 'تبادل نظر و توسعه', handleSuffix: 'dev' }
    ];

    simulatedVariations.forEach((varItem, idx) => {
      const cleanKeyword = keyword.trim().replace(/\s+/g, '_');
      const title = `گروه ${varItem.nameSuffix} ${keyword}`;
      const randomUsername = `${cleanKeyword}_${varItem.handleSuffix}`;
      const groupId = `sim-${cleanKeyword}-${varItem.handleSuffix}`;
      const members = 2800 + (idx * 1700) + (keyword.length * 300);
      const canSend = idx !== 4; // 80% messageable

      // Deduplication check: Skip if already discovered in previous search or session
      if (this.isGroupAlreadyDiscovered(`@${randomUsername}`, title, groupId)) {
        this.addLog('info', `[تکراری 🔁] گروه "${title}" (@${randomUsername}) قبلاً کشف شده بود (عدم پیشنهاد مجدد).`);
        return;
      }

      if (members >= settings.minMembers && (!settings.onlyCanSendMessages || canSend)) {
        const groupInfo: GroupInfo = {
          id: groupId,
          title: title,
          username: `@${randomUsername}`,
          link: `https://t.me/${randomUsername}`,
          membersCount: members,
          description: `گروه عمومی تلگرام با موضوع ${keyword}. عضویت آزاد برای کلیه علاقه‌مندان.`,
          isPublic: true,
          canSendMessages: canSend,
          isSupergroup: true,
          isRestricted: false,
          isScam: false,
          isFake: false,
          foundByKeyword: keyword,
          discoveredAt: new Date().toISOString(),
          joined: false,
          safetyScore: 92,
          recentActivityStatus: 'فعال'
        };

        this.discoveredGroupsMap.set(groupId, groupInfo);
        this.searchProgress.totalFound = this.discoveredGroupsMap.size;
        if (canSend) this.searchProgress.validGroupsCount++;

        this.addLog('success', `[کشف هوشمند 🎯] گروه جدید "${title}" (@${randomUsername}) کشف و در دسته #${keyword} ثبت گردید.`);
        this.saveToDisk();
      }
    });
  }

  public stopSearch() {
    this.shouldStopSearch = true;
    this.addLog('warning', 'درخواست توقف عملیات صادر شد. به زودی متوقف می‌شود...');
  }

  // Join a discovered group with safety controls
  public async joinGroup(usernameOrLink: string): Promise<{ success: boolean; message: string }> {
    const cleanHandle = usernameOrLink.replace('https://t.me/', '').replace('@', '').trim();
    
    if (this.client && this.client.connected) {
      try {
        this.addLog('info', `در حال عضویت در گروه @${cleanHandle}...`);
        const entity = await this.client.getEntity(cleanHandle);
        await this.client.invoke(
          new Api.channels.JoinChannel({
            channel: entity
          })
        );

        this.searchProgress.dailyJoinsCount++;
        this.addLog('success', `با موفقیت در گروه @${cleanHandle} عضو شدید ✅`);

        // Update group status in list
        for (const [id, group] of this.discoveredGroupsMap.entries()) {
          if (group.username.toLowerCase().includes(cleanHandle.toLowerCase())) {
            group.joined = true;
            this.discoveredGroupsMap.set(id, group);
          }
        }

        return { success: true, message: 'با موفقیت عضو شدید' };
      } catch (error: any) {
        console.error("Join Channel Error:", error);
        this.addLog('error', `خطا در عضویت گروه @${cleanHandle}: ${error.message || error}`);
        return { success: false, message: error.message || 'خطا در عضویت در گروه' };
      }
    } else {
      // Demo mode join
      this.searchProgress.dailyJoinsCount++;
      this.addLog('success', `[دمو] عضویت مجازی در گروه @${cleanHandle} انجام شد.`);
      for (const [id, group] of this.discoveredGroupsMap.entries()) {
        if (group.username.toLowerCase().includes(cleanHandle.toLowerCase())) {
          group.joined = true;
          this.discoveredGroupsMap.set(id, group);
        }
      }
      return { success: true, message: 'عضویت دمو انجام شد' };
    }
  }

  // Flash Probe & Auto-Leave Protocol (تست ارسال واقعی پیام + تحلیل واکنش ربات ناظم + خروج آنی جهت خلوت ماندن تلگرام)
  public async probeGroupBarrier(usernameOrLink: string): Promise<{ success: boolean; barrierType: string; barrierDetails: string; autoCleaned: boolean }> {
    const cleanHandle = usernameOrLink.replace('https://t.me/', '').replace('@', '').trim();
    this.addLog('info', `[تست ضربتی 🔍] آغاز تحلیل هوشمند مانع ارسال پیام در گروه @${cleanHandle}...`);

    let barrierType: GroupBarrierType = 'FREE_SEND';
    let barrierDetails = 'ارسال پیام کاملاً آزاد و بدون نیاز به اقدام اضافی است.';
    let autoCleaned = true;

    if (this.client && this.client.connected) {
      let entity: any = null;
      let testMsgId: number | null = null;
      let hasJoined = false;

      try {
        entity = await this.client.getEntity(cleanHandle);

        // 1. Join channel temporarily
        this.addLog('info', `[ورود موقت 🚪] عضویت موقت در گروه @${cleanHandle} برای تست ارسال پیام...`);
        await this.client.invoke(
          new Api.channels.JoinChannel({
            channel: entity
          })
        );
        hasJoined = true;

        // Brief delay for welcome messages or bot initialization
        await this.sleep(1500);

        // 2. Attempt to send test message "سلام"
        let canSend = false;
        try {
          const sent = await this.client.sendMessage(entity, { message: 'سلام' });
          if (sent && sent.id) {
            testMsgId = sent.id;
            canSend = true;
            this.addLog('info', `[ارسال پیام تست 💬] پیام آزمایشی «سلام» ارسال شد. در حال بررسی ماندگاری پیام و واکنش ربات...`);
          }
        } catch (sendErr: any) {
          const errMsg = (sendErr.errorMessage || sendErr.message || String(sendErr)).toUpperCase();
          if (errMsg.includes('CHAT_WRITE_FORBIDDEN') || errMsg.includes('USER_BANNED_IN_CHANNEL')) {
            barrierType = 'READ_ONLY';
            barrierDetails = 'امکان ارسال پیام در این گروه توسط ادمین مسدود گردیده است (فقط خواندنی).';
          } else if (errMsg.includes('SLOWMODE_WAIT')) {
            barrierType = 'SLOW_MODE';
            barrierDetails = 'گروه در حالت کند (Slow Mode) قرار دارد.';
          } else {
            barrierType = 'UNKNOWN';
            barrierDetails = `خطا در ارسال پیام: ${sendErr.errorMessage || sendErr.message || sendErr}`;
          }
        }

        if (canSend) {
          // Wait 3 seconds for anti-spam bots to delete the message or post a restriction notice
          await this.sleep(3000);

          // Fetch recent 12 messages from channel
          const recentMessages = await this.client.getMessages(entity, { limit: 12 });

          // Check if test message is still present
          const isTestMsgStillThere = testMsgId ? recentMessages.some((m: any) => m.id === testMsgId) : false;

          if (isTestMsgStillThere) {
            // Test message survived! Check if group has Slow Mode configured
            const slowmodeSec = entity.slowmodeSeconds || 0;
            if (slowmodeSec > 0) {
              barrierType = 'SLOW_MODE';
              barrierDetails = `ارسال پیام آزاد است اما دارای حالت کند (تاخیر ${slowmodeSec} ثانیه بین پیام‌ها) می‌باشد.`;
            } else {
              barrierType = 'FREE_SEND';
              barrierDetails = 'ارسال پیام کاملاً آزاد و بدون هیچگونه محدودیت یا ربات ناظم است ✅';
            }

            // Clean up our test message so we leave no trace!
            try {
              if (testMsgId) {
                await this.client.deleteMessages(entity, [testMsgId], { revoke: true });
              }
            } catch (e) {
              // Ignore delete error if any
            }
          } else {
            // TEST MESSAGE WAS DELETED BY BOT!
            this.addLog('warning', `[حذف پیام ⚠️] پیام آزمایشی توسط ربات گروه پاک شد! در حال تحلیل پیام ربات...`);

            let foundBotJoinChannel = false;
            let foundForceAdd = false;
            let addCount = 'چند';
            let foundCaptcha = false;

            for (const msg of recentMessages) {
              const text = (msg.message || '').toLowerCase();
              const hasInlineButton = Boolean((msg.replyMarkup as any)?.rows?.length > 0);

              // Check for Channel Join Lock (عضویت اجباری در کانال)
              if (
                text.includes('عضو شوید') || 
                text.includes('عضویت') || 
                text.includes('کانال') || 
                text.includes('دکمه زیر') || 
                text.includes('join') || 
                text.includes('قفل کانال') || 
                text.includes('اسپانسر')
              ) {
                foundBotJoinChannel = true;
              }

              // Check for Force Add Members (ادد اجباری)
              if (text.includes('افزودن') || text.includes('ادد') || text.includes('عضو کنید') || text.includes('دعوت')) {
                foundForceAdd = true;
                const match = text.match(/(\d+)\s*(نفر|عضو|مخاطب|مخاطبین)/);
                if (match && match[1]) {
                  addCount = match[1];
                }
              }

              // Check for Captcha / Verification Button
              if (hasInlineButton || text.includes('کاپچا') || text.includes('captcha') || text.includes('ربات نیستم') || text.includes('احراز هویت')) {
                foundCaptcha = true;
              }
            }

            if (foundBotJoinChannel) {
              barrierType = 'FORCE_CHANNEL_JOIN';
              barrierDetails = `قفل کانال اسپانسر: پیام تست پاک شد! برای ارسال پیام باید ابتدا در کانال مربوطه عضو شوید.`;
            } else if (foundForceAdd) {
              barrierType = 'FORCE_ADD_MEMBERS';
              barrierDetails = `قفل ادد اجباری: پیام تست پاک شد! نیاز به افزودن ${addCount} مخاطب جدید دارد.`;
            } else if (foundCaptcha) {
              barrierType = 'BOT_CAPTCHA';
              barrierDetails = 'قفل کاپچا: پیام تست پاک شد! نیازمند کلیک روی دکمه تایید ربات ناظم.';
            } else {
              barrierType = 'FORCE_CHANNEL_JOIN';
              barrierDetails = 'پیام تست توسط ربات ناظم پاک شد (نیازمند عضویت در کانال اسپانسر یا ادد مخاطب).';
            }
          }
        }

      } catch (err: any) {
        console.error("Probe error:", err);
        this.addLog('warning', `تست ضربتی گروه با هشدار روبه‌رو شد: ${err.errorMessage || err.message || err}`);
        barrierType = 'UNKNOWN';
        barrierDetails = 'بررسی کامل با خطا مواجه شد. ممکن است گروه خصوصی یا مسدود باشد.';
      } finally {
        // 3. FLASH LEAVE -> CRITICAL STEP for zero-clutter
        if (hasJoined && entity) {
          try {
            this.addLog('safety', `[خروجی خلوت‌ساز 🧹] خروج آنی و پاکسازی چت @${cleanHandle} انجام شد. صفحه تلگرام شما کاملاً خلوت ماند.`);
            await this.client.invoke(
              new Api.channels.LeaveChannel({
                channel: entity
              })
            );
          } catch (leaveErr) {
            console.error("Error leaving channel after probe:", leaveErr);
          }
        }
      }
    } else {
      // Demo simulated probe
      await this.sleep(1200);
      const sampleBarriers: { type: GroupBarrierType; details: string }[] = [
        { type: 'FREE_SEND', details: 'ارسال پیام کاملاً آزاد و بدون هیچگونه محدودیت یا ربات ناظم است ✅' },
        { type: 'FORCE_CHANNEL_JOIN', details: 'قفل کانال اسپانسر: پیام تست پاک شد! برای ارسال پیام باید ابتدا در کانال مربوطه عضو شوید.' },
        { type: 'BOT_CAPTCHA', details: 'نیازمند کلیک روی دکمه «من ربات نیستم» در پیام خوش‌آمدگویی' },
        { type: 'FORCE_ADD_MEMBERS', details: 'نیازمند افزودن ۵ مخاطب به گروه برای رفع ریپورت' },
        { type: 'SLOW_MODE', details: 'دارای حالت کند (محدودیت ۱ پیام در هر ۶۰ ثانیه)' }
      ];
      const selected = sampleBarriers[Math.floor(Math.random() * sampleBarriers.length)];
      barrierType = selected.type;
      barrierDetails = selected.details;
      this.addLog('safety', `[دمو - خروجی خلوت‌ساز 🧹] تست شبیه‌سازی انجام شد و برای جلوگیری از شلوغی، گروه از لیست چت‌ها پاک شد.`);
    }

    // Update group info in Map
    for (const [id, group] of this.discoveredGroupsMap.entries()) {
      if (group.username.toLowerCase().includes(cleanHandle.toLowerCase())) {
        group.barrierType = barrierType;
        group.barrierDetails = barrierDetails;
        group.autoCleaned = autoCleaned;
        group.joined = false; // Always left so it's clean
        this.discoveredGroupsMap.set(id, group);
      }
    }

    this.saveToDisk();

    return {
      success: true,
      barrierType,
      barrierDetails,
      autoCleaned
    };
  }

  public getGroups(): GroupInfo[] {
    return Array.from(this.discoveredGroupsMap.values());
  }

  public clearGroups() {
    this.discoveredGroupsMap.clear();
    this.searchProgress.totalFound = 0;
    this.searchProgress.validGroupsCount = 0;
    this.saveToDisk();
    this.addLog('info', '[پاکسازی لیست 🧹] تمامی گروه‌های کشف‌شده از دیسک پاک گردیدند.');
  }

  public getSearchProgress(): SearchProgress {
    return this.searchProgress;
  }

  public getPurgeProgress(): PurgeProgress {
    return this.purgeProgress;
  }

  public getProbeProgress(): ProbeBatchProgress {
    this.updateProbeStats();
    return this.probeBatchProgress;
  }

  public stopProbe() {
    this.shouldStopProbe = true;
    this.probeBatchProgress.statusMessage = "دستور توقف تست ضربتی صادر شد...";
    this.addLog('warning', '[توقف تست ضربتی 🛑] تست ضربتی موانع گروه‌ها توسط کاربر متوقف گردید.');
  }

  public async startBulkProbe(onlyUnprobed = false): Promise<{ success: boolean; message: string }> {
    if (this.probeBatchProgress.isProbing) {
      return { success: false, message: 'یک تست ضربتی دیگر در حال اجرا است.' };
    }

    const allGroups = Array.from(this.discoveredGroupsMap.values());
    const targets = onlyUnprobed
      ? allGroups.filter(g => !g.barrierType || g.barrierType === 'UNKNOWN')
      : allGroups;

    if (targets.length === 0) {
      return { success: false, message: 'هیچ گروهی برای تست ضربتی وجود ندارد.' };
    }

    this.shouldStopProbe = false;
    this.probeBatchProgress = {
      isProbing: true,
      totalGroups: targets.length,
      probedCount: 0,
      currentTitle: "",
      currentUsername: "",
      statusMessage: "آغاز تست ضربتی موانع گروه‌ها...",
      freeSendCount: 0,
      forceChannelCount: 0,
      botCaptchaCount: 0,
      forceAddCount: 0,
      slowModeCount: 0,
      readOnlyCount: 0,
      unknownCount: 0,
      isCompleted: false
    };

    this.runBulkProbeLoop(targets).catch(err => {
      console.error("Bulk probe error:", err);
      this.probeBatchProgress.isProbing = false;
      this.probeBatchProgress.error = err.message || String(err);
      this.probeBatchProgress.statusMessage = "خطا در فرایند تست ضربتی دسته‌جمعی.";
    });

    return {
      success: true,
      message: `تست ضربتی ${targets.length} گروه با موفقیت آغاز گردید.`
    };
  }

  private async runBulkProbeLoop(targets: GroupInfo[]) {
    this.addLog('safety', `[تست ضربتی مانع ⚡] آغاز تست ارسال پیام و تشخیص موانع برای ${targets.length} گروه کشف‌شده...`);

    for (let i = 0; i < targets.length; i++) {
      if (this.shouldStopProbe) {
        this.addLog('warning', '[توقف تست ضربتی 🛑] فرایند تست ضربتی توسط کاربر متوقف گردید.');
        break;
      }

      const group = targets[i];
      this.probeBatchProgress.probedCount = i + 1;
      this.probeBatchProgress.currentTitle = group.title;
      this.probeBatchProgress.currentUsername = group.username;
      this.probeBatchProgress.statusMessage = `در حال تست ضربتی (${i + 1} از ${targets.length}): «${group.title}»`;

      try {
        await this.probeGroupBarrier(group.username);
        this.updateProbeStats();
        this.saveToDisk();
      } catch (err) {
        console.error(`Error probing ${group.title}:`, err);
      }

      // Safe delay between requests to prevent flood limits
      await this.sleep(2200);
    }

    this.saveToDisk();
    this.probeBatchProgress.isProbing = false;
    this.probeBatchProgress.isCompleted = true;
    this.probeBatchProgress.statusMessage = `تست ضربتی تمامی ${targets.length} گروه با موفقیت به پایان رسید.`;
    this.addLog('success', `[تست ضربتی کامل ⚡] تمامی گروه‌ها بر اساس نوع مانع ارسال پیام دسته‌بندی گردیدند.`);
  }

  private updateProbeStats() {
    let free = 0, channel = 0, bot = 0, add = 0, slow = 0, readonly = 0, unknown = 0;
    for (const group of this.discoveredGroupsMap.values()) {
      switch (group.barrierType) {
        case 'FREE_SEND': free++; break;
        case 'FORCE_CHANNEL_JOIN': channel++; break;
        case 'BOT_CAPTCHA': bot++; break;
        case 'FORCE_ADD_MEMBERS': add++; break;
        case 'SLOW_MODE': slow++; break;
        case 'READ_ONLY': readonly++; break;
        default: unknown++; break;
      }
    }
    this.probeBatchProgress.freeSendCount = free;
    this.probeBatchProgress.forceChannelCount = channel;
    this.probeBatchProgress.botCaptchaCount = bot;
    this.probeBatchProgress.forceAddCount = add;
    this.probeBatchProgress.slowModeCount = slow;
    this.probeBatchProgress.readOnlyCount = readonly;
    this.probeBatchProgress.unknownCount = unknown;
  }

  public stopPurge() {
    this.shouldStopPurge = true;
    this.purgeProgress.statusMessage = "دستور توقف پاکسازی صادر شد...";
    this.addLog('warning', '[توقف پاکسازی 🛑] فرایند پاکسازی تلگرام توسط کاربر متوقف گردید.');
  }

  // Bulk Comprehensive Purge Protocol: Clean Channels, Groups, Bots & Private DM Chats!
  public async startPurge(options: PurgeOptions): Promise<{ success: boolean; message: string }> {
    if (this.purgeProgress.isPurging) {
      return { success: false, message: 'یک فرایند خلوت‌سازی دیگر در حال اجرا است.' };
    }

    this.shouldStopPurge = false;
    this.purgeProgress = {
      isPurging: true,
      totalTargets: 0,
      processedCount: 0,
      groupsLeft: 0,
      channelsLeft: 0,
      botsCleared: 0,
      privateChatsCleared: 0,
      currentTitle: "در حال آنالیز و لیست‌برداری چت‌های تلگرام...",
      currentType: "unknown",
      estimatedTimeRemainingSec: 0,
      statusMessage: "آغاز بررسی گفتگوهای تلگرام...",
      isCompleted: false
    };

    // Run execution asynchronously in background
    this.executePurgeProcess(options).catch(err => {
      console.error("Purge background error:", err);
      this.purgeProgress.isPurging = false;
      this.purgeProgress.error = err.message || String(err);
      this.purgeProgress.statusMessage = "بروز خطا در فرایند پاکسازی.";
    });

    return {
      success: true,
      message: 'فرایند خلوت‌سازی پیشرفته تلگرام با موفقیت آغاز شد.'
    };
  }

  private async executePurgeProcess(options: PurgeOptions) {
    this.addLog('safety', '[خلوت‌سازی هوشمند 🧹] آنالیز و دریافت کامل چت‌ها، کانال‌ها، گروه‌ها، ربات‌ها و چت‌های شخصی...');

    type TargetItem = {
      id: any;
      title: string;
      type: 'channel' | 'group' | 'bot' | 'user';
      entity: any;
    };

    const targets: TargetItem[] = [];

    if (this.client && this.client.connected) {
      try {
        const dialogs = await this.client.getDialogs({ limit: 300 });
        this.addLog('info', `تعداد کل ${dialogs.length} گفتگو در اکانت تلگرام شما شناسايی شد. در حال دسته‌بندی دقيق...`);

        for (const dialog of dialogs) {
          const entity = dialog.entity as any;
          if (!entity) continue;
          if (entity.self) continue; // skip Saved Messages

          const title = dialog.title || entity.title || entity.firstName || 'گفتگو';
          const isBot = entity.bot === true || (entity.className === 'User' && entity.bot);
          const isUser = (dialog.isUser || entity.className === 'User') && !isBot;
          const isChannel = dialog.isChannel || entity.className === 'Channel';
          const isGroup = dialog.isGroup || entity.className === 'Chat' || (isChannel && entity.megagroup);

          if (isBot && options.purgeBots) {
            targets.push({ id: entity.id, title, type: 'bot', entity });
          } else if (isUser && options.purgePrivateChats) {
            targets.push({ id: entity.id, title, type: 'user', entity });
          } else if (isGroup && options.purgeGroups) {
            targets.push({ id: entity.id, title, type: 'group', entity });
          } else if (isChannel && !entity.megagroup && options.purgeChannels) {
            targets.push({ id: entity.id, title, type: 'channel', entity });
          }
        }
      } catch (err: any) {
        console.error("Error getting dialogs for purge:", err);
        this.addLog('error', `خطا در دریافت لیست چت‌ها: ${err.message || err}`);
      }
    } else {
      // Demo Mode Simulated Items for Live UI Progress
      this.addLog('info', '[حالت دمو 🎭] شبیه‌سازی کامل آیتم‌های تلگرام برای نمایش زنده و دقیق عملکرد پلتفرم...');

      if (options.purgeChannels) {
        targets.push({ id: 'c1', title: 'کانال برنامه‌نویسی و پایتون', type: 'channel', entity: null });
        targets.push({ id: 'c2', title: 'کانال سیگنال و ارز دیجیتال', type: 'channel', entity: null });
        targets.push({ id: 'c3', title: 'خبرخوان هوش مصنوعی', type: 'channel', entity: null });
      }
      if (options.purgeGroups) {
        targets.push({ id: 'g1', title: 'گروه پرسش و پاسخ برنامه‌نویسان', type: 'group', entity: null });
        targets.push({ id: 'g2', title: 'دورهمی طراحان وب و گرافیک', type: 'group', entity: null });
        targets.push({ id: 'g3', title: 'گروه تبادلات استارتاپی', type: 'group', entity: null });
      }
      if (options.purgeBots) {
        targets.push({ id: 'b1', title: 'ربات دانلودر اینستاگرام (@InstaBot)', type: 'bot', entity: null });
        targets.push({ id: 'b2', title: 'ربات تبدیل فایل و موزیک (@MusicBot)', type: 'bot', entity: null });
      }
      if (options.purgePrivateChats) {
        targets.push({ id: 'u1', title: 'گفتگوی شخصی - علی محمدی', type: 'user', entity: null });
        targets.push({ id: 'u2', title: 'پیام شخصی ناشناس', type: 'user', entity: null });
        targets.push({ id: 'u3', title: 'پشتیبانی تبلیغات', type: 'user', entity: null });
      }
    }

    this.purgeProgress.totalTargets = targets.length;

    if (targets.length === 0) {
      this.purgeProgress.isPurging = false;
      this.purgeProgress.isCompleted = true;
      this.purgeProgress.statusMessage = "هیچ گفتگویی متناسب با فیلترهای انتخابی شما یافت نشد (تلگرام شما از قبل خلوت است!).";
      this.addLog('info', 'هیچ چتی مطابق فیلترهای شما یافت نشد.');
      return;
    }

    this.addLog('info', `فهرست نهایی شامل ${targets.length} گفتگو آماده شد. در حال آغاز خروج و پاکسازی ایمن...`);

    for (let i = 0; i < targets.length; i++) {
      if (this.shouldStopPurge) {
        this.addLog('warning', `عملیات پاکسازی پس از پاکسازی ${i} گفتگو متوقف شد.`);
        break;
      }

      const item = targets[i];
      this.purgeProgress.currentTitle = item.title;
      this.purgeProgress.currentType = item.type;
      this.purgeProgress.processedCount = i + 1;

      const remaining = targets.length - (i + 1);
      const estDelaySec = 2; // average 2 seconds delay per item
      this.purgeProgress.estimatedTimeRemainingSec = remaining * estDelaySec;

      const typeName = item.type === 'channel' ? 'کانال' : item.type === 'group' ? 'گروه' : item.type === 'bot' ? 'ربات' : 'پیام شخصی';
      this.purgeProgress.statusMessage = `در حال پاکسازی (${i + 1} از ${targets.length}): ${typeName} «${item.title}»`;

      if (this.client && this.client.connected) {
        const MAX_MSG_ID = 2147483647; // 2^31 - 1: Delete all messages and remove dialog from Telegram chat list
        try {
          // Resolve input peer safely
          let inputPeer: any = item.entity;
          try {
            inputPeer = await this.client.getInputEntity(item.entity);
          } catch (e) {
            inputPeer = item.entity;
          }

          if (item.type === 'channel') {
            // Step 1: Delete history first while still a member
            try {
              await this.client.invoke(new Api.channels.DeleteHistory({ channel: inputPeer, maxId: MAX_MSG_ID, forEveryone: false }));
            } catch (e) {}
            try {
              await this.client.invoke(new Api.messages.DeleteHistory({ peer: inputPeer, maxId: MAX_MSG_ID, revoke: true, justClear: false }));
            } catch (e) {}
            // Step 2: Leave Channel
            try {
              await this.client.invoke(new Api.channels.LeaveChannel({ channel: inputPeer }));
            } catch (e) {}
            // Step 3: Delete history again to clean any leftover service entry
            try {
              await this.client.invoke(new Api.messages.DeleteHistory({ peer: inputPeer, maxId: MAX_MSG_ID, revoke: true, justClear: false }));
            } catch (e) {}
            this.purgeProgress.channelsLeft++;
            this.addLog('info', `[حذف کامل چت و خروج از کانال 📢] «${item.title}»`);
          } else if (item.type === 'group') {
            if (item.entity.className === 'Chat') {
              // Basic Group Chat
              try {
                await this.client.invoke(new Api.messages.DeleteHistory({ peer: inputPeer, maxId: MAX_MSG_ID, revoke: true, justClear: false }));
              } catch (e) {}
              try {
                await this.client.invoke(new Api.messages.DeleteChatUser({ chatId: item.entity.id, userId: 'me' }));
              } catch (e) {}
              try {
                await this.client.invoke(new Api.messages.DeleteHistory({ peer: inputPeer, maxId: MAX_MSG_ID, revoke: true, justClear: false }));
              } catch (e) {}
            } else {
              // Supergroup / Megagroup Channel
              try {
                await this.client.invoke(new Api.channels.DeleteHistory({ channel: inputPeer, maxId: MAX_MSG_ID, forEveryone: false }));
              } catch (e) {}
              try {
                await this.client.invoke(new Api.messages.DeleteHistory({ peer: inputPeer, maxId: MAX_MSG_ID, revoke: true, justClear: false }));
              } catch (e) {}
              try {
                await this.client.invoke(new Api.channels.LeaveChannel({ channel: inputPeer }));
              } catch (e) {}
              try {
                await this.client.invoke(new Api.messages.DeleteHistory({ peer: inputPeer, maxId: MAX_MSG_ID, revoke: true, justClear: false }));
              } catch (e) {}
            }
            this.purgeProgress.groupsLeft++;
            this.addLog('info', `[حذف کامل چت و خروج از گروه 👥] «${item.title}»`);
          } else if (item.type === 'bot') {
            // Exactly matching Image 1 & Image 2 (Delete chat + Stop and block bot)
            try {
              await this.client.invoke(new Api.contacts.Block({ id: inputPeer }));
            } catch (e) {}
            try {
              await this.client.invoke(new Api.messages.DeleteHistory({ peer: inputPeer, maxId: MAX_MSG_ID, revoke: true, justClear: false }));
            } catch (e) {}
            this.purgeProgress.botsCleared++;
            this.addLog('info', `[حذف کامل چت و توقف/مسدودسازی ربات 🤖] «${item.title}»`);
          } else if (item.type === 'user') {
            try {
              await this.client.invoke(new Api.messages.DeleteHistory({ peer: inputPeer, maxId: MAX_MSG_ID, revoke: true, justClear: false }));
            } catch (e) {}
            this.purgeProgress.privateChatsCleared++;
            this.addLog('info', `[حذف کامل و دائم چت شخصی 💬] «${item.title}»`);
          }
        } catch (itemErr: any) {
          console.error(`Error purging ${item.title}:`, itemErr);
          this.addLog('warning', `خطا در پاکسازی ${item.title}: ${itemErr.errorMessage || itemErr.message || itemErr}`);
        }
      } else {
        // Demo mode sleep for smooth UI updates
        await this.sleep(1200);
        if (item.type === 'channel') this.purgeProgress.channelsLeft++;
        else if (item.type === 'group') this.purgeProgress.groupsLeft++;
        else if (item.type === 'bot') this.purgeProgress.botsCleared++;
        else if (item.type === 'user') this.purgeProgress.privateChatsCleared++;

        this.addLog('info', `[حالت دمو 🧹] پاکسازی «${item.title}» (${typeName}) انجام شد.`);
      }

      // Safe Delay between items to be 100% human-like and anti-flood
      const delay = 1500 + Math.floor(Math.random() * 1000);
      await this.sleep(delay);
    }

    // Reset joined status for local discovered groups
    for (const [id, group] of this.discoveredGroupsMap.entries()) {
      group.joined = false;
      this.discoveredGroupsMap.set(id, group);
    }

    this.saveToDisk();

    this.purgeProgress.isPurging = false;
    this.purgeProgress.isCompleted = true;
    this.purgeProgress.estimatedTimeRemainingSec = 0;
    const finalMsg = `عملیات خلوت‌سازی تلگرام با موفقیت تکمیل شد! تعداد کل: ${this.purgeProgress.processedCount} گفتگو (کانال: ${this.purgeProgress.channelsLeft}، گروه: ${this.purgeProgress.groupsLeft}، ربات: ${this.purgeProgress.botsCleared}، چت شخصی: ${this.purgeProgress.privateChatsCleared}) خلوت گردید.`;
    this.purgeProgress.statusMessage = finalMsg;
    this.addLog('success', `[پایان خلوت‌سازی 🧹] ${finalMsg}`);
  }

  public async leaveAllJoinedGroupsAndChannels(): Promise<{ success: boolean; count: number; message: string }> {
    const res = await this.startPurge({ purgeGroups: true, purgeChannels: true, purgeBots: true, purgePrivateChats: true });
    return { success: res.success, count: this.purgeProgress.processedCount, message: res.message };
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const telegramManager = new TelegramManager();
