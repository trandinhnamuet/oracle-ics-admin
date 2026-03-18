import { fetchWithAuth, fetchJsonWithAuth } from '@/lib/fetch-wrapper'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

// Cache để tránh duplicate API calls
const balanceCache = new Map<string, { data: { balance: number }, timestamp: number }>()
const CACHE_DURATION = 1000 // 1 giây

export interface UserWallet {
  id: number
  user_id: number
  balance: number
  created_at: string
  updated_at: string
  user?: {
    id: number
    email: string
    firstName?: string
    lastName?: string
    username?: string
  }
}

export interface WalletTransaction {
  id: string
  wallet_id: number
  payment_id: string
  change_amount: number
  balance_after: number
  type: string
  created_at: string
  wallet?: {
    id: number
    user_id: number
    user?: {
      id: number
      email: string
      firstName?: string
      lastName?: string
      username?: string
    }
  }
}

// Get user wallet by user ID
export const getUserWallet = async (userId?: number): Promise<UserWallet> => {
  try {
    const url = userId ? `${API_URL}/user-wallets/user/${userId}` : `${API_URL}/user-wallets/my-wallet`
    return await fetchJsonWithAuth<UserWallet>(url, {
      method: 'GET',
    })
  } catch (error) {
    console.error('Error fetching user wallet:', error)
    throw error
  }
}

// Get user balance
export const getUserBalance = async (userId?: number): Promise<{ balance: number }> => {
  try {
    const url = userId ? `${API_URL}/user-wallets/user/${userId}/balance` : `${API_URL}/user-wallets/my-balance`
    const cacheKey = `balance_${userId || 'me'}`
    const now = Date.now()
    
    // Kiểm tra cache
    const cached = balanceCache.get(cacheKey)
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('Returning cached balance for:', cacheKey)
      return cached.data
    }
    
    const data = await fetchJsonWithAuth<{ balance: number }>(url, {
      method: 'GET',
    })
    
    // Cache kết quả
    balanceCache.set(cacheKey, { data: data || { balance: 0 }, timestamp: now })
    
    return data || { balance: 0 }
  } catch (error) {
    console.error('Error fetching user balance:', error)
    throw error
  }
}

// Get wallet transactions
export const getWalletTransactions = async (userId?: number): Promise<WalletTransaction[]> => {
  try {
    const url = userId ? `${API_URL}/wallet-transactions/user/${userId}` : `${API_URL}/wallet-transactions/my-transactions`
    return await fetchJsonWithAuth<WalletTransaction[]>(url, {
      method: 'GET',
    })
  } catch (error) {
    console.error('Error fetching wallet transactions:', error)
    throw error
  }
}

// Admin: Get ALL wallets (all users)
export const getAllWallets = async (): Promise<UserWallet[]> => {
  try {
    return await fetchJsonWithAuth<UserWallet[]>(`${API_URL}/user-wallets`, {
      method: 'GET',
    })
  } catch (error) {
    console.error('Error fetching all wallets:', error)
    throw error
  }
}

// Admin: Get ALL wallet transactions (all users)
export const getAllWalletTransactions = async (): Promise<WalletTransaction[]> => {
  try {
    return await fetchJsonWithAuth<WalletTransaction[]>(`${API_URL}/wallet-transactions`, {
      method: 'GET',
    })
  } catch (error) {
    console.error('Error fetching all wallet transactions:', error)
    throw error
  }
}