'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  getLoginHistory,
  getLoginStatistics,
  getSuspiciousAttempts,
  AdminLoginHistoryQuery,
  AdminLoginHistoryRecord,
  AdminLoginStatistics
} from '@/api/admin-login-history.api'
import useAuthStore from '@/hooks/use-auth-store'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow, format } from 'date-fns'
import { vi, enUS } from 'date-fns/locale'
import { parseAsUtc, formatDateTime } from '@/lib/utils'

export default function AdminLoginHistoryPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { toast } = useToast()
  
  const [authChecked, setAuthChecked] = useState(false)

  // State for login history
  const [loginHistory, setLoginHistory] = useState<AdminLoginHistoryRecord[]>([])
  const [statistics, setStatistics] = useState<AdminLoginStatistics | null>(null)
  const [suspiciousAttempts, setSuspiciousAttempts] = useState<AdminLoginHistoryRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)

  // Filters
  const [filters, setFilters] = useState<AdminLoginHistoryQuery>({
    page: 1,
    limit: 10,
    status: undefined,
    startDate: undefined,
    endDate: undefined,
    sortBy: 'loginTime',
    sortOrder: 'DESC'
  })

  // Search
  const [searchInput, setSearchInput] = useState('')

  // Initialize auth store from localStorage on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('auth-storage')
    if (storedAuth && !isAuthenticated) {
      try {
        const parsed = JSON.parse(storedAuth)
        if (parsed.state?.user) {
          useAuthStore.setState({
            user: parsed.state.user,
            token: parsed.state.token,
            refreshToken: parsed.state.refreshToken,
            isAuthenticated: true,
            isLoading: false
          })
          console.log('✅ Auth restored from localStorage in login-history page')
        }
      } catch (error) {
        console.error('❌ Failed to restore auth:', error)
      }
    }
    setAuthChecked(true)
  }, [isAuthenticated])

  // Check authentication
  useEffect(() => {
    // Wait until auth is checked
    if (!authChecked) return
    
    // Nếu user tồn tại và là admin, cho phép truy cập
    if (user?.role?.toLowerCase() === 'admin') {
      console.log('✅ Admin access granted', { email: user.email, role: user.role })
      return
    }
    
    // Chỉ redirect nếu user không tồn tại hoặc không phải admin
    if (user === null) {
      console.warn('❌ Access denied - No user logged in')
      router.push('/unauthorized')
      return
    }
    
    if (user && user.role && user.role.toLowerCase() !== 'admin') {
      console.warn('❌ Access denied - Not an admin user', { role: user.role })
      router.push('/unauthorized')
      return
    }
  }, [user, authChecked, router])

  // Fetch login history and statistics
  const fetchData = useCallback(async () => {
    if (!user || !user.id) {
      console.warn('⚠️ No user or user.id available')
      return
    }

    try {
      setLoading(true)

      // Fetch login history
      const historyResponse = await getLoginHistory(filters)
      console.log('📊 History response:', historyResponse)
      setLoginHistory(historyResponse.data || [])
      setTotal(historyResponse.total || 0)

      // Fetch statistics
      const statsResponse = await getLoginStatistics(user.id, 30)
      console.log('📈 Stats response:', statsResponse)
      setStatistics(statsResponse)

      // Fetch suspicious attempts
      const suspiciousResponse = await getSuspiciousAttempts(user.id)
      console.log('⚠️ Suspicious response:', suspiciousResponse)
      setSuspiciousAttempts(suspiciousResponse || [])
      
      console.log('✅ All data loaded successfully')
    } catch (error: any) {
      console.error('❌ Error fetching login history:', {
        message: error?.message,
        status: error?.status,
        data: error?.data,
        fullError: error
      })
      toast({
        title: t('admin.loginHistory.filters.loading'),
        description: `Failed to load login history: ${error?.message || 'Unknown error'}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [user, user?.id, filters, toast])

  // Fetch data on mount and when filters change
  useEffect(() => {
    if (user?.role?.toLowerCase() === 'admin') {
      fetchData()
    }
  }, [user, fetchData])

  // Handle filter changes
  const handleFilterChange = (key: keyof AdminLoginHistoryQuery, value: any) => {
    setPage(1)
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }

  // Handle date range filter
  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      handleFilterChange('startDate', value || undefined)
    } else {
      handleFilterChange('endDate', value || undefined)
    }
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setFilters(prev => ({ ...prev, page: newPage }))
  }

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      setIsExporting(true)

      // Fetch all records matching current filters (ignore pagination)
      const allDataResponse = await getLoginHistory({
        ...filters,
        page: 1,
        limit: total > 0 ? total : 10000
      })
      const allRecords: AdminLoginHistoryRecord[] = allDataResponse.data || []

      const headers = [
        t('admin.loginHistory.csvHeaders.id'),
        t('admin.loginHistory.csvHeaders.username'),
        t('admin.loginHistory.csvHeaders.role'),
        t('admin.loginHistory.csvHeaders.loginTime'),
        t('admin.loginHistory.csvHeaders.status'),
        t('admin.loginHistory.csvHeaders.ipAddress'),
        t('admin.loginHistory.csvHeaders.country'),
        t('admin.loginHistory.csvHeaders.browser'),
        t('admin.loginHistory.csvHeaders.os'),
        t('admin.loginHistory.csvHeaders.deviceType'),
        t('admin.loginHistory.csvHeaders.sessionDuration'),
        t('admin.loginHistory.csvHeaders.newDevice')
      ]
      const rows = allRecords.map(record => [
        record.id,
        record.username,
        record.role,
        formatDateTime(record.loginTime, i18n.language),
        record.loginStatus,
        record.ipV4 || record.ipV6 || t('admin.loginHistory.csvNA'),
        record.country || t('admin.loginHistory.csvNA'),
        record.browser,
        record.os,
        record.deviceType,
        record.sessionDurationMinutes ? `${record.sessionDurationMinutes}m` : t('admin.loginHistory.csvNA'),
        record.isNewDevice ? t('admin.loginHistory.csvYes') : t('admin.loginHistory.csvNo')
      ])

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `login-history-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: t('admin.loginHistory.exportToastSuccess'),
        description: t('admin.loginHistory.exportSuccess')
      })
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast({
        title: t('admin.loginHistory.exportToastError'),
        description: t('admin.loginHistory.exportError'),
        variant: 'destructive'
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground">{t('admin.loginHistory.title')}</h1>
          <p className="text-gray-600 dark:text-muted-foreground mt-2">{t('admin.loginHistory.subtitle')}</p>
        </div>

        {/* Statistics Dashboard */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-card rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 dark:text-muted-foreground">{t('admin.loginHistory.stats.totalLogins')}</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-foreground">{statistics.totalLogins}</div>
              <div className="text-xs text-gray-500 dark:text-muted-foreground mt-2">{t('admin.loginHistory.stats.last30Days')}</div>
            </div>

            <div className="bg-white dark:bg-card rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 dark:text-muted-foreground">{t('admin.loginHistory.stats.successRate')}</div>
              <div className="text-3xl font-bold text-green-600">{statistics.successRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500 dark:text-muted-foreground mt-2">{t('admin.loginHistory.stats.successful', { count: statistics.successfulLogins })}</div>
            </div>

            <div className="bg-white dark:bg-card rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 dark:text-muted-foreground">{t('admin.loginHistory.stats.failedAttempts')}</div>
              <div className="text-3xl font-bold text-red-600">{statistics.failedLogins}</div>
              <div className="text-xs text-gray-500 dark:text-muted-foreground mt-2">{t('admin.loginHistory.stats.locked', { count: statistics.lockedAttempts })}</div>
            </div>

            <div className="bg-white dark:bg-card rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 dark:text-muted-foreground">{t('admin.loginHistory.stats.uniqueDevices')}</div>
              <div className="text-3xl font-bold text-blue-600">{statistics.uniqueDevices}</div>
              <div className="text-xs text-gray-500 dark:text-muted-foreground mt-2">{t('admin.loginHistory.stats.countries', { count: statistics.uniqueCountries })}</div>
            </div>
          </div>
        )}

        {/* Suspicious Attempts Alert */}
        {suspiciousAttempts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {t('admin.loginHistory.suspicious.alert', { count: suspiciousAttempts.length })}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {suspiciousAttempts.slice(0, 3).map((attempt, index) => (
                      <li key={index}>
                        {t('admin.loginHistory.suspicious.failedFrom', { ip: attempt.ipV4 || attempt.ipV6, date: formatDateTime(attempt.loginTime, i18n.language) })}
                      </li>
                    ))}
                    {suspiciousAttempts.length > 3 && (
                      <li>{t('admin.loginHistory.suspicious.more', { count: suspiciousAttempts.length - 3 })}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-card rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-muted-foreground mb-2">
                {t('admin.loginHistory.filters.status')}
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-foreground"
              >
                <option value="">{t('admin.loginHistory.filters.all')}</option>
                <option value="success">{t('admin.loginHistory.filters.success')}</option>
                <option value="failed">{t('admin.loginHistory.filters.failed')}</option>
                <option value="locked">{t('admin.loginHistory.filters.locked')}</option>
              </select>
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-muted-foreground mb-2">
                {t('admin.loginHistory.filters.fromDate')}
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-foreground"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-muted-foreground mb-2">
                {t('admin.loginHistory.filters.toDate')}
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-foreground"
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-muted-foreground mb-2">
                {t('admin.loginHistory.filters.sortBy')}
              </label>
              <select
                value={filters.sortBy || 'loginTime'}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-foreground"
              >
                <option value="loginTime">{t('admin.loginHistory.filters.loginTime')}</option>
                <option value="username">{t('admin.loginHistory.filters.username')}</option>
                <option value="status">{t('admin.loginHistory.filters.statusSort')}</option>
              </select>
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <button
                onClick={fetchData}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
              >
                {loading ? t('admin.loginHistory.filters.loading') : t('admin.loginHistory.filters.refresh')}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600 dark:text-muted-foreground">
            {t('admin.loginHistory.showing', { from: loginHistory.length > 0 ? (page - 1) * limit + 1 : 0, to: Math.min(page * limit, total), total })}
          </div>
          <button
            onClick={handleExportCSV}
            disabled={loginHistory.length === 0 || isExporting}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
          >
            {isExporting ? t('admin.loginHistory.exportLoading') : t('admin.loginHistory.export')}
          </button>
        </div>

        {/* Login History Table */}
        <div className="bg-white dark:bg-card rounded-lg shadow overflow-hidden">
          <div>
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 dark:bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-muted-foreground uppercase tracking-wider">
                    {t('admin.loginHistory.table.account')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-muted-foreground uppercase tracking-wider">
                    {t('admin.loginHistory.table.loginTime')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-muted-foreground uppercase tracking-wider">
                    {t('admin.loginHistory.table.status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-muted-foreground uppercase tracking-wider">
                    {t('admin.loginHistory.table.ip')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-muted-foreground uppercase tracking-wider">
                    {t('admin.loginHistory.table.location')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-muted-foreground uppercase tracking-wider">
                    {t('admin.loginHistory.table.browser')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-muted-foreground uppercase tracking-wider">
                    {t('admin.loginHistory.table.os')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-muted-foreground uppercase tracking-wider">
                    {t('admin.loginHistory.table.device')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-muted-foreground uppercase tracking-wider">
                    {t('admin.loginHistory.table.duration')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-muted-foreground uppercase tracking-wider">
                    {t('admin.loginHistory.table.newDevice')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-card divide-y divide-gray-200 dark:divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-4 text-center text-gray-500 dark:text-muted-foreground">
                      {t('admin.loginHistory.loading')}
                    </td>
                  </tr>
                ) : loginHistory.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-4 text-center text-gray-500 dark:text-muted-foreground">
                      {t('admin.loginHistory.noRecords')}
                    </td>
                  </tr>
                ) : (
                  loginHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-muted/50">
                      <td className="px-4 py-4 text-sm">
                        <div className="font-medium text-gray-900 dark:text-foreground">
                          {record.admin ? `${record.admin.firstName} ${record.admin.lastName}` : record.username}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-muted-foreground">
                          {record.admin?.email || record.username}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="text-gray-900 dark:text-foreground">{formatDateTime(record.loginTime)}</div>
                        <div className="text-gray-500 dark:text-muted-foreground text-xs">{formatDistanceToNow(parseAsUtc(record.loginTime), { locale: i18n.language === 'vi' ? vi : enUS, addSuffix: true })}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.loginStatus === 'success'
                            ? 'bg-green-100 text-green-800'
                            : record.loginStatus === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.loginStatus.charAt(0).toUpperCase() + record.loginStatus.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-foreground">
                        {record.ipV4 || record.ipV6 || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-foreground">
                        {record.country && record.city ? `${record.city}, ${record.country}` : record.country || 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-foreground">
                        {record.browser}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-foreground">
                        {record.os}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-muted text-gray-800 dark:text-foreground rounded text-xs">
                          {record.deviceType}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-foreground">
                        {record.sessionDurationMinutes ? `${record.sessionDurationMinutes}m` : t('admin.loginHistory.active')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {record.isNewDevice ? (
                          <span className="text-orange-600 font-semibold">⚠️ {t('admin.loginHistory.new')}</span>
                        ) : (
                          <span className="text-gray-500 dark:text-muted-foreground">{t('admin.loginHistory.known')}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex justify-between items-center">
          <div>
            <label htmlFor="limit" className="text-sm text-gray-700 dark:text-muted-foreground mr-2">
              {t('admin.loginHistory.pagination.recordsPerPage')}
            </label>
            <select
              id="limit"
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value))
                setPage(1)
                setFilters(prev => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))
              }}
              className="px-3 py-2 border border-gray-300 dark:border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-foreground"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 dark:border-border rounded-lg hover:bg-gray-50 dark:hover:bg-muted/50 dark:text-foreground disabled:opacity-50 transition"
            >
              {t('admin.loginHistory.pagination.prev')}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-muted-foreground">
                {t('admin.loginHistory.pagination.page', { current: page, total: Math.ceil(total / limit) || 1 })}
              </span>
            </div>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= Math.ceil(total / limit)}
              className="px-4 py-2 border border-gray-300 dark:border-border rounded-lg hover:bg-gray-50 dark:hover:bg-muted/50 dark:text-foreground disabled:opacity-50 transition"
            >
              {t('admin.loginHistory.pagination.next')}
            </button>
          </div>
      </div>
    </div>
  )
}
