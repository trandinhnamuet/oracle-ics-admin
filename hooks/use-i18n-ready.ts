'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Hook để kiểm tra i18n đã sẵn sàng render chưa
 * Tránh hydration mismatch khi server và client có ngôn ngữ khác nhau
 */
export function useI18nReady() {
  const { i18n, ready } = useTranslation()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (ready && i18n.isInitialized) {
      // Giảm delay để cải thiện UX
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 30)
      
      return () => clearTimeout(timer)
    }
  }, [ready, i18n.isInitialized])

  return isReady
}