import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import vi from './vi.json'
import en from './en.json'
import zh from './zh.json'
import ja from './ja.json'
import ko from './ko.json'

// Lấy ngôn ngữ từ cookie hoặc fallback an toàn cho SSR
const getInitialLanguage = (): string => {
  // Server-side: cố gắng đọc từ cookie thông qua global hoặc fallback 'vi'
  if (typeof window === 'undefined') {
    // Nếu có thể access headers (trong App Router), đọc cookie
    try {
      const { cookies } = require('next/headers')
      const cookieStore = cookies()
      const languageCookie = cookieStore.get('language')
      if (languageCookie && ['vi', 'en', 'zh', 'ja', 'ko'].includes(languageCookie.value)) {
        return languageCookie.value
      }
    } catch (e) {
      // Fallback nếu không thể đọc cookie
    }
    return 'vi' // Server-side fallback
  }
  
  // Client-side: đọc từ cookie trước
  if (typeof document !== 'undefined') {
    const cookieLanguage = document.cookie
      .split('; ')
      .find(row => row.startsWith('language='))
      ?.split('=')[1]
    
    if (cookieLanguage && ['vi', 'en', 'zh', 'ja', 'ko'].includes(cookieLanguage)) {
      return cookieLanguage
    }
  }
  
  // Fallback to localStorage for client-side
  const stored = localStorage.getItem('selectedLanguage')
  if (stored && ['vi', 'en', 'zh', 'ja', 'ko'].includes(stored)) {
    return stored
  }
  
  return 'vi' // Ngôn ngữ mặc định
}

// Lưu ngôn ngữ vào cả cookie và localStorage
const saveLanguage = (lng: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedLanguage', lng)
  }
  
  // Lưu vào cookie để server có thể đọc được
  if (typeof document !== 'undefined') {
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1) // 1 năm
    document.cookie = `language=${lng}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
  }
}

// Khởi tạo i18n với ngôn ngữ từ server hoặc client
let initialLanguage = 'vi'

// Cố gắng lấy ngôn ngữ từ nhiều nguồn
if (typeof window === 'undefined') {
  // Server-side: cố gắng đọc từ cookie
  try {
    const { cookies } = require('next/headers')
    const cookieStore = cookies()
    const languageCookie = cookieStore.get('language')
    if (languageCookie && ['vi', 'en', 'zh', 'ja', 'ko'].includes(languageCookie.value)) {
      initialLanguage = languageCookie.value
    }
  } catch (e) {
    // Fallback nếu không access được cookie
    initialLanguage = 'vi'
  }
} else {
  // Client-side: lấy từ cookie hoặc localStorage
  initialLanguage = getInitialLanguage()
}

// Khởi tạo i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
      zh: { translation: zh },
      ja: { translation: ja },
      ko: { translation: ko },
    },
    lng: initialLanguage, // Dùng ngôn ngữ đã xác định
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false // React đã escape HTML
    },
    debug: process.env.NODE_ENV === 'development'
  })

// Lắng nghe sự kiện thay đổi ngôn ngữ để lưu vào localStorage
i18n.on('languageChanged', (lng) => {
  saveLanguage(lng)
})

export default i18n
export { getInitialLanguage, saveLanguage }