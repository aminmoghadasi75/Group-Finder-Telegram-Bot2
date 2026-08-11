// Pre-configured Iranian & Tech/Business keyword preset lists
export const KEYWORD_PRESETS: Record<string, { label: string; keywords: string[] }> = {
  programming: {
    label: "برنامه‌نویسی و توسعه",
    keywords: ["برنامه نویسی", "توسعه دهنده", "پایتون", "ری‌اکت", "طراحی وب", "طراحی سایت", "برنامه‌نویسان", "کدنویسی", "FrontEnd", "BackEnd", "فرانت اند"]
  },
  crypto: {
    label: "ارز دیجیتال و کریپتو",
    keywords: ["ارز دیجیتال", "ترید", "بیت کوین", "کریپتو", "سیگنال کریپتو", "صرافی", "بلاکچین", "اتریوم", "تحلیل تکنیکال", "معامله گری"]
  },
  business: {
    label: "کسب و کار و بازاریابی",
    keywords: ["کسب و کار", "دیجیتال مارکتینگ", "فروشگاه آنلاین", "استارتاپ", "کارآفرینی", "بازاریابی", "سئو", "ادمین اینستاگرام", "تبلیغات"]
  },
  general_iran: {
    label: "گروه‌های عمومی و استانی",
    keywords: ["گروه تهران", "مشهد", "اصفهان", "شیراز", "تبریز", "کرج", "گپ دوستانه", "دورهمی", "کاریابی", "نیازمندیها"]
  },
  education: {
    label: "آموزش و کنکور",
    keywords: ["آموزش زبان", "کنکور", "زبان انگلیسی", "دانشجویی", "مقاله نویسی", "آیلتس", "تدریس خصوصی", "برنامه ریزی کنکور"]
  }
};

// Local AI-like fallback expander for when Gemini API key is not present
export function expandKeywordsLocally(baseKeywords: string[]): string[] {
  const result = new Set<string>();
  
  baseKeywords.forEach(kw => {
    const trimmed = kw.trim();
    if (!trimmed) return;
    result.add(trimmed);
    
    // Auto additions
    result.add(`گروه ${trimmed}`);
    result.add(`گپ ${trimmed}`);
    result.add(`انجمن ${trimmed}`);
    result.add(`${trimmed} ایران`);
  });
  
  return Array.from(result);
}
