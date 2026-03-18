'use client'

import { useEffect } from 'react'
import useAuthStore from '@/hooks/use-auth-store'

/**
 * Initialize Zustand auth store from AuthContext on mount
 * This ensures user data persists after page reload
 */
export function AuthStoreInitializer() {
  useEffect(() => {
    // Try to restore auth state from localStorage
    const storedAuth = typeof window !== 'undefined' 
      ? localStorage.getItem('auth-storage')
      : null

    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth)
        if (parsed.state?.user) {
          useAuthStore.setState({
            user: parsed.state.user,
            token: parsed.state.token,
            refreshToken: parsed.state.refreshToken,
            isAuthenticated: true,
            isLoading: false
          })
          console.log('✅ Auth store initialized from localStorage')
        }
      } catch (error) {
        console.error('❌ Failed to restore auth state:', error)
      }
    } else {
      console.log('ℹ️ No stored auth state found')
      // Mark as loaded even if no stored state
      useAuthStore.setState({ isLoading: false })
    }
  }, [])

  return null
}
