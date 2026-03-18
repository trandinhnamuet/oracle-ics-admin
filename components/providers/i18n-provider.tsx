'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import '@/i18n'

interface I18nProviderProps {
  children: ReactNode
  initialLanguage?: string
}

export function I18nProvider({ children, initialLanguage = 'vi' }: I18nProviderProps) {
  const { i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [isHydrating, setIsHydrating] = useState(true)

  // Đồng bộ ngôn ngữ server-provided ngay khi component mount
  useEffect(() => {
    // Đảm bảo i18n sử dụng đúng ngôn ngữ từ server
    if (i18n.language !== initialLanguage) {
      i18n.changeLanguage(initialLanguage, () => {
        console.log(`I18n synchronized to: ${initialLanguage}`)
      })
    }
    
    setMounted(true)
    
    // Chờ hydration hoàn tất trước khi cho phép thay đổi ngôn ngữ
    const timer = setTimeout(() => {
      setIsHydrating(false)
    }, 200) // Tăng delay để đảm bảo hydration hoàn tất
    
    return () => clearTimeout(timer)
  }, [i18n, initialLanguage])

  // CHỈ sau khi hydration hoàn tất mới cho phép đồng bộ với client storage
  useEffect(() => {
    if (!isHydrating && mounted && typeof window !== 'undefined') {
      const cookieLanguage = document.cookie
        .split('; ')
        .find(row => row.startsWith('language='))
        ?.split('=')[1]
      
      const localStorageLanguage = localStorage.getItem('selectedLanguage')
      const targetLanguage = cookieLanguage || localStorageLanguage || initialLanguage
      
      if (['vi', 'en', 'zh', 'ja', 'ko'].includes(targetLanguage)) {
        // Chỉ thay đổi ngôn ngữ nếu khác với hiện tại VÀ khác với server
        if (i18n.language !== targetLanguage && targetLanguage !== initialLanguage) {
          i18n.changeLanguage(targetLanguage)
        }
        
        // Đồng bộ storage
        localStorage.setItem('selectedLanguage', targetLanguage)
        if (!cookieLanguage || cookieLanguage !== targetLanguage) {
          const expires = new Date()
          expires.setFullYear(expires.getFullYear() + 1)
          document.cookie = `language=${targetLanguage}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
        }
      }
    }
  }, [isHydrating, mounted, i18n, initialLanguage])

  // Lắng nghe sự kiện thay đổi ngôn ngữ để lưu vào localStorage
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedLanguage', lng)
      }
    }

    i18n.on('languageChanged', handleLanguageChange)
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [i18n])

  // Tránh hydration mismatch bằng cách chờ hydration hoàn tất
  if (!mounted || isHydrating) {
    return <>{children}</>
  }

  return <>{children}</>
}