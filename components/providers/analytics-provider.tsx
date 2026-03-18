'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initializeGA, trackPageView, trackScrollDepth, trackPageLoadTime } from '@/services/analytics.service'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Initialize Google Analytics on mount
  useEffect(() => {
    initializeGA()
    trackPageLoadTime()
  }, [])

  // Track page views when pathname changes
  useEffect(() => {
    trackPageView({
      page_path: pathname,
      page_title: document.title,
    })

    // Track scroll depth for engagement metrics
    const unsubscribe = trackScrollDepth()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [pathname])

  return <>{children}</>
}
