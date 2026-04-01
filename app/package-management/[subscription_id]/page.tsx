'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import dynamic from 'next/dynamic'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Play, Pause, RotateCcw, Trash2, Download, RefreshCw, Terminal, MonitorUp, Copy, Key, Check, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { ConfirmSshKeyRequestDialog } from '@/components/dialogs/confirm-ssh-key-request-dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'

// Dynamic import TerminalComponent to avoid SSR issues with xterm and socket.io-client
const TerminalComponent = dynamic(
  () => import('@/components/terminal/terminal-component').then(mod => ({ default: mod.TerminalComponent })),
  {
    ssr: false,
    loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="text-white">Loading terminal...</div>
    </div>
  }
)
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { getSubscriptionById, deleteSubscription, Subscription } from '@/api/subscription.api'
import { getSubscriptionVm, performVmAction, requestNewSshKey, deleteVmOnly, resetWindowsPassword, VmDetails } from '@/api/vm-subscription.api'
import { getInstanceMetrics, InstanceMetrics } from '@/api/oci.api'
import { toast } from '@/hooks/use-toast'
import { formatDateOnly, formatDateTime, parseAsUtc } from '@/lib/utils'

interface CloudPackageDetail {
  id: string
  vmName: string
  packageName: string
  status: 'active' | 'inactive' | 'expired' | 'suspended' | 'cancelled' | 'pending'
  cpu: string
  memory: string
  storage: string
  bandwidth: string
  feature: string
  ipAddress: string
  createdAt: string
  startDate: string
  endDate: string
  nextBilling: string
  monthlyPrice: number
  autoRenew: boolean
  user?: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function AdminPackageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useTranslation()
  const subscriptionId = params.subscription_id as string

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [packageDetail, setPackageDetail] = useState<CloudPackageDetail | null>(null)
  const [vmDetails, setVmDetails] = useState<VmDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isLoadingVm, setIsLoadingVm] = useState(false)
  const [metrics, setMetrics] = useState<InstanceMetrics | null>(null)
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h')
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)
  const [showSshKeyConfirm, setShowSshKeyConfirm] = useState(false)
  const [isRequestingSshKey, setIsRequestingSshKey] = useState(false)
  const [newSshKey, setNewSshKey] = useState<{ privateKey: string; instanceName: string } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false)
  const [newWindowsPassword, setNewWindowsPassword] = useState<string | null>(null)
  const [customPassword, setCustomPassword] = useState('')
  const [showCustomPassword, setShowCustomPassword] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => Promise<void>
  }>({ open: false, title: '', description: '', onConfirm: async () => {} })

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // Fetch subscription data
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setIsDataLoading(true)
        const data = await getSubscriptionById(subscriptionId)
        setSubscription(data)

        const detail: CloudPackageDetail = {
          id: data.id,
          vmName: `VM-${data.id.slice(-8)}`,
          packageName: data.cloudPackage?.name || 'Unknown Package',
          status: data.status,
          cpu: data.cloudPackage?.cpu || 'N/A',
          memory: data.cloudPackage?.ram || 'N/A',
          storage: data.cloudPackage?.memory || 'N/A',
          bandwidth: data.cloudPackage?.bandwidth || 'N/A',
          feature: data.cloudPackage?.feature || 'N/A',
          ipAddress: '',
          createdAt: formatDateOnly(data.created_at),
          startDate: formatDateOnly(data.start_date),
          endDate: formatDateOnly(data.end_date),
          nextBilling: formatDateOnly(data.end_date),
          monthlyPrice: data.cloudPackage?.cost_vnd ? parseFloat(data.cloudPackage.cost_vnd) : 0,
          autoRenew: data.auto_renew,
          user: data.user,
        }
        setPackageDetail(detail)
      } catch (error: any) {
        console.error('Error fetching subscription:', error)
        toast({
          title: t('packageDetail.toast.error'),
          description: t('packageDetail.toast.loadError'),
          variant: 'destructive',
        })
      } finally {
        setIsDataLoading(false)
      }
    }

    if (subscriptionId) {
      fetchSubscription()
    }
  }, [subscriptionId])

  // Fetch VM details if subscription has VM
  useEffect(() => {
    const fetchVmDetails = async () => {
      if (!subscription?.vm_instance_id) return

      try {
        setIsLoadingVm(true)
        const vmData = await getSubscriptionVm(subscriptionId)
        setVmDetails(vmData)
      } catch (error: any) {
        console.error('Error fetching VM details:', error)
      } finally {
        setIsLoadingVm(false)
      }
    }

    if (subscription) {
      fetchVmDetails()
    }
  }, [subscription, subscriptionId])

  // Fetch metrics when VM is running
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!vmDetails?.vm?.instanceId || vmDetails?.vm?.lifecycleState !== 'RUNNING') return

      try {
        setIsLoadingMetrics(true)
        const metricsData = await getInstanceMetrics(vmDetails.vm.instanceId, timeRange)
        setMetrics(metricsData)
      } catch (error: any) {
        console.error('Error fetching metrics:', error)
      } finally {
        setIsLoadingMetrics(false)
      }
    }

    if (vmDetails?.vm?.instanceId && vmDetails.vm.lifecycleState === 'RUNNING') {
      fetchMetrics()
      const interval = setInterval(fetchMetrics, 60000)
      return () => clearInterval(interval)
    }
  }, [vmDetails?.vm?.instanceId, vmDetails?.vm?.lifecycleState, timeRange])

  const getNetworkData = () => {
    if (!metrics?.network.in || !metrics?.network.out) return []
    return metrics.network.in.map((inData, index) => ({
      time: inData.time,
      in: inData.value / 1024 / 1024,
      out: (metrics.network.out[index]?.value || 0) / 1024 / 1024,
    }))
  }

  const getDiskData = () => {
    if (!metrics?.disk.read || !metrics?.disk.write) return []
    return metrics.disk.read.map((readData, index) => ({
      time: readData.time,
      read: readData.value / 1024 / 1024,
      write: (metrics.disk.write[index]?.value || 0) / 1024 / 1024,
    }))
  }

  const handleVmAction = async (action: 'START' | 'STOP' | 'RESTART' | 'TERMINATE') => {
    if (!subscription?.vm_instance_id) {
      toast({
        title: t('packageDetail.toast.vmNotConfigured'),
        description: t('packageDetail.toast.vmNotConfiguredDesc'),
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      await performVmAction(subscriptionId, action)
      toast({
        title: t('packageDetail.toast.vmActionSuccess'),
        description: t('packageDetail.toast.vmActionSuccessDesc'),
        variant: 'default',
      })
      setTimeout(async () => {
        try {
          const vmData = await getSubscriptionVm(subscriptionId)
          setVmDetails(vmData)
        } catch (error) {
          console.error('Error refreshing VM details:', error)
        }
      }, 2000)
    } catch (error: any) {
      console.error(`Error performing VM ${action}:`, error)
      toast({
        title: t('packageDetail.toast.vmActionFailed'),
        description: error.response?.data?.message || t('packageDetail.toast.vmActionFailedDesc'),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestNewKey = async () => {
    if (!subscription?.vm_instance_id) {
      toast({
        title: t('packageDetail.toast.vmNotConfigured'),
        description: t('packageDetail.toast.vmNotConfiguredDesc'),
        variant: 'destructive',
      })
      return
    }
    const email = subscription.user?.email
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'User email not found. Please contact support.',
        variant: 'destructive',
      })
      return
    }
    setShowSshKeyConfirm(true)
  }

  const handleConfirmSshKeyRequest = async () => {
    const email = subscription?.user?.email
    if (!email) return

    setIsRequestingSshKey(true)
    try {
      const result = await requestNewSshKey(subscriptionId, email)
      setShowSshKeyConfirm(false)
      if (result.sshKey?.privateKey) {
        setNewSshKey({
          privateKey: result.sshKey.privateKey,
          instanceName: vmDetails?.vm?.instanceName || 'VM',
        })
      } else {
        toast({
          title: 'SSH Key Created',
          description: result.message,
          variant: 'default',
          duration: 8000,
        })
      }
    } catch (error: any) {
      console.error('Error requesting new SSH key:', error)
      setShowSshKeyConfirm(false)
      toast({
        title: 'Request Failed',
        description: error.response?.data?.message || 'Failed to generate new SSH key. Please try again.',
        variant: 'destructive',
        duration: 8000,
      })
    } finally {
      setIsRequestingSshKey(false)
    }
  }

  const validateWindowsPassword = (pwd: string): string | null => {
    if (pwd.length < 14) return t('packageDetail.resetPassword.validation.minLength')
    if (pwd.length > 127) return t('packageDetail.resetPassword.validation.maxLength')
    if (pwd.toLowerCase().includes('opc')) return t('packageDetail.resetPassword.validation.noUsername')
    if (!/[A-Z]/.test(pwd)) return t('packageDetail.resetPassword.validation.needUpper')
    if (!/[a-z]/.test(pwd)) return t('packageDetail.resetPassword.validation.needLower')
    if (!/[0-9]/.test(pwd)) return t('packageDetail.resetPassword.validation.needDigit')
    if (!/[^A-Za-z0-9]/.test(pwd)) return t('packageDetail.resetPassword.validation.needSpecial')
    return null
  }

  const handleResetWindowsPassword = async () => {
    setIsResettingPassword(true)
    setResetPasswordDialog(false)
    const passwordToUse = customPassword.trim() || undefined
    setCustomPassword('')
    setShowCustomPassword(false)
    try {
      const result = await resetWindowsPassword(subscriptionId, passwordToUse)
      setNewWindowsPassword(result.newPassword)
      const updatedVm = await getSubscriptionVm(subscriptionId)
      setVmDetails(updatedVm)
      toast({
        title: t('packageDetail.toast.passwordResetSuccess'),
        description: t('packageDetail.toast.passwordResetSuccessDesc'),
        duration: 8000,
      })
    } catch (error: any) {
      console.error('Error resetting Windows password:', error)
      toast({
        title: t('packageDetail.toast.passwordResetError'),
        description: error?.response?.data?.message || error?.message || t('packageDetail.toast.passwordResetErrorDesc'),
        variant: 'destructive',
        duration: 8000,
      })
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleDeleteVmOnly = () => {
    setConfirmDialog({
      open: true,
      title: t('packageDetail.confirmDialog.deleteVmOnly.title'),
      description: t('packageDetail.confirmDialog.deleteVmOnly.description'),
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }))
        setIsLoading(true)
        try {
          await deleteVmOnly(subscriptionId)
          toast({
            title: t('packageDetail.toast.deleteVmSuccess'),
            description: t('packageDetail.toast.deleteVmSuccessDesc'),
            variant: 'default',
          })
          setVmDetails(null)
          const data = await getSubscriptionById(subscriptionId)
          setSubscription(data)
        } catch (error: any) {
          console.error('Error deleting VM:', error)
          toast({
            title: t('packageDetail.toast.deleteVmFailed'),
            description: error?.response?.data?.message || t('packageDetail.toast.deleteVmFailedDesc'),
            variant: 'destructive',
          })
        } finally {
          setIsLoading(false)
        }
      },
    })
  }

  const handleAction = async (action: string) => {
    if (action === 'delete') {
      setConfirmDialog({
        open: true,
        title: t('packageDetail.confirmDialog.deleteSubscription.title'),
        description: t('packageDetail.confirmDialog.deleteSubscription.description'),
        onConfirm: async () => {
          setConfirmDialog(prev => ({ ...prev, open: false }))
          setIsLoading(true)
          try {
            await deleteSubscription(subscriptionId)
            toast({
              title: t('packageDetail.toast.deleteSuccess'),
              description: t('packageDetail.toast.deleteSuccessDesc'),
              variant: 'default',
            })
            setTimeout(() => {
              router.push('/admin/subscriptions')
            }, 1000)
          } catch (error: any) {
            console.error('Error deleting subscription:', error)
            toast({
              title: t('packageDetail.toast.deleteError'),
              description: error?.message || 'Vui lòng thử lại sau hoặc liên hệ hỗ trợ.',
              variant: 'destructive',
            })
            setIsLoading(false)
          }
        },
      })
      return
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'suspended': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t('packageDetail.status.active')
      case 'inactive': return t('packageDetail.status.inactive')
      case 'expired': return t('packageDetail.status.expired')
      case 'suspended': return t('packageDetail.status.suspended')
      case 'cancelled': return t('packageDetail.status.cancelled')
      case 'pending': return t('packageDetail.status.pending')
      default: return status.toUpperCase()
    }
  }

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-lg">{t('packageDetail.loading.subscription')}</div>
        </div>
      </div>
    )
  }

  if (!subscription || !packageDetail) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600">{t('packageDetail.error.notFound')}</div>
          <Button
            onClick={() => router.push('/admin/subscriptions')}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('packageDetail.buttons.back')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/subscriptions')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('packageDetail.buttons.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-foreground">
                {t('packageDetail.title')}
              </h1>
              <p className="text-gray-600 dark:text-muted-foreground mt-1">
                {t('packageDetail.subtitle')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(packageDetail.status)}>
              {getStatusLabel(packageDetail.status)}
            </Badge>
          </div>
        </div>

        {/* Server Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('packageDetail.vmInfoTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!subscription?.vm_instance_id ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    {t('packageDetail.vmNotConfigured.message1')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.serverDetails.status')}</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        vmDetails?.vm?.lifecycleState === 'RUNNING'
                          ? 'bg-green-100 text-green-700'
                          : vmDetails?.vm?.lifecycleState === 'STOPPED'
                          ? 'bg-gray-100 text-gray-700'
                          : vmDetails?.vm?.lifecycleState === 'PROVISIONING'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {vmDetails?.vm?.lifecycleState || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.serverDetails.hostname')}</p>
                    <p className="font-semibold">{vmDetails?.vm?.instanceName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.serverDetails.username')}</p>
                    <p className="font-semibold">root</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.serverDetails.ip')}</p>
                    {vmDetails?.vm?.publicIp ? (
                        <p className="font-semibold">{vmDetails.vm.publicIp}</p>
                    ) : (
                      <p className="font-semibold text-gray-400">-</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted-foreground">Instance ID</p>
                    <p className="font-semibold text-xs break-all">{vmDetails?.vm?.instanceId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted-foreground">Compartment ID</p>
                    <p className="font-semibold text-xs break-all">{vmDetails?.vm?.compartmentId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted-foreground">Operating System</p>
                    <p className="font-semibold">{vmDetails?.vm?.operatingSystem || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-muted-foreground">Version</p>
                    <p className="font-semibold">{vmDetails?.vm?.operatingSystemVersion || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600 dark:text-muted-foreground">Image</p>
                    <p className="font-semibold text-xs break-all">{vmDetails?.vm?.imageName || 'N/A'}</p>
                  </div>

                </div>
              )}

              {/* Windows Password Section */}
              {vmDetails?.vm?.operatingSystem?.toLowerCase().includes('windows') && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      🪟 Windows RDP Credentials
                    </p>
                    {vmDetails.vm.lifecycleState === 'RUNNING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                        onClick={() => setResetPasswordDialog(true)}
                        disabled={isResettingPassword}
                      >
                        {isResettingPassword ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Key className="h-3 w-3 mr-1" />
                        )}
                        {t('packageDetail.serverDetails.resetPassword')}
                      </Button>
                    )}
                  </div>
                  {vmDetails.vm.windowsInitialPassword ? (
                    <div className="bg-gray-50 dark:bg-muted p-3 rounded space-y-2 text-sm font-mono">
                      <div className="flex items-center justify-between">
                        <span><strong>Username:</strong> opc</span>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard('opc', 'win-user')}>
                          {copiedField === 'win-user' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span><strong>Initial password:</strong> {vmDetails.vm.windowsInitialPassword}</span>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(vmDetails.vm!.windowsInitialPassword!, 'win-pass')}>
                          {copiedField === 'win-pass' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 p-3 rounded text-sm">
                      <p className="text-yellow-800 dark:text-yellow-400">
                        ⏳ Mật khẩu đang được tạo (5–10 phút sau khi VM khởi động).
                        Hãy làm mới trang sau vài phút.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        {subscription?.vm_instance_id && vmDetails?.vm?.lifecycleState === 'RUNNING' ? (
          <>
            {/* Time Range Selector */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Time Range:</span>
                    <div className="flex gap-2">
                      {(['1h', '6h', '24h', '7d'] as const).map((range) => (
                        <Button
                          key={range}
                          variant={timeRange === range ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTimeRange(range)}
                          disabled={isLoadingMetrics}
                        >
                          {range}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (vmDetails?.vm?.instanceId) {
                        setIsLoadingMetrics(true)
                        try {
                          const metricsData = await getInstanceMetrics(vmDetails.vm.instanceId, timeRange)
                          setMetrics(metricsData)
                        } finally {
                          setIsLoadingMetrics(false)
                        }
                      }
                    }}
                    disabled={isLoadingMetrics}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CPU Usage Chart */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold">{t('packageDetail.charts.cpuTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {isLoadingMetrics ? (
                      <div className="flex items-center justify-center h-full">
                        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                      </div>
                    ) : metrics?.cpu && metrics.cpu.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.cpu}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} className="text-sm" tickFormatter={(t) => parseAsUtc(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} className="text-sm" />
                          <Area type="monotone" dataKey="value" stroke="#ef4444" fill="#fecaca" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-muted-foreground">
                        <p>No data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Memory Usage Chart */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold">{t('packageDetail.charts.memoryTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {isLoadingMetrics ? (
                      <div className="flex items-center justify-center h-full">
                        <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
                      </div>
                    ) : metrics?.memory && metrics.memory.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.memory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} className="text-sm" tickFormatter={(t) => parseAsUtc(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} className="text-sm" />
                          <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#ddd6fe" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-muted-foreground">
                        <p>No data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Network Traffic Chart */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold">{t('packageDetail.charts.networkTraffic')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {isLoadingMetrics ? (
                      <div className="flex items-center justify-center h-full">
                        <RefreshCw className="h-8 w-8 animate-spin text-green-500" />
                      </div>
                    ) : getNetworkData().length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getNetworkData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} className="text-sm" tickFormatter={(t) => parseAsUtc(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} />
                          <YAxis axisLine={false} tickLine={false} className="text-sm" />
                          <Area type="monotone" dataKey="in" stackId="1" stroke="#10b981" fill="#d1fae5" strokeWidth={2} name="In" />
                          <Area type="monotone" dataKey="out" stackId="1" stroke="#3b82f6" fill="#bfdbfe" strokeWidth={2} name="Out" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-muted-foreground">
                        <p>No data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Disk I/O Chart */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-semibold">{t('packageDetail.charts.diskIO')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {isLoadingMetrics ? (
                      <div className="flex items-center justify-center h-full">
                        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
                      </div>
                    ) : getDiskData().length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getDiskData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" axisLine={false} tickLine={false} className="text-sm" tickFormatter={(t) => parseAsUtc(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} />
                          <YAxis axisLine={false} tickLine={false} className="text-sm" />
                          <Area type="monotone" dataKey="read" stackId="1" stroke="#f59e0b" fill="#fed7aa" strokeWidth={2} name="Read" />
                          <Area type="monotone" dataKey="write" stackId="1" stroke="#ef4444" fill="#fecaca" strokeWidth={2} name="Write" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 dark:text-muted-foreground">
                        <p>No data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500 dark:text-muted-foreground">
                <p>
                  {subscription?.vm_instance_id
                    ? t('packageDetail.vmNotConfigured.message4')
                    : t('packageDetail.vmNotConfigured.message3')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Package Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Package Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('packageDetail.packageInfo.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.packageInfo.packageName')}</p>
                  <p className="font-semibold">{packageDetail.packageName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.packageInfo.vmName')}</p>
                  <p className="font-semibold">{vmDetails?.vm?.instanceName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.packageInfo.cpu')}</p>
                  <p className="font-semibold">{packageDetail.cpu || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.packageInfo.memory')}</p>
                  <p className="font-semibold">{packageDetail.memory || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.packageInfo.storage')}</p>
                  <p className="font-semibold">{packageDetail.storage || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.packageInfo.bandwidth')}</p>
                  <p className="font-semibold">{packageDetail.bandwidth || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.packageInfo.ipAddress')}</p>
                  <p className="font-semibold">{vmDetails?.vm?.publicIp || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.packageInfo.email')}</p>
                  <p className="font-semibold">{packageDetail.user?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.packageInfo.startDate')}</p>
                  <p className="font-semibold">{packageDetail.startDate || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.packageInfo.endDate')}</p>
                  <p className="font-semibold">{packageDetail.endDate || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.packageInfo.autoRenew')}</p>
                  <p className="font-semibold">
                    <Badge variant={packageDetail.autoRenew ? 'default' : 'outline'}>
                      {packageDetail.autoRenew ? t('packageDetail.packageInfo.yes') : t('packageDetail.packageInfo.no')}
                    </Badge>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.packageInfo.monthlyCost')}</p>
                  <p className="font-semibold">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(packageDetail.monthlyPrice)}
                  </p>
                </div>
                {vmDetails?.vm && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-muted-foreground">VM Status</p>
                      <p className="font-semibold">{vmDetails.vm.lifecycleState || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-muted-foreground">Created Date</p>
                      <p className="font-semibold">
                        {vmDetails.vm.createdAt ? formatDateOnly(vmDetails.vm.createdAt) : '-'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('packageDetail.actions.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!subscription?.vm_instance_id ? (
                <div className="space-y-3">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-3">{t('packageDetail.vmNotConfigured.label')}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-3">
                    {vmDetails?.vm && (
                      <>
                        <p className="text-sm text-gray-600 dark:text-muted-foreground">
                          <strong>VM State:</strong> {vmDetails.vm.lifecycleState}
                        </p>
                        {vmDetails.vm.publicIp && (
                          <p className="text-sm text-gray-600 dark:text-muted-foreground">
                            <strong>Public IP:</strong> {vmDetails.vm.publicIp}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => handleVmAction('START')}
                    disabled={isLoading || vmDetails?.vm?.lifecycleState === 'RUNNING' || vmDetails?.vm?.lifecycleState === 'PROVISIONING'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {t('packageDetail.actions.startVM')}
                  </Button>

                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => handleVmAction('STOP')}
                    disabled={isLoading || vmDetails?.vm?.lifecycleState === 'STOPPED' || vmDetails?.vm?.lifecycleState === 'PROVISIONING'}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    {t('packageDetail.actions.pauseVM')}
                  </Button>

                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => handleVmAction('RESTART')}
                    disabled={isLoading || vmDetails?.vm?.lifecycleState !== 'RUNNING'}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('packageDetail.actions.restartVM')}
                  </Button>

                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={handleRequestNewKey}
                    disabled={isLoading || isRequestingSshKey}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isRequestingSshKey ? 'Generating...' : 'Request New SSH Key'}
                  </Button>

                  <Button
                    className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setIsTerminalOpen(true)}
                    disabled={isLoading || vmDetails?.vm?.lifecycleState !== 'RUNNING'}
                  >
                    <Terminal className="h-4 w-4 mr-2" />
                    Open Terminal
                  </Button>
                </>
              )}

              <div className="pt-2 border-t dark:border-border space-y-2">
                {subscription?.vm_instance_id && (
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={handleDeleteVmOnly}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-orange-500" />
                    <span className="text-orange-600">{t('packageDetail.vmNotConfigured.deleteButton')}</span>
                  </Button>
                )}
                <Button
                  className="w-full justify-start"
                  variant="destructive"
                  onClick={() => handleAction('delete')}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('packageDetail.actions.deletePackage')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Billing Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('packageDetail.billing.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.billing.createdDate')}</p>
                <p className="text-xl font-bold text-blue-600">{packageDetail.createdAt}</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.billing.nextBilling')}</p>
                <p className="text-xl font-bold text-green-600">{packageDetail.nextBilling}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-muted-foreground">{t('packageDetail.billing.monthlyCost')}</p>
                <p className="text-xl font-bold text-purple-600">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(packageDetail.monthlyPrice)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terminal Modal */}
      {vmDetails?.vm && (
        <TerminalComponent
          vmId={vmDetails.vm.id}
          vmName={vmDetails.vm.instanceName}
          isOpen={isTerminalOpen}
          onClose={() => setIsTerminalOpen(false)}
        />
      )}

      {/* SSH Key Request Confirmation Dialog */}
      <ConfirmSshKeyRequestDialog
        isOpen={showSshKeyConfirm}
        onClose={() => !isRequestingSshKey && setShowSshKeyConfirm(false)}
        onConfirm={handleConfirmSshKeyRequest}
        email={subscription?.user?.email || ''}
        vmName={vmDetails?.vm?.instanceName}
        isLoading={isRequestingSshKey}
      />

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('packageDetail.confirmDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDialog.onConfirm()} className="bg-destructive hover:bg-destructive/90">
              {t('packageDetail.confirmDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* One-time SSH Key Display Dialog */}
      <AlertDialog open={!!newSshKey} onOpenChange={() => {}}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle className="h-6 w-6 text-green-500" />
              SSH Key mới đã tạo thành công!
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left pt-2">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="font-semibold text-red-900 text-sm">
                    ⚠️ Thông tin này chỉ hiển thị 1 lần duy nhất
                  </p>
                  <p className="text-red-800 text-sm mt-1">
                    Vui lòng lưu lại ngay bây giờ. Sau khi đóng cửa sổ này, bạn sẽ không thể xem lại private key.
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-2 flex items-center gap-2 text-sm">
                    <Key className="h-4 w-4" /> SSH Private Key — {newSshKey?.instanceName}
                  </p>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={newSshKey?.privateKey || ''}
                      className="w-full h-40 font-mono text-xs p-3 bg-gray-900 text-green-400 rounded border resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(newSshKey!.privateKey, 'newkey')}
                    className="flex-1"
                  >
                    {copiedField === 'newkey' ? <Check className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
                    {copiedField === 'newkey' ? 'Đã sao chép!' : 'Sao chép key'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => downloadFile(newSshKey!.privateKey, `${newSshKey?.instanceName || 'vm'}-new-key.pem`)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Tải về (.pem)
                  </Button>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setNewSshKey(null)}
              className="bg-green-600 hover:bg-green-700"
            >
              Đã lưu — Đóng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Windows Password — Confirmation dialog */}
      <AlertDialog open={resetPasswordDialog} onOpenChange={(open) => {
        if (!open) { setCustomPassword(''); setShowCustomPassword(false) }
        setResetPasswordDialog(open)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🔑 {t('packageDetail.serverDetails.resetPasswordTitle')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>{t('packageDetail.serverDetails.resetPasswordDesc')}</p>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('packageDetail.resetPassword.newPasswordLabel')}
                  </label>
                  <div className="relative">
                    <Input
                      type={showCustomPassword ? 'text' : 'password'}
                      placeholder={t('packageDetail.resetPassword.newPasswordPlaceholder')}
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCustomPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {customPassword && (() => {
                    const err = validateWindowsPassword(customPassword)
                    return err
                      ? <p className="text-xs text-destructive">{err}</p>
                      : <p className="text-xs text-green-600 dark:text-green-400">✓ {t('packageDetail.resetPassword.validation.valid')}</p>
                  })()}
                  <p className="text-xs text-muted-foreground">{t('packageDetail.resetPassword.newPasswordHint')}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setCustomPassword(''); setShowCustomPassword(false) }}>
              {t('packageDetail.confirmDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetWindowsPassword}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              disabled={!!customPassword && !!validateWindowsPassword(customPassword)}
            >
              {t('packageDetail.serverDetails.resetPasswordConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Windows Password — Loading Dialog */}
      <AlertDialog open={isResettingPassword} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              {t('packageDetail.serverDetails.resetPasswordResettingTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('packageDetail.serverDetails.resetPasswordResettingDesc')}
              <p className="text-sm text-muted-foreground mt-2">{t('packageDetail.serverDetails.resetPasswordResettingNote')}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Windows Password — New password display (one-time) */}
      <AlertDialog open={!!newWindowsPassword} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              ✅ {t('packageDetail.serverDetails.resetPasswordSuccessTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('packageDetail.serverDetails.resetPasswordSuccessDesc')}
                </p>
                <div className="bg-gray-50 dark:bg-muted border rounded p-4 font-mono text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span><strong>Username:</strong> opc</span>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard('opc', 'new-win-user')}>
                      {copiedField === 'new-win-user' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span><strong>New password:</strong> {newWindowsPassword}</span>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(newWindowsPassword!, 'new-win-pass')}>
                      {copiedField === 'new-win-pass' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  ⚠️ {t('packageDetail.serverDetails.resetPasswordWarning')}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setNewWindowsPassword(null)}>
              {t('packageDetail.serverDetails.resetPasswordClose')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
