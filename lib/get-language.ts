import { cookies } from 'next/headers'

/**
 * Lấy ngôn ngữ hiện tại từ cookie (server-side safe)
 */
export function getLanguage(): string {
  try {
    const cookieStore = cookies()
    const languageCookie = cookieStore.get('language')
    
    if (languageCookie && ['vi', 'en', 'zh', 'ja', 'ko'].includes(languageCookie.value)) {
      return languageCookie.value
    }
  } catch (e) {
    // Fallback nếu không thể đọc cookie
  }
  
  return 'vi' // Mặc định
}