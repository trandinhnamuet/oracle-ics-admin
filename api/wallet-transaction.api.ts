import { fetchJsonWithAuth } from '@/lib/fetch-wrapper'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

export interface WalletTransaction {
  id: string
  wallet_id: number
  payment_id: string | null
  subscription_id: string | null
  change_amount: number
  balance_after: number
  type: string
  created_at: string
  wallet?: {
    id: number
    user_id: number
    balance: number
    user?: {
      id: number
      email: string
      firstName: string
      lastName: string
    }
  }
}

export interface AdminWalletTransactionsResponse {
  data: WalletTransaction[]
  total: number
  page: number
  limit: number
  totalPages: number
  totalAmount: number
}

export const walletTransactionApi = {
  /** User: lấy tất cả giao dịch ví của chính mình */
  getMyTransactions: async (): Promise<WalletTransaction[]> => {
    return fetchJsonWithAuth<WalletTransaction[]>(
      `${API_URL}/wallet-transactions/my-transactions`,
      { method: 'GET' },
    )
  },

  adminGetAll: async (params: {
    page?: number
    limit?: number
    userId?: number
    month?: string
    amountFilter?: 'positive' | 'negative'
  }): Promise<AdminWalletTransactionsResponse> => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.userId) query.set('userId', String(params.userId))
    if (params.month) query.set('month', params.month)
    if (params.amountFilter) query.set('amountFilter', params.amountFilter)

    return fetchJsonWithAuth<AdminWalletTransactionsResponse>(
      `${API_URL}/wallet-transactions/admin/all?${query.toString()}`,
      { method: 'GET' },
    )
  },
}
