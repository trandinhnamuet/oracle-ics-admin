"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Menu, X, User, LogOut } from "lucide-react"
import { SimpleDropdown } from "@/components/ui/simple-dropdown"
import { LanguageSelector } from "@/components/ui/language-selector"
import { ThemeToggle } from "@/components/ui/theme-toggle"

import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useI18nReady } from "@/hooks/use-i18n-ready"
import { NotificationBell } from "@/components/layout/notification-bell"

export function AdminHeader() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const isI18nReady = useI18nReady()

  if (!isI18nReady) {
    return (
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <Link href="/admin" className="flex items-center space-x-2">
              <span className="h-10 w-10 block">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 32 20">
                  <g fill="#E55844">
                    <path d="M9.9,20.1c-5.5,0-9.9-4.4-9.9-9.9c0-5.5,4.4-9.9,9.9-9.9h11.6c5.5,0,9.9,4.4,9.9,9.9c0,5.5-4.4,9.9-9.9,9.9H9.9 M21.2,16.6c3.6,0,6.4-2.9,6.4-6.4c0-3.6-2.9-6.4-6.4-6.4h-11c-3.6,0-6.4,2.9-6.4,6.4s2.9,6.4,6.4,6.4H21.2"/>
                  </g>
                </svg>
              </span>
              <div>
                <h1 className="text-xl font-bold text-foreground">...</h1>
                <p className="text-xs text-muted-foreground">...</p>
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
              <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast({ title: t('common.logoutSuccess'), variant: 'success' })
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' })
    }
  }

  const handleProfileClick = () => {
    router.push('/admin/profile')
  }

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-background/95">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/admin" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <span className="h-10 w-10 block">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 32 20">
                <g fill="#E55844">
                  <path d="M9.9,20.1c-5.5,0-9.9-4.4-9.9-9.9c0-5.5,4.4-9.9,9.9-9.9h11.6c5.5,0,9.9,4.4,9.9,9.9c0,5.5-4.4,9.9-9.9,9.9H9.9 M21.2,16.6c3.6,0,6.4-2.9,6.4-6.4c0-3.6-2.9-6.4-6.4-6.4h-11c-3.6,0-6.4,2.9-6.4,6.4s2.9,6.4,6.4,6.4H21.2"/>
                </g>
              </svg>
            </span>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {t('header.logoTitle')}
              </h1>
              <p className="text-xs text-muted-foreground">
                Admin Panel
              </p>
            </div>
          </Link>

          {/* Auth Section - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2">
                <NotificationBell />
                <SimpleDropdown
                  user={user}
                  onProfileClick={handleProfileClick}
                  onLogout={handleLogout}
                />
                <LanguageSelector />
                <ThemeToggle />
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => router.push('/login')}>
                  {t('header.login')}
                </Button>
                <LanguageSelector />
                <ThemeToggle />
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border pt-4">
            <div className="space-y-3">
              {isAuthenticated && user ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-foreground">
                      <User className="h-4 w-4" />
                      <span>{t('header.hello')}, {user.firstName || user.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <NotificationBell />
                      <LanguageSelector />
                      <ThemeToggle />
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleProfileClick} className="w-full bg-transparent">
                    <User className="h-4 w-4 mr-2" />
                    {t('header.profile')}
                  </Button>
                  <Button variant="outline" onClick={handleLogout} className="w-full bg-transparent">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('common.logout')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <LanguageSelector />
                      <ThemeToggle />
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => router.push('/login')} className="w-full bg-transparent">
                    {t('header.login')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
