import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import Cookies from 'js-cookie'

interface User {
  id: number
  email: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  company?: string
  avatar?: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
  role?: string
  isActive?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  setUser: (user: User) => void
  setToken: (token: string) => void
  setRefreshToken: (token: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  login: (user: User, token: string, refreshToken?: string) => void
  logout: () => void
  clearError: () => void
  initAuth: () => void
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      // Actions
      setUser: (user: User) => {
        set({ user, isAuthenticated: true })
      },

      setToken: (token: string) => {
        set({ token })
      },

      setRefreshToken: (refreshToken: string) => {
        set({ refreshToken })
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading })
      },

      setError: (error: string | null) => {
        set({ error })
      },

      login: (user: User, token: string, refreshToken?: string) => {
        console.log('🔐 Login action called with user:', user, 'token:', token)
        set({ 
          user, 
          token, 
          refreshToken: refreshToken || token,
          isAuthenticated: true,
          error: null
        })
        console.log('✅ Auth state updated in store')
      },

      logout: () => {
        console.log('🔓 Logout action called')
        set({ 
          user: null, 
          token: null, 
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          isLoading: false
        })
        // Clear cookies
        Cookies.remove('access_token')
        Cookies.remove('refresh_token')
        Cookies.remove('auth-token') // Cleanup legacy
      },

      clearError: () => {
        set({ error: null })
      },

      initAuth: () => {
        // Khôi phục state từ localStorage
        const storedState = typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null
        if (storedState) {
          try {
            const parsed = JSON.parse(storedState)
            if (parsed.state?.user && parsed.state?.isAuthenticated) {
              set({ 
                user: parsed.state.user,
                isAuthenticated: parsed.state.isAuthenticated,
                token: parsed.state.token || 'token-in-httponly-cookie',
                refreshToken: parsed.state.refreshToken || 'token-in-httponly-cookie'
              })
              console.log('✅ Auth state restored from localStorage')
            }
          } catch (error) {
            console.error('❌ Failed to parse auth-storage:', error)
          }
        }
      }
    }),
    {
      name: 'auth-storage',
      // Persist user info và tokens
      partialize: (state: any) => ({ 
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
)

export default useAuthStore
export type { User, AuthState }
