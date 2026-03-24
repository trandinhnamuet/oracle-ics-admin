"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Menu, X, User, LogOut, ChevronDown,
  LayoutDashboard, Users, CreditCard, Package,
  Wallet, LifeBuoy, ArrowLeftRight, BarChart2,
  History, Activity, Server, DollarSign, FileText, UserPlus
} from "lucide-react"
import { LanguageSelector } from "@/components/ui/language-selector"
import { ThemeToggle } from "@/components/ui/theme-toggle"

import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useI18nReady } from "@/hooks/use-i18n-ready"
import { NotificationBell } from "@/components/layout/notification-bell"

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/packages", label: "Packages", icon: Package },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/wallet-transactions", label: "Wallet Transactions", icon: ArrowLeftRight },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/support-tickets", label: "Support Tickets", icon: LifeBuoy },
  { href: "/admin/login-history", label: "Login History", icon: History },
  { href: "/admin/bandwidth-management", label: "Bandwidth", icon: Activity },
  { href: "/admin/compartment", label: "Compartment", icon: Server },
  { href: "/admin/costs", label: "Costs", icon: DollarSign },
  { href: "/admin/terms", label: "Terms", icon: FileText },
  { href: "/admin/custom-registration", label: "Custom Registration", icon: UserPlus },
]

export function AdminHeader() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { user, isAuthenticated, logout } = useAuth()
  const isI18nReady = useI18nReady()

  const handleDropdownEnter = () => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current)
    setIsUserDropdownOpen(true)
  }

  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => setIsUserDropdownOpen(false), 150)
  }

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
      toast({ title: t('header.logoutSuccess'), variant: 'success' })
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' })
    }
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
                {t('header.adminPanel')}
              </p>
            </div>
          </Link>

          {/* Auth Section - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2">
                <NotificationBell />

                {/* User dropdown */}
                <div
                  className="relative"
                  onMouseEnter={handleDropdownEnter}
                  onMouseLeave={handleDropdownLeave}
                >
                  <button
                    className="flex items-center space-x-2 text-sm border border-border rounded-md px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.firstName || user.email}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isUserDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isUserDropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-1 w-56 rounded-md border border-border bg-popover shadow-lg z-50 py-1"
                      onMouseEnter={handleDropdownEnter}
                      onMouseLeave={handleDropdownLeave}
                    >
                      {adminNavItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center space-x-2.5 px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => setIsUserDropdownOpen(false)}
                          >
                            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        )
                      })}
                      <div className="border-t border-border mt-1 pt-1">
                        <button
                          onClick={() => { setIsUserDropdownOpen(false); handleLogout() }}
                          className="flex items-center space-x-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
                        >
                          <LogOut className="h-4 w-4 flex-shrink-0" />
                          <span>{t('header.logout')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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
                  <div className="grid grid-cols-2 gap-1">
                    {adminNavItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center space-x-2 px-3 py-2 text-sm text-foreground rounded-md hover:bg-accent transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                  <Button variant="outline" onClick={handleLogout} className="w-full bg-transparent">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('header.logout')}
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
