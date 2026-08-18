import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { telegramManager } from "./server/telegramManager.js";
import { expandKeywordsLocally } from "./src/utils/keywordHelper.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Auto-load saved Telegram session & discovered groups from persistent disk storage
  try {
    await telegramManager.loadFromDiskAndConnect();
  } catch (e) {
    console.error("Auto load from disk failed:", e);
  }

  // Google Gemini AI Client Lazy Setup
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
  };

  // --- REST API ENDPOINTS ---

  // Get active Telegram session and user status
  app.get("/api/telegram/status", async (req, res) => {
    try {
      const status = telegramManager.getStatus();
      const me = await telegramManager.getMe();
      res.json({
        success: true,
        status,
        user: me
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Step 1: Initialize API credentials
  app.post("/api/telegram/connect", async (req, res) => {
    try {
      const { apiId, apiHash, sessionString } = req.body;
      if (!apiId || !apiHash) {
        return res.status(400).json({ success: false, error: "شناسه API_ID و API_HASH الزامی است." });
      }

      const numApiId = parseInt(apiId, 10);
      const result = await telegramManager.initClient(numApiId, apiHash, sessionString || "");
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Step 2: Send code to phone
  app.post("/api/telegram/send-code", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ success: false, error: "شماره تلفن الزامی است." });
      }
      const result = await telegramManager.sendCode(phoneNumber);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Step 3: Verify phone code & 2FA password
  app.post("/api/telegram/verify-code", async (req, res) => {
    try {
      const { phoneCode, password } = req.body;
      if (!phoneCode) {
        return res.status(400).json({ success: false, error: "کد تایید الزامی است." });
      }
      const result = await telegramManager.verifyCode(phoneCode, password);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Disconnect session
  app.post("/api/telegram/disconnect", async (req, res) => {
    try {
      await telegramManager.disconnect();
      res.json({ success: true, message: "ارتباط با موفقیت قطع شد." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Start Scraper/Group Search Engine
  app.post("/api/telegram/search/start", async (req, res) => {
    try {
      const { settings } = req.body;
      if (!settings || !Array.isArray(settings.keywords) || settings.keywords.length === 0) {
        return res.status(400).json({ success: false, error: "حداقل یک کلمه کلیدی وارد کنید." });
      }

      // Start search in background
      telegramManager.startSearch(settings);
      res.json({ success: true, message: "عملیات جستجو با موفقیت آغاز شد." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Stop active search
  app.post("/api/telegram/search/stop", (req, res) => {
    try {
      telegramManager.stopSearch();
      res.json({ success: true, message: "درخواست توقف ارسال گردید." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Poll Search progress & real-time logs
  app.get("/api/telegram/search/progress", (req, res) => {
    try {
      const progress = telegramManager.getSearchProgress();
      res.json({ success: true, progress });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get Saved Search Settings & Keywords from app_storage.json
  app.get("/api/telegram/settings", (req, res) => {
    try {
      const settings = telegramManager.getSettings();
      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Save Search Settings & Keywords to app_storage.json
  app.post("/api/telegram/settings", (req, res) => {
    try {
      const { settings } = req.body;
      if (!settings) {
        return res.status(400).json({ success: false, error: "تنظیمات ارسال نشده است." });
      }
      const updated = telegramManager.setSettings(settings);
      res.json({ success: true, settings: updated, message: "تنظیمات با موفقیت در فایل app_storage.json ذخیره شد." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get Discovered Public Groups
  app.get("/api/telegram/groups", (req, res) => {
    try {
      const groups = telegramManager.getGroups();
      res.json({ success: true, groups });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Clear Discovered Groups
  app.post("/api/telegram/groups/clear", (req, res) => {
    try {
      telegramManager.clearGroups();
      res.json({ success: true, message: "لیست گروه‌ها پاک گردید." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Join a discovered group
  app.post("/api/telegram/group/join", async (req, res) => {
    try {
      const { usernameOrLink } = req.body;
      if (!usernameOrLink) {
        return res.status(400).json({ success: false, error: "لینک یا آیدی گروه الزامی است." });
      }

      const result = await telegramManager.joinGroup(usernameOrLink);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Probe Group Barrier with Flash Auto-Leave Protocol
  app.post("/api/telegram/group/probe", async (req, res) => {
    try {
      const { usernameOrLink } = req.body;
      if (!usernameOrLink) {
        return res.status(400).json({ success: false, error: "لینک یا آیدی گروه الزامی است." });
      }

      const result = await telegramManager.probeGroupBarrier(usernameOrLink);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Batch Flash Barrier Probe for all discovered groups
  app.post("/api/telegram/groups/probe-all", async (req, res) => {
    try {
      const { onlyUnprobed = false } = req.body || {};
      const result = await telegramManager.startBulkProbe(Boolean(onlyUnprobed));
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/telegram/probe-progress", (req, res) => {
    try {
      res.json(telegramManager.getProbeProgress());
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/telegram/probe-stop", (req, res) => {
    try {
      telegramManager.stopProbe();
      res.json({ success: true, message: "دستور توقف تست ضربتی صادر شد." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Comprehensive Bulk Purge (Groups, Channels, Bots, DM Private Chats)
  app.post("/api/telegram/purge-start", async (req, res) => {
    try {
      const { purgeGroups = true, purgeChannels = true, purgeBots = true, purgePrivateChats = true } = req.body || {};
      const result = await telegramManager.startPurge({
        purgeGroups: Boolean(purgeGroups),
        purgeChannels: Boolean(purgeChannels),
        purgeBots: Boolean(purgeBots),
        purgePrivateChats: Boolean(purgePrivateChats)
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/telegram/purge-progress", (req, res) => {
    try {
      res.json(telegramManager.getPurgeProgress());
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/telegram/purge-stop", (req, res) => {
    try {
      telegramManager.stopPurge();
      res.json({ success: true, message: "دستور توقف پاکسازی صادر شد." });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Bulk Leave All Joined Groups and Channels for Chat Clutter Cleanup
  app.post("/api/telegram/leave-all", async (req, res) => {
    try {
      const result = await telegramManager.leaveAllJoinedGroupsAndChannels();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- 100% FULL BACKUP & SNAPSHOT ENDPOINTS ---

  // 1. Save 100% of state, settings, credentials & groups to disk immediately
  app.post("/api/telegram/backup/save", (req, res) => {
    try {
      telegramManager.saveToDisk();
      const snapshot = telegramManager.createFullBackupSnapshot();
      res.json({
        success: true,
        message: "تمامی اطلاعات، نشست تلگرام، گروه‌ها، کلمات کلیدی و تنظیمات با موفقیت ۱۰۰٪ در دیسک ذخیره و فریز شدند 💾",
        metadata: snapshot.appMetadata,
        lastSavedAt: snapshot.exportedAtLocal
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: `خطا در ذخیره‌سازی داده‌ها: ${err.message}` });
    }
  });

  // 2. Export / Download 100% JSON Backup Snapshot
  app.get("/api/telegram/backup/export", (req, res) => {
    try {
      const snapshot = telegramManager.createFullBackupSnapshot();
      const filename = `telegram_userbot_backup_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.json`;
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(snapshot, null, 2));
    } catch (err: any) {
      res.status(500).json({ success: false, error: `خطا در تولید فایل پشتیبان: ${err.message}` });
    }
  });

  // 3. Restore / Upload 100% JSON Backup Snapshot
  app.post("/api/telegram/backup/import", async (req, res) => {
    try {
      const backupData = req.body;
      if (!backupData || typeof backupData !== 'object') {
        return res.status(400).json({ success: false, error: "داده‌های فایل پشتیبان ارسال نشده یا نامعتبر است." });
      }

      const result = await telegramManager.restoreFromBackupSnapshot(backupData);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "خطا در بازیابی پشتیبان" });
    }
  });

  // AI Keyword Expansion Endpoint (Powered by Gemini API)
  app.post("/api/ai/expand-keywords", async (req, res) => {
    try {
      const { keywords } = req.body;
      if (!keywords || !Array.isArray(keywords)) {
        return res.status(400).json({ success: false, error: "کلمات کلیدی ورودی معتبر نیست." });
      }

      const ai = getGeminiClient();
      if (!ai) {
        // Fallback to local Persian expander if GEMINI_API_KEY is not configured
        const expanded = expandKeywordsLocally(keywords);
        return res.json({ success: true, keywords: expanded, source: "local" });
      }

      const prompt = `شما یک دستیار هوشمند متخصص در تحلیل گروه‌ها و کانال‌های عمومی تلگرام هستید.
کلمات کلیدی زیر توسط کاربر برای پیدا کردن گروه‌های عمومی تلگرام (ایران و فارسی) وارد شده است:
[${keywords.join(", ")}]

لطفاً ۱۰ کلمه کلیدی، عبارت جستجو و آیدی‌های مشابه و پرکاربرد تلگرامی را که مردم برای نام‌گذاری گروه‌های مرتبط استفاده می‌کنند پیشنهاد دهید.
پاسخ شما باید فقط یک آرایه JSON شامل رشته کلمات کلیدی پیشنهاد شده باشد. بدون توضیحات اضافه.
مثال خروجی: ["کلمه۱", "کلمه۲", "کلمه۳"]`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      const responseText = response.text || "";
      let jsonArray: string[] = [];

      try {
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        jsonArray = JSON.parse(cleanJson);
      } catch (parseErr) {
        jsonArray = expandKeywordsLocally(keywords);
      }

      const merged = Array.from(new Set([...keywords, ...jsonArray]));
      res.json({ success: true, keywords: merged, source: "gemini-ai" });
    } catch (err: any) {
      console.error("AI Keyword Error:", err);
      const fallback = expandKeywordsLocally(req.body.keywords || []);
      res.json({ success: true, keywords: fallback, source: "fallback" });
    }
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Telegram UserBot Manager running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
