'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface Language {
  code: string
  name: string
  flag: string
}

const languages: Language[] = [
  { code: 'vi', name: 'Tiếng Việt', flag: '/flag-vietnam.webp' },
  { code: 'en', name: 'English', flag: '/flag-united-state.png' },
  { code: 'zh', name: '中文', flag: '/flag-china.png' },
  { code: 'ko', name: '한국어', flag: '/flag-korea.png' },
  { code: 'ja', name: '日本語', flag: '/flag-japan.png' },
]

export function LanguageSelector() {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState(i18n.language)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0]

  const handleLanguageChange = (languageCode: string) => {
    // Lưu ngôn ngữ vào localStorage trước khi thay đổi
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedLanguage', languageCode)
    }
    i18n.changeLanguage(languageCode)
    setCurrentLang(languageCode)
    setIsOpen(false)
  }

  // Theo dõi thay đổi ngôn ngữ từ i18n
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setCurrentLang(lng)
    }

    i18n.on('languageChanged', handleLanguageChanged)
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [i18n])

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div 
      className="relative" 
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button 
        variant="outline" 
        size="sm" 
        className="w-10 h-10 p-0 flex items-center justify-center"
      >
        <img
          src={currentLanguage.flag}
          alt={currentLanguage.name}
          className="w-6 h-6 object-cover rounded"
        />
      </Button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className="flex items-center w-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md text-left"
            >
              <img
                src={language.flag}
                alt={language.name}
                className="w-5 h-5 object-cover rounded mr-2"
              />
              <span className="text-sm">{language.name}</span>
              {language.code === currentLang && (
                <span className="ml-auto text-xs text-blue-600">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}