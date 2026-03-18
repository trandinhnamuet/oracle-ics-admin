'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

/**
 * Provider để handle unauthorized errors ở cấp global
 * Catch 401 errors từ API calls và redirect về login
 */
export function UnauthorizedHandler({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { logout } = useAuth()

  useEffect(() => {
    // Setup global error handler
    const handleUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail?.status === 401) {
        console.log('🔴 Global: Unauthorized detected, logging out...')
        logout()
        router.push('/login')
      }
    }

    window.addEventListener('unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized)
    }
  }, [logout, router])

  return <>{children}</>
}
