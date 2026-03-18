import { fetchJsonWithAuth } from '@/lib/fetch-wrapper'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

export interface AdminLoginHistoryQuery {
  page?: number
  limit?: number
  adminId?: number
  status?: 'success' | 'failed' | 'locked'
  startDate?: string
  endDate?: string
  sortBy?: 'loginTime' | 'username' | 'status'
  sortOrder?: 'ASC' | 'DESC'
}

export interface AdminLoginHistoryRecord {
  id: number
  adminId: number
  username: string
  role: string
  loginTime: string
  loginStatus: 'success' | 'failed' | 'locked'
  admin?: {
    id: number
    firstName: string
    lastName: string
    email: string
  }
  ipV4: string | null
  ipV6: string | null
  country: string | null
  city: string | null
  isp: string | null
  browser: string
  os: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  userAgent: string
  twoFaStatus: 'pending' | 'passed' | 'failed' | 'not_enabled'
  sessionId: string
  isNewDevice: boolean
  logoutTime: string | null
  sessionDurationMinutes: number | null
  failedAttemptsBeforeSuccess: number
  createdAt: string
  updatedAt: string
}

export interface AdminLoginStatistics {
  totalLogins: number
  successfulLogins: number
  failedLogins: number
  lockedAttempts: number
  successRate: number
  lastLoginTime: string | null
  lastLoginIp: string | null
  uniqueDevices: number
  uniqueCountries: number
  activeSessions: number
}

/**
 * Get all admin login history with filters and pagination
 */
export const getLoginHistory = async (query: AdminLoginHistoryQuery) => {
  try {
    const params = new URLSearchParams()
    if (query.page) params.append('page', query.page.toString())
    if (query.limit) params.append('limit', query.limit.toString())
    if (query.adminId) params.append('adminId', query.adminId.toString())
    if (query.status) params.append('status', query.status)
    if (query.startDate) params.append('startDate', query.startDate)
    if (query.endDate) params.append('endDate', query.endDate)
    if (query.sortBy) params.append('sortBy', query.sortBy)
    if (query.sortOrder) params.append('sortOrder', query.sortOrder)

    const result = await fetchJsonWithAuth<any>(
      `${API_URL}/auth/admin-login-history/all?${params.toString()}`,
      {
        method: 'GET'
      }
    )
    return result
  } catch (error) {
    console.error('Error fetching login history:', error)
    throw error
  }
}

/**
 * Get login history for a specific admin
 */
export const getAdminLoginHistory = async (adminId: number, query?: AdminLoginHistoryQuery) => {
  try {
    const params = new URLSearchParams()
    if (query?.page) params.append('page', query.page.toString())
    if (query?.limit) params.append('limit', query.limit.toString())
    if (query?.status) params.append('status', query.status)
    if (query?.startDate) params.append('startDate', query.startDate)
    if (query?.endDate) params.append('endDate', query.endDate)
    if (query?.sortBy) params.append('sortBy', query.sortBy)
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder)

    const result = await fetchJsonWithAuth<any>(
      `${API_URL}/auth/admin-login-history/admin/${adminId}?${params.toString()}`,
      {
        method: 'GET'
      }
    )
    return result
  } catch (error) {
    console.error(`Error fetching login history for admin ${adminId}:`, error)
    throw error
  }
}

/**
 * Get login statistics for a specific admin
 */
export const getLoginStatistics = async (adminId: number, days: number = 30) => {
  try {
    const result = await fetchJsonWithAuth<AdminLoginStatistics>(
      `${API_URL}/auth/admin-login-history/admin/${adminId}/statistics?days=${days}`,
      {
        method: 'GET'
      }
    )
    return result
  } catch (error) {
    console.error(`Error fetching login statistics for admin ${adminId}:`, error)
    throw error
  }
}

/**
 * Get suspicious login attempts for a specific admin
 */
export const getSuspiciousAttempts = async (adminId: number) => {
  try {
    const result = await fetchJsonWithAuth<AdminLoginHistoryRecord[]>(
      `${API_URL}/auth/admin-login-history/admin/${adminId}/suspicious`,
      {
        method: 'GET'
      }
    )
    return result
  } catch (error) {
    console.error(`Error fetching suspicious attempts for admin ${adminId}:`, error)
    throw error
  }
}

/**
 * Get a single login record
 */
export const getLoginRecord = async (id: number) => {
  try {
    const result = await fetchJsonWithAuth<AdminLoginHistoryRecord>(
      `${API_URL}/auth/admin-login-history/${id}`,
      {
        method: 'GET'
      }
    )
    return result
  } catch (error) {
    console.error(`Error fetching login record ${id}:`, error)
    throw error
  }
}

/**
 * Get recent login records for a specific admin
 */
export const getRecentLogins = async (adminId: number, days: number = 30) => {
  try {
    const result = await fetchJsonWithAuth<AdminLoginHistoryRecord[]>(
      `${API_URL}/auth/admin-login-history/admin/${adminId}/recent?days=${days}`,
      {
        method: 'GET'
      }
    )
    return result
  } catch (error) {
    console.error(`Error fetching recent logins for admin ${adminId}:`, error)
    throw error
  }
}

/**
 * Record logout for a session
 */
export const recordLogout = async (sessionId: string) => {
  try {
    const result = await fetchJsonWithAuth<any>(
      `${API_URL}/auth/admin-login-history/${sessionId}/logout`,
      {
        method: 'POST',
        body: JSON.stringify({})
      }
    )
    return result
  } catch (error) {
    console.error(`Error recording logout for session ${sessionId}:`, error)
    throw error
  }
}
