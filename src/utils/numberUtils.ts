// Utility functions for normalizing Persian/Arabic digits and formatting Telegram phone numbers/codes

export function normalizePersianDigits(str: string): string {
  if (!str) return '';
  const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicNumbers  = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  
  let res = str.toString();
  for (let i = 0; i < 10; i++) {
    res = res.replace(persianNumbers[i], String(i)).replace(arabicNumbers[i], String(i));
  }
  return res;
}

export function cleanPhoneCode(code: string): string {
  if (!code) return '';
  const normalized = normalizePersianDigits(code);
  return normalized.replace(/\D/g, '').trim();
}

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  let normalized = normalizePersianDigits(phone).trim().replace(/[\s\-\(\)]/g, '');
  
  // Format local Iranian numbers (0912...) -> +98912...
  if (normalized.startsWith('09') && normalized.length === 11) {
    normalized = '+98' + normalized.substring(1);
  } else if (normalized.startsWith('989') && normalized.length === 12) {
    normalized = '+' + normalized;
  } else if (!normalized.startsWith('+') && normalized.length >= 10) {
    normalized = '+' + normalized;
  }
  return normalized;
}
