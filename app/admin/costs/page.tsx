'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Search, TrendingUp, TrendingDown, Wallet, Users, ArrowLeft } from 'lucide-react'
import { getAllWallets, getAllWalletTransactions, UserWallet, WalletTransaction } from '@/api/user-wallet.api'
import { formatPrice } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

interface UserCostSummary {
  userId: number
  email: string
  displayName: string
  balance: number
  totalDeposited: number
  totalSpent: number
}

interface MonthlyData {
  month: number
  year: number
  label: string
  totalDeposited: number
  totalSpent: number
  net: number
}

export default function AdminCostsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [wallets, setWallets] = useState<UserWallet[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly')

  const fetchData = async () => {
    try {
      setLoading(true)
      const [walletsData, txData] = await Promise.all([
        getAllWallets(),
        getAllWalletTransactions(),
      ])
      setWallets(walletsData || [])
      setTransactions(txData || [])
    } catch (error) {
      console.error('Error fetching cost data:', error)
      setWallets([])
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // ── Global aggregates ────────────────────────────────────────
  const totalBalance = useMemo(
    () => wallets.reduce((sum, w) => sum + Number(w.balance), 0),
    [wallets]
  )

  const totalDeposited = useMemo(
    () => transactions.filter(t => Number(t.change_amount) > 0).reduce((sum, t) => sum + Number(t.change_amount), 0),
    [transactions]
  )

  const totalSpent = useMemo(
    () => transactions.filter(t => Number(t.change_amount) < 0).reduce((sum, t) => sum + Math.abs(Number(t.change_amount)), 0),
    [transactions]
  )

  const totalUsers = useMemo(() => wallets.length, [wallets])

  // ── Available years from transaction data ────────────────────
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    
    // Collect years from transactions
    transactions.forEach(t => {
      const y = new Date(t.created_at).getFullYear()
      if (!isNaN(y)) years.add(y)
    })
    
    const currentYear = new Date().getFullYear()
    
    // If no years found from transactions, use current year as reference
    let minYear = years.size > 0 ? Math.min(...Array.from(years)) : currentYear
    let maxYear = currentYear + 2
    
    // Generate range from min to max year
    for (let y = minYear; y <= maxYear; y++) {
      years.add(y)
    }
    
    return Array.from(years).sort((a, b) => b - a)
  }, [transactions])

  // ── Monthly breakdown for selected year ─────────────────────
  const MONTHS = useMemo(() => [
    t('admin.costs.months.jan'), t('admin.costs.months.feb'), t('admin.costs.months.mar'),
    t('admin.costs.months.apr'), t('admin.costs.months.may'), t('admin.costs.months.jun'),
    t('admin.costs.months.jul'), t('admin.costs.months.aug'), t('admin.costs.months.sep'),
    t('admin.costs.months.oct'), t('admin.costs.months.nov'), t('admin.costs.months.dec'),
  ], [t])

  const monthlyData = useMemo((): MonthlyData[] => {
    const year = parseInt(selectedYear)
    const map = new Map<number, { deposited: number; spent: number }>()
    for (let m = 1; m <= 12; m++) map.set(m, { deposited: 0, spent: 0 })

    transactions.forEach(t => {
      const d = new Date(t.created_at)
      if (d.getFullYear() !== year) return
      const month = d.getMonth() + 1
      const bucket = map.get(month)!
      const amount = Number(t.change_amount)
      if (amount > 0) bucket.deposited += amount
      else bucket.spent += Math.abs(amount)
    })

    return Array.from(map.entries()).map(([month, { deposited, spent }]) => ({
      month,
      year,
      label: MONTHS[month - 1],
      totalDeposited: deposited,
      totalSpent: spent,
      net: deposited - spent,
    }))
  }, [transactions, selectedYear, MONTHS])

  // ── Yearly breakdown ─────────────────────────────────────────
  const yearlyData = useMemo(() => {
    const map = new Map<number, { deposited: number; spent: number }>()
    transactions.forEach(t => {
      const year = new Date(t.created_at).getFullYear()
      if (isNaN(year)) return
      if (!map.has(year)) map.set(year, { deposited: 0, spent: 0 })
      const bucket = map.get(year)!
      const amount = Number(t.change_amount)
      if (amount > 0) bucket.deposited += amount
      else bucket.spent += Math.abs(amount)
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => b - a)
      .map(([year, { deposited, spent }]) => ({
        year,
        totalDeposited: deposited,
        totalSpent: spent,
        net: deposited - spent,
      }))
  }, [transactions])

  // ── Per-user summary ─────────────────────────────────────────
  const userSummaries = useMemo((): UserCostSummary[] => {
    const map = new Map<number, UserCostSummary>()

    wallets.forEach(w => {
      const user = w.user
      const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
      map.set(w.user_id, {
        userId: w.user_id,
        email: user?.email || `User #${w.user_id}`,
        displayName: fullName || user?.username || user?.email || `User #${w.user_id}`,
        balance: Number(w.balance),
        totalDeposited: 0,
        totalSpent: 0,
      })
    })

    transactions.forEach(t => {
      const userId = t.wallet?.user_id ?? t.wallet?.user?.id
      if (!userId) return
      if (!map.has(userId)) {
        const u = t.wallet?.user
        const fullName = [u?.firstName, u?.lastName].filter(Boolean).join(' ')
        map.set(userId, {
          userId,
          email: u?.email || `User #${userId}`,
          displayName: fullName || u?.username || u?.email || `User #${userId}`,
          balance: 0,
          totalDeposited: 0,
          totalSpent: 0,
        })
      }
      const entry = map.get(userId)!
      const amount = Number(t.change_amount)
      if (amount > 0) entry.totalDeposited += amount
      else entry.totalSpent += Math.abs(amount)
    })

    return Array.from(map.values()).sort((a, b) => b.totalDeposited - a.totalDeposited)
  }, [wallets, transactions])

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return userSummaries
    const term = searchTerm.toLowerCase()
    return userSummaries.filter(u =>
      u.email.toLowerCase().includes(term) ||
      u.displayName.toLowerCase().includes(term) ||
      String(u.userId).includes(term)
    )
  }, [userSummaries, searchTerm])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>{t('admin.costs.loading')}</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('admin.costs.back')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('admin.costs.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('admin.costs.subtitle')}</p>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.costs.refresh')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('admin.costs.summary.totalBalance')}</CardTitle>
            <Wallet className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatPrice(totalBalance)}₫</div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.costs.summary.totalBalanceDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('admin.costs.summary.totalDeposited')}</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPrice(totalDeposited)}₫</div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.costs.summary.totalDepositedDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('admin.costs.summary.totalSpent')}</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatPrice(totalSpent)}₫</div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.costs.summary.totalSpentDesc')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('admin.costs.summary.users')}</CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('admin.costs.summary.usersDesc')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Time-based breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>{t('admin.costs.timeBreakdown.title')}</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex border rounded-lg overflow-hidden">
                <button
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'monthly' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  onClick={() => setViewMode('monthly')}
                >
                  {t('admin.costs.timeBreakdown.monthly')}
                </button>
                <button
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'yearly' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  onClick={() => setViewMode('yearly')}
                >
                  {t('admin.costs.timeBreakdown.yearly')}
                </button>
              </div>
              {viewMode === 'monthly' && (
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{viewMode === 'monthly' ? t('admin.costs.table.month') : t('admin.costs.table.year')}</TableHead>
                <TableHead className="text-right">{t('admin.costs.table.deposited')}</TableHead>
                <TableHead className="text-right">{t('admin.costs.table.spent')}</TableHead>
                <TableHead className="text-right">{t('admin.costs.table.difference')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewMode === 'monthly'
                ? monthlyData.map(row => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {row.totalDeposited > 0 ? `+${formatPrice(row.totalDeposited)}₫` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {row.totalSpent > 0 ? `-${formatPrice(row.totalSpent)}₫` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={row.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {row.net >= 0 ? '+' : ''}{formatPrice(row.net)}₫
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                : yearlyData.map(row => (
                    <TableRow key={row.year}>
                      <TableCell className="font-medium">{row.year}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {row.totalDeposited > 0 ? `+${formatPrice(row.totalDeposited)}₫` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {row.totalSpent > 0 ? `-${formatPrice(row.totalSpent)}₫` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={row.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {row.net >= 0 ? '+' : ''}{formatPrice(row.net)}₫
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-user breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>{t('admin.costs.perUser.title')}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('admin.costs.perUser.searchPlaceholder')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.costs.perUser.user')}</TableHead>
                <TableHead className="text-right">{t('admin.costs.perUser.currentBalance')}</TableHead>
                <TableHead className="text-right">{t('admin.costs.perUser.totalDeposited')}</TableHead>
                <TableHead className="text-right">{t('admin.costs.perUser.totalSpent')}</TableHead>
                <TableHead className="text-right">{t('admin.costs.perUser.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t('admin.costs.perUser.noUser')}
                  </TableCell>
                </TableRow>
              )}
              {filteredUsers.map(user => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div className="font-medium">{user.displayName}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-blue-600">
                    {formatPrice(user.balance)}₫
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {user.totalDeposited > 0 ? `${formatPrice(user.totalDeposited)}₫` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {user.totalSpent > 0 ? `${formatPrice(user.totalSpent)}₫` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={user.balance > 0
                        ? 'border-green-300 text-green-700 bg-green-50'
                        : 'border-gray-300 text-gray-600 bg-gray-50'}
                    >
                      {user.balance > 0 ? t('admin.costs.perUser.normal') : t('admin.costs.perUser.low')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
