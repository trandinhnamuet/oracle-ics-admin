"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { authService, type User } from "@/services/auth.service"
import useAuthStore from "@/hooks/use-auth-store"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  logoutAll: () => Promise<void>
  refreshToken: () => Promise<void>
  updateUser: (updatedFields: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Auto-refresh token every 14 minutes (before 15min expiration)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      try {
        await authService.refresh()
      } catch (error) {
        console.error("Auto-refresh failed:", error)
        setUser(null)
        authService.clearAccessToken()
      }
    }, 14 * 60 * 1000) // 14 minutes

    return () => clearInterval(interval)
  }, [user])

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Kiểm tra xem có access token không
        let accessToken = authService.getAccessToken()
        
        // Nếu không có access token, thử refresh từ cookie
        if (!accessToken) {
          console.log('⚠️ No access token found, attempting to refresh from cookie...')
          try {
            const newToken = await authService.refresh()
            accessToken = newToken
            console.log('✅ Access token refreshed successfully')
            
            // Sync access token to Zustand store
            useAuthStore.setState({
              token: accessToken,
              isAuthenticated: true,
              isLoading: false
            })
          } catch (refreshError) {
            console.log('❌ No valid refresh token in cookie')
            // Không có refresh token hợp lệ, clear state
            setUser(null)
            useAuthStore.setState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              token: null
            })
            setIsLoading(false)
            return
          }
        }
        
        // Lấy thông tin user với access token (mới hoặc đã có)
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)
        
        // Sync to Zustand store
        if (currentUser) {
          useAuthStore.setState({
            user: currentUser,
            isAuthenticated: true,
            isLoading: false,
            token: accessToken || 'from-httponly-cookie'
          })
          console.log('✅ User synced to store:', currentUser)
        } else {
          // Không lấy được user, clear state
          setUser(null)
          useAuthStore.setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            token: null
          })
        }
      } catch (error) {
        setUser(null)
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          token: null
        })
        console.warn('❌ Auth check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('🔐 [AUTH CONTEXT] Starting login for:', email)
      const response = await authService.login(email, password)
      console.log('🔐 [AUTH CONTEXT] Got response:', { hasUser: !!response.user, hasToken: !!response.accessToken })
      
      // Check if email verification is required
      if (response.requiresVerification) {
        console.log('⚠️ Login requires verification, redirecting to OTP page...')
        // Store email for OTP verification page
        if (typeof window !== 'undefined') {
          localStorage.setItem('pendingVerificationEmail', response.email || email)
          localStorage.setItem('pendingVerificationMessage', response.message || '')
        }
        // Redirect to OTP verification page immediately
        router.push(`/verify-otp?email=${encodeURIComponent(response.email || email)}`)
        // Throw a special error to let login page know about redirect
        throw new Error('VERIFICATION_REQUIRED')
      }
      
      // Normal login flow
      if (response.user) {
        console.log('🔐 [AUTH CONTEXT] User authenticated:', response.user.email)
        setUser(response.user)
        // Sync to Zustand store
        useAuthStore.setState({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          token: 'from-httponly-cookie'
        })
        console.log('✅ [AUTH CONTEXT] Hard redirecting to /admin...')
        // Use hard redirect so browser sends a fresh request with the new admin cookie.
        // client-side router.push can race with the Set-Cookie from the login response,
        // causing the middleware to still see the old (non-admin) refreshToken.
        window.location.replace('/admin')
      } else {
        // Should not happen, but handle gracefully
        console.error('❌ [AUTH CONTEXT] No user data in response')
        throw new Error('Login failed - no user data returned')
      }
    } catch (error) {
      console.error('❌ [AUTH CONTEXT] Login error:', error)
      throw error
    }
  }, [router])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
      // Clear all auth state from Zustand store
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        token: null
      })
      // Clear localStorage completely
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage')
      }
      router.push("/login")
    }
  }, [router])

  const logoutAll = useCallback(async () => {
    try {
      await authService.logoutAll()
    } finally {
      setUser(null)
      // Clear all auth state from Zustand store
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        token: null
      })
      // Clear localStorage completely
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage')
      }
      router.push("/login")
    }
  }, [router])

  const refreshToken = useCallback(async () => {
    try {
      await authService.refresh()
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
      throw error
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        logoutAll,
        refreshToken,
        updateUser: (updatedFields) => setUser(prev => prev ? { ...prev, ...updatedFields } : prev),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push("/login")
      }
    }, [isAuthenticated, isLoading, router])

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      )
    }

    if (!isAuthenticated) {
      return null
    }

    return <Component {...props} />
  }
}
