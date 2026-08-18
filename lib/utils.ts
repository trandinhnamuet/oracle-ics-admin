import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getTokenInfo } from './token-expiry'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse timestamp từ API theo chuẩn UTC:
 * - Có timezone info (Z, +HH:MM, -HH:MM): parse trực tiếp
 * - Không có timezone info: coi là UTC
 */
export function parseAsUtc(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr
  const s = dateStr.trim()
  // Đã có timezone info (Z, +HH:MM, -HH:MM) → parse trực tiếp
  if (/Z$/i.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s)
  // Không có timezone info -> coi là UTC
  if (s.includes('T')) return new Date(s + 'Z')
  return new Date(s.replace(' ', 'T') + 'Z')
}

/**
 * Format ngày + giờ theo múi giờ local của browser.
 */
export function formatDateTime(dateStr: string | Date, locale?: string): string {
  if (!dateStr) return '-'
  try {
    return parseAsUtc(dateStr).toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '-'
  }
}

/**
 * Format chỉ ngày (không giờ), tự động convert sang múi giờ của browser.
 */
export function formatDateOnly(dateStr: string | Date, locale?: string): string {
  if (!dateStr) return '-'
  try {
    return parseAsUtc(dateStr).toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return '-'
  }
}

// Format price consistently for both server and client
export function formatPrice(price: string | number): string {
  if (typeof price === 'string' && price === "Liên hệ") {
    return price
  }
  
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  
  // Round to nearest integer and format with comma as thousand separator
  return Math.round(numPrice).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Làm tròn số tiền về hàng nghìn (000), mặc định làm tròn lên,
 * nhưng nếu làm tròn lên khiến hàng chục nghìn (0000) tăng 1 thì làm tròn xuống.
 * @param amount Số tiền cần làm tròn
 * @returns Số tiền đã làm tròn
 */
export function roundMoney(amount: number): number {
  const roundedUp = Math.ceil(amount / 1000) * 1000;
  const roundedDown = Math.floor(amount / 1000) * 1000;
  // Nếu làm tròn lên khiến hàng 0000 tăng 1, thì làm tròn xuống
  const upTenThousands = Math.floor(roundedUp / 10000);
  const curTenThousands = Math.floor(amount / 10000);
  if (upTenThousands > curTenThousands) {
    return roundedDown;
  }
  return roundedUp;

}

/**
 * In ra các biến môi trường client-side (NEXT_PUBLIC_*)
 * Có thể gọi từ console trình duyệt: printEnv()
 */
export function printEnv() {
  const env: Record<string, string | undefined> = {};
  
  // Chỉ lấy các biến môi trường NEXT_PUBLIC_* (có thể truy cập từ client)
  if (typeof window !== 'undefined') {
    console.log('🔍 Debug process.env:', process.env);
    
    for (const key in process.env) {
      if (key.startsWith('NEXT_PUBLIC_')) {
        env[key] = process.env[key];
      }
    }
    
    // Thử truy cập trực tiếp
    const directAccess = process.env.NEXT_PUBLIC_API_URL;
    console.log('🎯 Direct access NEXT_PUBLIC_API_URL:', directAccess);
    
    console.log('🌍 Client Environment Variables:', env);
    console.log('📝 Tip: Only NEXT_PUBLIC_* variables are accessible on client side');
    return env;
  } else {
    console.log('❌ printEnv() should be called on client side only');
    return {};
  }
}

/**
 * In ra thông tin user hiện tại đang đăng nhập + token expiry info
 * Có thể gọi từ console trình duyệt: userInfo()
 */
// NOTE: the authentication debug helper userInfo() was REMOVED (2026-08-18).
// It printed account and session details to the browser console, which is readable by
// XSS payloads, browser extensions, remote debuggers and support screen-shares.
// Guarding it behind a NODE_ENV check was not enough: static analysis still flags the
// console.log calls in source, and the code shipped in the bundle either way.
