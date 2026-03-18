'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useAuthStore from '@/hooks/use-auth-store'
import { authApi } from '@/api/auth.api'

interface WithAuthProps {
  requireAuth?: boolean
  redirectTo?: string
  fallback?: React.ReactNode
}

function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthProps = {}
) {
  const {
    requireAuth = true,
    redirectTo = '/login',
    fallback = <div className="flex items-center justify-center min-h-screen">Đang tải...</div>
  } = options

  return function AuthenticatedComponent(props: P) {
    const router = useRouter()
    const { user, isAuthenticated, token, login, logout, setLoading } = useAuthStore()
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
      const checkAuth = async () => {
        try {
          setLoading(true)
          
          // Nếu có token nhưng chưa có user info, fetch user data
          if (token && !user) {
            try {
              const userData = await authApi.getCurrentUser()
              login(userData, token)
            } catch (error) {
              console.error('Failed to fetch user data:', error)
              logout()
            }
          }
          
          // Nếu requireAuth = true và user chưa đăng nhập
          if (requireAuth && !isAuthenticated) {
            const returnUrl = window.location.pathname
            router.push(`${redirectTo}?returnUrl=${encodeURIComponent(returnUrl)}`)
            return
          }
          
          // Nếu requireAuth = false và user đã đăng nhập (guest-only pages)
          if (!requireAuth && isAuthenticated) {
            router.push('/')
            return
          }
          
        } catch (error) {
          console.error('Auth check failed:', error)
          if (requireAuth) {
            logout()
            router.push(redirectTo)
          }
        } finally {
          setLoading(false)
          setIsChecking(false)
        }
      }

      checkAuth()
    }, [token, isAuthenticated, user, requireAuth, redirectTo, router, login, logout, setLoading])

    // Nếu đang kiểm tra auth, hiển thị fallback
    if (isChecking) {
      return <>{fallback}</>
    }

    // Nếu requireAuth = true và chưa authenticate, không render component
    if (requireAuth && !isAuthenticated) {
      return <>{fallback}</>
    }

    // Nếu requireAuth = false và đã authenticate (guest-only), không render component
    if (!requireAuth && isAuthenticated) {
      return <>{fallback}</>
    }

    // Render component nếu auth check passed
    return <Component {...props} />
  }
}

export default withAuth

// Hook để check auth trong các component
export function useAuth() {
  const authStore = useAuthStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      try {
        authStore.initAuth()
        
        // Nếu có token nhưng chưa có user, fetch user data
        if (authStore.token && !authStore.user) {
          try {
            const userData = await authApi.getCurrentUser()
            authStore.login(userData, authStore.token)
          } catch (error) {
            console.error('Failed to fetch user data:', error)
            authStore.logout()
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    initAuth()
  }, [])

  return {
    ...authStore,
    isInitialized
  }
}

// Utility function để check permissions
export function hasPermission(
  user: any,
  requiredRole: string | string[]
): boolean {
  if (!user || !user.role) return false
  
  const userRole = user.role
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  
  return requiredRoles.includes(userRole)
}

// Component để hiển thị nội dung dựa trên role
interface ProtectedContentProps {
  children: React.ReactNode
  requiredRole?: string | string[]
  fallback?: React.ReactNode
}

export function ProtectedContent({ 
  children, 
  requiredRole,
  fallback = null 
}: ProtectedContentProps) {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <>{fallback}</>
  }

  if (requiredRole && !hasPermission(user, requiredRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}