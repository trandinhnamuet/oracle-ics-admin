"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Menu, X, User, LogOut, Settings } from "lucide-react"
import { SimpleDropdown } from "@/components/ui/simple-dropdown"
import { LanguageSelector } from "@/components/ui/language-selector"
import { ThemeToggle } from "@/components/ui/theme-toggle"

import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useI18nReady } from "@/hooks/use-i18n-ready"
import { NotificationBell } from "@/components/layout/notification-bell"


export function Header() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const isI18nReady = useI18nReady() // Hook để tránh hydration mismatch

  // Không render cho đến khi i18n sẵn sàng để tránh hydration mismatch
  if (!isI18nReady) {
    return (
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            {/* Logo fallback - sử dụng text tĩnh để tránh hydration mismatch */}
            <Link href="/" className="flex items-center space-x-2">
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
            
            {/* Placeholder cho phần còn lại */}
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
    console.log('[AUTH DEBUG] ===== LOGOUT STARTED =====')
    console.log('[AUTH DEBUG] isAuthenticated before logout:', isAuthenticated)
    console.log('[AUTH DEBUG] user before logout:', user?.email)
    console.log('[AUTH DEBUG] cookies before logout:', document.cookie)
    try {
      await logout()
      console.log('[AUTH DEBUG] logout() resolved successfully')
      console.log('[AUTH DEBUG] cookies after logout:', document.cookie)
      console.log('[AUTH DEBUG] localStorage auth-storage after logout:', localStorage.getItem('auth-storage'))
      toast({
        title: t('common.logoutSuccess'),
        variant: 'success'
      })
    } catch (error: any) {
      console.error('[AUTH DEBUG] logout() threw error:', error)
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive'
      })
    }
    console.log('[AUTH DEBUG] ===== LOGOUT HANDLER DONE =====')
  }

  const handleProfileClick = () => {
    router.push('/profile')
  }

  const handleLoginClick = () => {
    console.log('[AUTH DEBUG] ===== LOGIN BUTTON CLICKED =====')
    console.log('[AUTH DEBUG] isAuthenticated:', isAuthenticated)
    console.log('[AUTH DEBUG] user:', user?.email ?? null)
    console.log('[AUTH DEBUG] cookies at login click:', document.cookie)
    console.log('[AUTH DEBUG] localStorage auth-storage:', localStorage.getItem('auth-storage'))
    const hasRefreshTokenCookie = document.cookie.includes('refreshToken')
    console.log('[AUTH DEBUG] refreshToken cookie present:', hasRefreshTokenCookie)
    if (hasRefreshTokenCookie) {
      console.warn('[AUTH DEBUG] ⚠️ refreshToken cookie still present! Middleware will redirect /login → / if this is not cleared.')
    }
    console.log('[AUTH DEBUG] Navigating to /login...')
    router.push('/login')
    console.log('[AUTH DEBUG] ===== LOGIN NAVIGATE CALLED =====')
  }

  // Scroll mượt đến section
  const handleSmoothScroll = (sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  // Scroll lên đầu trang
  const handleHomeClick = () => {
    if (window.location.pathname !== "/") {
      router.push("/")
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-background/95">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            {/* Oracle SVG Logo */}
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
                {t('header.logoSubtitle')}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              type="button"
              className="text-foreground hover:text-primary transition-colors font-medium bg-transparent border-none px-0"
              onClick={handleHomeClick}
            >
              {t('header.home')}
            </button>
            <button
              type="button"
              className="text-foreground hover:text-primary transition-colors font-medium bg-transparent border-none px-0"
              onClick={() => {
                if (window.location.pathname !== "/") {
                  router.push("/?scroll=services")
                } else {
                  handleSmoothScroll('services')
                }
              }}
            >
              {t('header.services')}
            </button>
            <button
              type="button"
              className="text-foreground hover:text-primary transition-colors font-medium bg-transparent border-none px-0"
              onClick={() => {
                if (window.location.pathname !== "/") {
                  router.push("/?scroll=pricing")
                } else {
                  handleSmoothScroll('pricing')
                }
              }}
            >
              {t('header.pricing')}
            </button>
            <button
              type="button"
              className="text-foreground hover:text-primary transition-colors font-medium bg-transparent border-none px-0"
              onClick={() => {
                if (window.location.pathname !== "/") {
                  router.push("/?scroll=support")
                } else {
                  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
                }
              }}
            >
              {t('header.support')}
            </button>
            <button
              type="button"
              className="text-foreground hover:text-primary transition-colors font-medium bg-transparent border-none px-0"
              onClick={() => router.push('/contact-info')}
            >
              {t('header.contact')}
            </button>
          </nav>

          <span className="hidden 2xl:inline-block bg-red-600 text-white font-semibold rounded-full px-4 py-1 text-sm shadow-md mr-2 select-none">
            {t('header.hotline')}
          </span>

          {/* Auth Section */}
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
                <Button variant="outline" onClick={handleLoginClick}>
                  {t('header.login')}
                </Button>
                <Button asChild>
                  <Link href="/register">{t('header.register')}</Link>
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
            <nav className="flex flex-col space-y-3">
              <button
                type="button"
                className="text-foreground hover:text-primary transition-colors font-medium bg-transparent border-none px-0 text-left"
                onClick={() => { setIsMenuOpen(false); handleHomeClick() }}
              >
                {t('header.home')}
              </button>
              <button
                type="button"
                className="text-foreground hover:text-primary transition-colors font-medium bg-transparent border-none px-0 text-left"
                onClick={() => { setIsMenuOpen(false); handleSmoothScroll('services') }}
              >
                {t('header.services')}
              </button>
              <button
                type="button"
                className="text-foreground hover:text-primary transition-colors font-medium bg-transparent border-none px-0 text-left"
                onClick={() => { setIsMenuOpen(false); handleSmoothScroll('pricing') }}
              >
                {t('header.pricing')}
              </button>
              <button
                type="button"
                className="text-foreground hover:text-primary transition-colors font-medium bg-transparent border-none px-0 text-left"
                onClick={() => { setIsMenuOpen(false); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }) }}
              >
                {t('header.support')}
              </button>
              <button
                type="button"
                className="text-foreground hover:text-primary transition-colors font-medium bg-transparent border-none px-0 text-left"
                onClick={() => { setIsMenuOpen(false); router.push('/contact-info') }}
              >
                {t('header.contact')}
              </button>
            </nav>
            <div className="mt-4 pt-4 border-t border-border space-y-3">
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
                    {t('header.logout')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{t('header.languageLabel')}</span>
                    <div className="flex items-center space-x-2">
                      <LanguageSelector />
                      <ThemeToggle />
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleLoginClick} className="w-full bg-transparent">
                    {t('header.login')}
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/register">{t('header.register')}</Link>
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
