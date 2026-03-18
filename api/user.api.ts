import { fetchWithAuth, fetchJsonWithAuth } from '@/lib/fetch-wrapper'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

// Toggle admin role for user
export const toggleUserAdminRole = async (userId: number, currentRole: string) => {
  const newRole = currentRole === 'admin' ? 'customer' : 'admin'
  
  try {
    const result = await fetchJsonWithAuth<any>(`${API_URL}/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        role: newRole
      })
    })
    return result
  } catch (error) {
    console.error('Error toggling user admin role:', error)
    throw error
  }
}

// Get user by ID
export const getUserById = async (userId: number) => {
  try {
    const result = await fetchJsonWithAuth<any>(`${API_URL}/users/${userId}`, {
      method: 'GET'
    })
    return result
  } catch (error) {
    console.error('Error fetching user:', error)
    throw error
  }
}

// Get all users
export const getAllUsers = async (params?: { limit?: number; page?: number; search?: string }) => {
  try {
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.page) query.set('page', String(params.page))
    if (params?.search) query.set('search', params.search)
    const qs = query.toString()
    const result = await fetchJsonWithAuth<any>(`${API_URL}/users${qs ? `?${qs}` : ''}`, {
      method: 'GET'
    })
    return result
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

// Update own profile (authenticated)
export const updateUserProfile = async (data: {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  company?: string
  gender?: string
  idCard?: string
  backupEmail?: string
  address?: string
}) => {
  try {
    const result = await fetchJsonWithAuth<any>(`${API_URL}/users/me/profile`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
    return result
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

// Change own password (authenticated)
export const changePassword = async (data: {
  currentPassword: string
  newPassword: string
}) => {
  try {
    const result = await fetchJsonWithAuth<any>(`${API_URL}/users/me/change-password`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
    return result
  } catch (error) {
    console.error('Error changing password:', error)
    throw error
  }
}

// Update user avatar
export const updateUserAvatar = async (userId: number, avatarUrl: string) => {
  try {
    const result = await fetchJsonWithAuth<any>(`${API_URL}/users/${userId}/avatar`, {
      method: 'PUT',
      body: JSON.stringify({
        avatarUrl
      })
    })
    return result
  } catch (error) {
    console.error('Error updating user avatar:', error)
    throw error
  }
}