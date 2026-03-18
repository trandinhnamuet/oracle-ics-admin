/**
 * Token Expiry Utility Functions
 * Các utility functions để kiểm tra và quản lý token expiry
 */

/**
 * Decode JWT token và lấy payload
 * @param token JWT token string
 * @returns Decoded payload object hoặc null nếu invalid
 */
export function decodeJWT(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = parts[1]
    const decoded = JSON.parse(atob(payload))
    return decoded
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Kiểm tra token có hết hạn không
 * @param token JWT token string
 * @returns true nếu token đã hết hạn, false nếu còn hạn
 */
export function isTokenExpired(token: string): boolean {
  // Token placeholder từ httpOnly cookie không cần check expiry
  // Backend sẽ validate qua cookie
  if (token === 'token-in-httponly-cookie') {
    return false
  }
  
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) return true
  
  const expiry = payload.exp * 1000 // Convert seconds to milliseconds
  const now = Date.now()
  
  return expiry <= now
}

/**
 * Lấy thời gian còn lại của token (tính bằng milliseconds)
 * @param token JWT token string
 * @returns Thời gian còn lại (ms) hoặc -1 nếu invalid
 */
export function getTokenTimeRemaining(token: string): number {
  // Token placeholder từ httpOnly cookie không cần check expiry
  if (token === 'token-in-httponly-cookie') {
    return 24 * 60 * 60 * 1000 // Return 24 hours (giá trị giả)
  }
  
  const payload = decodeJWT(token)
  if (!payload || !payload.exp) return -1
  
  const expiry = payload.exp * 1000
  const now = Date.now()
  
  return expiry - now
}

/**
 * Lấy thời gian còn lại của token (dạng readable string)
 * @param token JWT token string
 * @returns String mô tả thời gian (e.g. "23h 45m" hoặc "5m 30s")
 */
export function getTokenTimeRemainingFormatted(token: string): string {
  const remaining = getTokenTimeRemaining(token)
  
  if (remaining <= 0) return 'Expired'
  if (remaining < 0) return 'Invalid'
  
  const seconds = Math.floor(remaining / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  
  return `${seconds}s`
}

/**
 * Kiểm tra token sắp hết hạn không (< threshold)
 * @param token JWT token string
 * @param thresholdMs Threshold time in milliseconds (default: 5 minutes)
 * @returns true nếu token sắp hết hạn
 */
export function isTokenExpiringSoon(token: string, thresholdMs: number = 5 * 60 * 1000): boolean {
  const remaining = getTokenTimeRemaining(token)
  return remaining > 0 && remaining < thresholdMs
}

/**
 * Lấy thông tin chi tiết của token
 * @param token JWT token string
 * @returns Object chứa tất cả thông tin token
 */
export function getTokenInfo(token: string): {
  isValid: boolean
  isExpired: boolean
  isExpiringSoon: boolean
  payload: Record<string, any> | null
  expiryTime: Date | null
  timeRemaining: number
  timeRemainingFormatted: string
} {
  const payload = decodeJWT(token)
  const isValid = !!payload
  const isExpired = isTokenExpired(token)
  const isExpiringSoon = isTokenExpiringSoon(token)
  const remaining = getTokenTimeRemaining(token)
  const expiryTime = payload?.exp ? new Date(payload.exp * 1000) : null
  
  return {
    isValid,
    isExpired,
    isExpiringSoon,
    payload,
    expiryTime,
    timeRemaining: remaining,
    timeRemainingFormatted: getTokenTimeRemainingFormatted(token),
  }
}
