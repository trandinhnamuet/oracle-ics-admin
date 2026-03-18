'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { User, Settings, LogOut, Shield, Package, CreditCard, HeadphonesIcon } from 'lucide-react'

interface SimpleDropdownProps {
  user: any
  onProfileClick: () => void
  onLogout: () => void
}

export function SimpleDropdown({ user, onProfileClick, onLogout }: SimpleDropdownProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hoverTimeout = useRef<number | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleMouseEnter = () => {
    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current)
    setIsOpen(true)
  }
  const handleMouseLeave = () => {
    hoverTimeout.current = window.setTimeout(() => setIsOpen(false), 100)
  }

  return (
    <div
      className="relative"
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        variant="outline"
        className="flex items-center space-x-2 hover:bg-accent"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <User className="h-4 w-4" />
        <span>{t('header.hello')}, {user.firstName || user.email}</span>
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="py-1">
            <button
              onClick={() => {
                onProfileClick()
                setIsOpen(false)
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <User className="mr-2 h-4 w-4" />
              {t('header.profile')}
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => {
                  router.push('/admin')
                  setIsOpen(false)
                }}
                className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Shield className="mr-2 h-4 w-4" />
                {t('header.admin')}
              </button>
            )}
            <button
              onClick={() => {
                router.push('/package-management')
                setIsOpen(false)
              }}
              className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Package className="mr-2 h-4 w-4" />
              {t('header.packageManagement')}
            </button>

            <button
              onClick={() => {
                router.push('/support')
                setIsOpen(false)
              }}
              className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <HeadphonesIcon className="mr-2 h-4 w-4" />
              {t('header.supportRequest')}
            </button>

            {/* <button
              onClick={() => setIsOpen(false)}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="mr-2 h-4 w-4" />
              {t('header.settings')}
            </button> */}

            <hr className="my-1 border-gray-200 dark:border-gray-600" />

            <button
              onClick={() => {
                onLogout()
                setIsOpen(false)
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('header.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}