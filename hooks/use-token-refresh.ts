import { useEffect } from 'react'
import { authApi } from '@/api/auth.api'
import useAuthStore from './use-auth-store'

/**
 * Hook để tự động gia hạn token trước khi hết hạn
 * Kiểm tra mỗi phút - nếu token sắp hết hạn, thực hiện refresh
 */
export function useTokenRefresh() {
  const { token, refreshToken, setToken } = useAuthStore()

  useEffect(() => {
    // Nếu không có token, không cần check
    if (!token || token === 'token-in-httponly-cookie') {
      console.log('⚠️ No access token in store, skipping token refresh check')
      return
    }

    let refreshInterval: NodeJS.Timeout

    const checkAndRefreshToken = async () => {
      try {
        // Try refresh token - backend sẽ validate access_token từ cookie
        const refreshResponse = await authApi.refreshToken()
        if (refreshResponse.access_token) {
          // Update token in store
          setToken(refreshResponse.access_token)
          console.log('✅ Token đã được refresh thành công')
        }
      } catch (error) {
        console.error('❌ Không thể refresh token:', error)
        // Logout sẽ được handle bởi API interceptor khi 401
      }
    }

    // Check token refresh mỗi 5 phút (với access token 24h, làm mới trước 6h)
    // Mục đích: keep access token fresh
    refreshInterval = setInterval(checkAndRefreshToken, 5 * 60 * 1000)

    // Cleanup
    return () => clearInterval(refreshInterval)
  }, [token, refreshToken, setToken])
}