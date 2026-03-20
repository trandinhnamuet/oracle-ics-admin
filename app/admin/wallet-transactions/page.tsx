'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  RefreshCw, ChevronLeft, ChevronRight, Search, X,
} from 'lucide-react'
import {
  walletTransactionApi,
  WalletTransaction,
} from '@/api/wallet-transaction.api'
import { getAllUsers } from '@/api/user.api'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from 'react-i18next'
import { formatDateTime } from '@/lib/utils'

const PAGE_SIZE = 20

interface UserOption {
  id: number
  email: string
  firstName: string
  lastName: string
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

function formatDate(dateString: string) {
  return formatDateTime(dateString)
}

const TYPE_COLOR_MAP: Record<string, string> = {
  deposit: 'bg-blue-100 text-blue-700 border-blue-200',
  subscription_payment: 'bg-purple-100 text-purple-700 border-purple-200',
  auto_renewal: 'bg-green-100 text-green-700 border-green-200',
  manual_renewal: 'bg-orange-100 text-orange-700 border-orange-200',
}

function TypeBadge({ type, t }: { type: string; t: (key: string) => string }) {
  const color = TYPE_COLOR_MAP[type]
  const label = t(`admin.walletTransactions.type.${type}`)
  if (color) return <Badge variant="outline" className={color}>{label}</Badge>
  return <Badge variant="outline">{type}</Badge>
}

export default function WalletTransactionsAdminPage() {
  const { toast } = useToast()
  const { t } = useTranslation()

  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>()
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterMonth, setFilterMonth] = useState(true) // bật filter tháng mặc định
  const [amountFilter, setAmountFilter] = useState<'all' | 'positive' | 'negative'>('all')

  // User dropdown search
  const [users, setUsers] = useState<UserOption[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)

  // Load users for dropdown
  useEffect(() => {
    getAllUsers({ limit: 10000 })
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.data ?? [])
        setUsers(list)
      })
      .catch(() => {})
  }, [])

  const filteredUsers = useMemo(() => {
    const term = userSearch.toLowerCase()
    return users.filter(
      u =>
        u.email?.toLowerCase().includes(term) ||
        u.firstName?.toLowerCase().includes(term) ||
        u.lastName?.toLowerCase().includes(term),
    )
  }, [users, userSearch])

  const fetchTransactions = useCallback(async (p: number) => {
    try {
      setLoading(true)
      const res = await walletTransactionApi.adminGetAll({
        page: p,
        limit: PAGE_SIZE,
        userId: selectedUserId,
        month: filterMonth ? selectedMonth : undefined,
        amountFilter: amountFilter === 'all' ? undefined : amountFilter,
      })
      setTransactions(res.data)
      setTotal(res.total)
      setTotalPages(res.totalPages)
      const totalAmount = res.totalAmount ?? 0
      console.log(
        `[Wallet Transactions] ${t('admin.walletTransactions.log.totalAmount', { total: res.total })}:`,
        totalAmount,
        `(${formatCurrency(totalAmount)})`,
      )
    } catch (err) {
      toast({ title: t('admin.walletTransactions.toast.loadError'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [selectedUserId, selectedMonth, filterMonth, amountFilter, t, toast])

  useEffect(() => {
    setPage(1)
  }, [selectedUserId, selectedMonth, filterMonth, amountFilter])

  useEffect(() => {
    fetchTransactions(page)
  }, [page, fetchTransactions])

  const handleSelectUser = (user: UserOption | null) => {
    setSelectedUser(user)
    setSelectedUserId(user?.id)
    setUserDropdownOpen(false)
    setUserSearch('')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.walletTransactions.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('admin.walletTransactions.subtitle')}</p>
        </div>
        <Button onClick={() => fetchTransactions(page)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.walletTransactions.refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            {/* User dropdown search */}
            <div className="flex flex-col gap-1 min-w-[280px]">
              <label className="text-sm font-medium text-muted-foreground">{t('admin.walletTransactions.filters.user')}</label>
              <div className="relative">
                <div
                  className="flex items-center border rounded-md px-3 py-2 bg-background cursor-pointer gap-2"
                  onClick={() => setUserDropdownOpen(v => !v)}
                >
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  {selectedUser ? (
                    <span className="flex-1 text-sm">{selectedUser.firstName} {selectedUser.lastName} — {selectedUser.email}</span>
                  ) : (
                    <span className="flex-1 text-sm text-muted-foreground">{t('admin.walletTransactions.filters.allUsers')}</span>
                  )}
                  {selectedUser && (
                    <button
                      onClick={e => { e.stopPropagation(); handleSelectUser(null) }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {userDropdownOpen && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 border rounded-md bg-popover shadow-md">
                    <div className="p-2">
                      <Input
                        autoFocus
                        placeholder={t('admin.walletTransactions.filters.searchPlaceholder')}
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <ul className="max-h-56 overflow-auto text-sm">
                      <li
                        className="px-3 py-2 hover:bg-muted cursor-pointer text-muted-foreground"
                        onClick={() => handleSelectUser(null)}
                      >
                        {t('admin.walletTransactions.filters.allUsers')}
                      </li>
                      {filteredUsers.map(u => (
                        <li
                          key={u.id}
                          className="px-3 py-2 hover:bg-muted cursor-pointer"
                          onClick={() => handleSelectUser(u)}
                        >
                          <span className="font-medium">{u.firstName} {u.lastName}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{u.email}</span>
                        </li>
                      ))}
                      {filteredUsers.length === 0 && (
                        <li className="px-3 py-2 text-muted-foreground">{t('admin.walletTransactions.filters.noUserFound')}</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Month filter */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">{t('admin.walletTransactions.filters.month')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  disabled={!filterMonth}
                  className="border rounded-md px-3 py-2 text-sm bg-background disabled:opacity-50"
                />
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterMonth}
                    onChange={e => setFilterMonth(e.target.checked)}
                    className="accent-primary"
                  />
                  {t('admin.walletTransactions.filters.enabled')}
                </label>
              </div>
            </div>

            {/* Amount filter */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-muted-foreground">{t('admin.walletTransactions.filters.amountDirection')}</label>
              <select
                value={amountFilter}
                onChange={e => setAmountFilter(e.target.value as any)}
                className="border rounded-md px-3 py-2 text-sm bg-background"
              >
                <option value="all">{t('admin.walletTransactions.filters.amountAll')}</option>
                <option value="positive">{t('admin.walletTransactions.filters.amountPositive')}</option>
                <option value="negative">{t('admin.walletTransactions.filters.amountNegative')}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.walletTransactions.table.title', { total })}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">{t('admin.walletTransactions.loading')}</p>
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">{t('admin.walletTransactions.empty')}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.walletTransactions.columns.user')}</TableHead>
                      <TableHead>{t('admin.walletTransactions.columns.type')}</TableHead>
                      <TableHead>{t('admin.walletTransactions.columns.amount')}</TableHead>
                      <TableHead>{t('admin.walletTransactions.columns.balanceAfter')}</TableHead>
                      <TableHead>{t('admin.walletTransactions.columns.paymentId')}</TableHead>
                      <TableHead>{t('admin.walletTransactions.columns.time')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(tx => {
                      const amount = Number(tx.change_amount)
                      const user = tx.wallet?.user
                      const isCredit = amount > 0
                      return (
                        <TableRow key={tx.id}>
                          <TableCell>
                            {user ? (
                              <div>
                                <p className="font-medium">{user.firstName} {user.lastName}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">{t('admin.walletTransactions.walletFallback', { id: tx.wallet_id })}</span>
                            )}
                          </TableCell>
                          <TableCell><TypeBadge type={tx.type} t={t} /></TableCell>
                          <TableCell>
                            <span className={`font-semibold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                              {isCredit ? '+' : ''}{formatCurrency(amount)}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {tx.balance_after != null ? formatCurrency(Number(tx.balance_after)) : '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[140px]">
                            {tx.payment_id}
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(tx.created_at)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    {t('admin.walletTransactions.pagination.summary', { page, totalPages, total })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                      return start + i
                    }).map((num) => (
                      <Button key={num} variant={num === page ? 'default' : 'outline'} size="sm" onClick={() => setPage(num)} className="w-9">
                        {num}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
