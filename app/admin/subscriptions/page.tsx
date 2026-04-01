'use client'

import { useState, useEffect } from 'react'
import { 
  getAdminSubscriptions, 
  deleteSubscription,
  deleteSubscriptionWithVm, 
  Subscription,
  GetSubscriptionsParams 
} from '@/api/subscription.api'
import { stopVm, startVm, deleteVmOnly } from '@/api/vm-subscription.api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  ArrowLeft, Search, Filter, Eye, Edit, Trash2, Trash, 
  Server, Globe, PowerOff, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, ArrowRight, Play 
} from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import { useTranslation } from 'react-i18next'
import { formatDateOnly } from '@/lib/utils'

export default function AdminSubscriptionsPage() {
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  
  // Sorting
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => Promise<void>
  }>({ open: false, title: '', description: '', onConfirm: async () => {} })

  useEffect(() => {
    fetchAllSubscriptions()
  }, [page, limit, sortBy, sortOrder, statusFilter, startDateFilter, endDateFilter])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchAllSubscriptions()
      } else {
        setPage(1) // Reset to page 1 when searching
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchAllSubscriptions = async () => {
    try {
      setLoading(true)
      const params: GetSubscriptionsParams = {
        page,
        limit,
        sortBy,
        sortOrder,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        searchTerm: searchTerm || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      }
      
      const response = await getAdminSubscriptions(params)
      setSubscriptions(response.data)
      setTotal(response.total)
      setTotalPages(response.totalPages)
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error)
      toast({
        title: t('admin.subscriptions.toast.error'),
        description: t('admin.subscriptions.toast.loadError'),
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      if (isInitialLoading) {
        setIsInitialLoading(false)
      }
    }
  }

  const handleDeleteSubscription = (subscriptionId: string) => {
    setConfirmDialog({
      open: true,
      title: t('admin.subscriptions.confirmDialog.deleteSub.title'),
      description: t('admin.subscriptions.confirmDialog.deleteSub.description'),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }))
        try {
          await deleteSubscription(subscriptionId)
          toast({ title: t('admin.subscriptions.toast.success'), description: t('admin.subscriptions.toast.deleteSuccess') })
          fetchAllSubscriptions()
        } catch (error: any) {
          console.error('Error deleting subscription:', error)
          toast({ title: t('admin.subscriptions.toast.error'), description: t('admin.subscriptions.toast.deleteError'), variant: 'destructive' })
        }
      },
    })
  }

  const handleDeleteSubscriptionWithVm = (subscriptionId: string) => {
    setConfirmDialog({
      open: true,
      title: t('admin.subscriptions.confirmDialog.deleteWithVm.title'),
      description: t('admin.subscriptions.confirmDialog.deleteWithVm.description'),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }))
        try {
          await deleteSubscriptionWithVm(subscriptionId)
          toast({ title: t('admin.subscriptions.toast.success'), description: t('admin.subscriptions.toast.deleteWithVmSuccess') })
          fetchAllSubscriptions()
        } catch (error: any) {
          console.error('Error deleting subscription:', error)
          toast({ title: t('admin.subscriptions.toast.error'), description: t('admin.subscriptions.toast.deleteError'), variant: 'destructive' })
        }
      },
    })
  }

  const handleDeleteVmOnly = (subscriptionId: string) => {
    setConfirmDialog({
      open: true,
      title: t('admin.subscriptions.confirmDialog.deleteVmOnly.title'),
      description: t('admin.subscriptions.confirmDialog.deleteVmOnly.description'),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }))
        try {
          await deleteVmOnly(subscriptionId)
          toast({ title: t('admin.subscriptions.toast.success'), description: t('admin.subscriptions.toast.deleteVmOnlySuccess') })
          fetchAllSubscriptions()
        } catch (error: any) {
          console.error('Error deleting VM:', error)
          toast({ title: t('admin.subscriptions.toast.error'), description: t('admin.subscriptions.toast.deleteVmOnlyError'), variant: 'destructive' })
        }
      },
    })
  }

  const handleStopVm = (subscriptionId: string) => {
    setConfirmDialog({
      open: true,
      title: t('admin.subscriptions.confirmDialog.stopVm.title'),
      description: t('admin.subscriptions.confirmDialog.stopVm.description'),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }))
        try {
          await stopVm(subscriptionId)
          toast({ title: t('admin.subscriptions.toast.success'), description: t('admin.subscriptions.toast.stopVmSuccess') })
          fetchAllSubscriptions()
        } catch (error: any) {
          console.error('Error stopping VM:', error)
          toast({ title: t('admin.subscriptions.toast.error'), description: t('admin.subscriptions.toast.stopVmError'), variant: 'destructive' })
        }
      },
    })
  }

  const handleStartVm = (subscriptionId: string) => {
    setConfirmDialog({
      open: true,
      title: t('admin.subscriptions.confirmDialog.startVm.title'),
      description: t('admin.subscriptions.confirmDialog.startVm.description'),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }))
        try {
          await startVm(subscriptionId)
          toast({ title: t('admin.subscriptions.toast.success'), description: t('admin.subscriptions.toast.startVmSuccess') })
          fetchAllSubscriptions()
        } catch (error: any) {
          console.error('Error starting VM:', error)
          toast({ title: t('admin.subscriptions.toast.error'), description: t('admin.subscriptions.toast.startVmError'), variant: 'destructive' })
        }
      },
    })
  }

  const handleViewSubscription = (subscriptionId: string) => {
    router.push(`/package-management/${subscriptionId}`)
  }

  const handleEditSubscription = (subscriptionId: string) => {
    // TODO: Implement edit functionality
    toast({
      title: t('admin.subscriptions.toast.info'),
      description: t('admin.subscriptions.toast.editInDevelopment'),
    })
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortBy(column)
      setSortOrder('DESC')
    }
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 inline ml-1 text-gray-400" />
    }
    return sortOrder === 'ASC' 
      ? <ArrowUp className="h-4 w-4 inline ml-1 text-blue-600" /> 
      : <ArrowDown className="h-4 w-4 inline ml-1 text-blue-600" />
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'expired':
        return 'destructive'
      case 'suspended':
        return 'secondary'
      case 'cancelled':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t('admin.subscriptions.status.active')
      case 'pending':
        return t('admin.subscriptions.status.pending')
      case 'inactive':
        return t('admin.subscriptions.status.inactive')
      case 'expired':
        return t('admin.subscriptions.status.expired')
      case 'suspended':
        return t('admin.subscriptions.status.suspended')
      case 'cancelled':
        return t('admin.subscriptions.status.cancelled')
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    return formatDateOnly(dateString, i18n.language)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('admin.subscriptions.backButton')}
          </Button>
          <h1 className="text-3xl font-bold">{t('admin.subscriptions.title')}</h1>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('admin.subscriptions.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder={t('admin.subscriptions.filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.subscriptions.filter.allStatus')}</SelectItem>
              <SelectItem value="active">{t('admin.subscriptions.status.active')}</SelectItem>
              <SelectItem value="pending">{t('admin.subscriptions.status.pending')}</SelectItem>
              <SelectItem value="inactive">{t('admin.subscriptions.status.inactive')}</SelectItem>
              <SelectItem value="expired">{t('admin.subscriptions.status.expired')}</SelectItem>
              <SelectItem value="suspended">{t('admin.subscriptions.status.suspended')}</SelectItem>
              <SelectItem value="cancelled">{t('admin.subscriptions.status.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              placeholder={t('admin.subscriptions.table.fromDatePlaceholder')}
              className="text-sm flex-1"
            />
            <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <Input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              placeholder={t('admin.subscriptions.table.toDatePlaceholder')}
              className="text-sm flex-1"
            />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.subscriptions.stats.total')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.subscriptions.stats.active')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {subscriptions.filter(s => s.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.subscriptions.stats.pending')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {subscriptions.filter(s => s.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.subscriptions.stats.expired')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {subscriptions.filter(s => s.status === 'expired').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.subscriptions.stats.cancelled')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {subscriptions.filter(s => s.status === 'cancelled').length}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.subscriptions.table.title')}</CardTitle>
          <div className="text-sm text-gray-500">
            {t('admin.subscriptions.table.showing', { from: subscriptions.length > 0 ? (page - 1) * limit + 1 : 0, to: Math.min(page * limit, total), total })}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 rounded">
                <div className="text-center">
                  <div className="inline-block">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{t('common.loading')}</p>
                </div>
              </div>
            )}
            {!loading && subscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('admin.subscriptions.table.noData')}
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="text-xs w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      onClick={() => handleSort('id')}
                      className="cursor-pointer hover:bg-gray-50 w-20 whitespace-nowrap"
                    >
                      {t('admin.subscriptions.table.id')} {getSortIcon('id')}
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('user_id')}
                      className="cursor-pointer hover:bg-gray-50 min-w-[140px]"
                    >
                      {t('admin.subscriptions.table.user')} {getSortIcon('user_id')}
                    </TableHead>
                    <TableHead className="min-w-[120px]">{t('admin.subscriptions.table.package')}</TableHead>
                    <TableHead className="min-w-[240px]">{t('admin.subscriptions.table.vmInfo')}</TableHead>
                    <TableHead 
                      onClick={() => handleSort('start_date')}
                      className="cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                    >
                      {t('admin.subscriptions.table.startDate')} {getSortIcon('start_date')}
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('end_date')}
                      className="cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                    >
                      {t('admin.subscriptions.table.endDate')} {getSortIcon('end_date')}
                    </TableHead>
                    <TableHead 
                      onClick={() => handleSort('status')}
                      className="cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                    >
                      {t('admin.subscriptions.table.status')} {getSortIcon('status')}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">{t('admin.subscriptions.table.autoRenew')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('admin.subscriptions.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-medium text-xs">
                        #{subscription.id.substring(0, 8)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>
                          <div className="font-medium truncate max-w-[130px]">
                            {subscription.user?.firstName && subscription.user?.lastName ? 
                              `${subscription.user.firstName} ${subscription.user.lastName}` : 
                              'N/A'
                            } #{subscription.user_id}
                          </div>
                          {subscription.user?.email && (
                            <div className="text-xs text-gray-400 truncate max-w-[130px]">
                              {subscription.user.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>
                          <div className="font-medium truncate max-w-[110px]">
                            {subscription.cloudPackage?.name || 'N/A'}
                          </div>
                          {subscription.cloudPackage && (
                            <div className="text-xs text-gray-400 mt-1 truncate max-w-[110px]">
                              {subscription.cloudPackage.cpu} • {subscription.cloudPackage.ram} • {subscription.cloudPackage.memory}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      {/* VM Information Column */}
                      <TableCell className="text-xs">
                        {subscription.vmInstance ? (
                          <div className="text-xs">
                            <div className="font-medium flex items-center gap-1">
                              <Server className="h-3 w-3 text-blue-500 flex-shrink-0" />
                              <span>{subscription.vmInstance.instance_name}</span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Globe className="h-3 w-3 flex-shrink-0" />
                              <span>{subscription.vmInstance.public_ip || t('admin.subscriptions.table.noPublicIp')}</span>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`mt-1 text-xs ${
                                subscription.vmInstance.lifecycle_state === 'RUNNING' 
                                  ? 'border-green-500 text-green-600' 
                                  : subscription.vmInstance.lifecycle_state === 'STOPPED'
                                  ? 'border-gray-500 text-gray-600'
                                  : 'border-blue-500 text-blue-600'
                              }`}
                            >
                              {subscription.vmInstance.lifecycle_state}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            {t('admin.subscriptions.table.notConfigured')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(subscription.start_date)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(subscription.end_date)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={getStatusBadgeVariant(subscription.status)}>
                          {getStatusLabel(subscription.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={subscription.auto_renew ? 'default' : 'outline'}>
                          {subscription.auto_renew ? t('admin.subscriptions.table.yes') : t('admin.subscriptions.table.no')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {/* View Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSubscription(subscription.id)}
                            className="h-7 w-7 p-0"
                            title="View details"
                          >
                            <Eye className="h-3 w-3 text-blue-600" />
                          </Button>
                          
                          {/* Stop VM Button - Only show if VM exists and is RUNNING */}
                          {subscription.vmInstance && 
                           subscription.vmInstance.lifecycle_state === 'RUNNING' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStopVm(subscription.id)}
                              className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              title="Stop VM"
                            >
                              <PowerOff className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {/* Start VM Button - Only show if VM exists and is STOPPED */}
                          {subscription.vmInstance && 
                           subscription.vmInstance.lifecycle_state === 'STOPPED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartVm(subscription.id)}
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Start VM"
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {/* Delete VM Only - Only show if VM exists */}
                          {subscription.vmInstance && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteVmOnly(subscription.id)}
                              className="h-7 w-7 p-0 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                              title="Delete VM only (keep subscription)"
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {/* Delete Subscription & VM */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteSubscriptionWithVm(subscription.id)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete subscription and VM"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          </div>
          
          {/* Pagination - always visible */}
          <div className="mt-6 flex justify-between items-center">
              {/* Records per page */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">{t('admin.subscriptions.table.recordsPerPage')}</label>
                <Select 
                  value={limit.toString()} 
                  onValueChange={(val) => {
                    setLimit(parseInt(val))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Page info & navigation */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-700">
                  {t('admin.subscriptions.table.pageOf', { current: page, total: totalPages })}
                </span>
                
                {/* Jump to page */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">{t('admin.subscriptions.table.goTo')}</label>
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={page}
                    onChange={(e) => {
                      const newPage = parseInt(e.target.value)
                      handlePageChange(newPage)
                    }}
                    className="w-16"
                  />
                </div>
                
                {/* Prev/Next buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.subscriptions.confirmDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDialog.onConfirm()} className="bg-destructive hover:bg-destructive/90">{t('admin.subscriptions.confirmDialog.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
