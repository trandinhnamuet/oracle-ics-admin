'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Activity,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Database,
  Download,
  FolderOpen,
  Info,
  RefreshCw,
  Search,
  Server,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { getAllVmsBandwidth } from '@/api/bandwidth.api'
import { useTranslation } from 'react-i18next'

interface BandwidthData {
  egressTB: number
  ingressTB: number
  bytesIn: number
  bytesOut: number
  dataSource: 'oci' | 'archived' | 'none' | 'error'
  error?: string
}

interface VmBandwidth {
  vmId: number
  instanceId: string
  instanceName: string
  publicIp: string
  lifecycleState: string
  compartmentId: string
  userId: number
  userEmail: string
  userName: string
  companyName: string
  subscriptionId: string
  subscriptionStatus: string
  packageName: string
  vmCreatedAt: string
  bandwidth: BandwidthData
  month: string
}

interface DeletedVmsSummary {
  count: number
  egressTB: number
  ingressTB: number
  dataSource: 'oci' | 'archived'
}

interface CompartmentGroup {
  compartmentId: string
  compartmentName: string
  vmCount: number
  vmsWithData: number
  egressTB: number
  ingressTB: number
  vms: VmBandwidth[]
  deletedVmsSummary: DeletedVmsSummary | null
}

interface BandwidthSummary {
  totalVMs: number
  vmsWithData: number
  totalEgressTB: number
  totalIngressTB: number
  totalDeletedVMs?: number
  totalEgressTBIncDeleted?: number
  totalIngressTBIncDeleted?: number
}

interface BandwidthResponse {
  summary: BandwidthSummary
  compartments: CompartmentGroup[]
  vms: VmBandwidth[]
}

export default function BandwidthManagementPage() {
  const { t } = useTranslation()

  // monthOptions computed client-only to avoid SSR hydration mismatch
  // (new Date() + toLocaleDateString are locale/timezone sensitive)
  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<BandwidthResponse | null>(null)
  const [month, setMonth] = useState('')
  const [filterText, setFilterText] = useState('')
  const [sortBy, setSortBy] = useState<'usage' | 'name' | 'user'>('usage')
  const [expandedCompartments, setExpandedCompartments] = useState<Set<string>>(new Set())

  // Build month options and initial selection on client only
  useEffect(() => {
    const options: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
      options.push({
        value,
        label: i === 0 ? `${label} ${t('admin.bandwidth.month.current')}` : label,
      })
    }
    setMonthOptions(options)
    setMonth(options[0].value)
  }, [t])

  useEffect(() => {
    if (month) fetchBandwidthData()
  }, [month])

  const fetchBandwidthData = async () => {
    try {
      setLoading(true)
      const response = await getAllVmsBandwidth(month)
      if (response.success) {
        setData(response.data)
        // Compartments collapsed by default
        setExpandedCompartments(new Set())
      }
    } catch (error) {
      console.error('Error fetching bandwidth data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchBandwidthData()
    setRefreshing(false)
  }

  const toggleCompartment = (id: string) => {
    setExpandedCompartments(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusBadge = (dataSource: string) => {
    if (dataSource === 'error') {
      return <Badge variant="secondary">{t('admin.bandwidth.status.error')}</Badge>
    }
    if (dataSource === 'oci') {
      return <Badge variant="default" className="bg-green-500">{t('admin.bandwidth.status.live')}</Badge>
    }
    if (dataSource === 'archived') {
      return <Badge variant="outline" className="text-blue-600 border-blue-500">{t('admin.bandwidth.status.archived')}</Badge>
    }
    return <Badge variant="outline" className="text-gray-400">{t('admin.bandwidth.status.noData')}</Badge>
  }

  // Filter + sort VMs within each compartment; hide compartments with no matching VMs
  const filteredCompartments = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    return (data?.compartments ?? [])
      .map(compartment => {
        const filteredVms = compartment.vms.filter(vm => {
          if (!q) return true
          return (
            vm.instanceName?.toLowerCase().includes(q) ||
            vm.userEmail?.toLowerCase().includes(q) ||
            vm.userName?.toLowerCase().includes(q) ||
            vm.publicIp?.toLowerCase().includes(q)
          )
        })
        const sortedVms = [...filteredVms].sort((a, b) => {
          if (sortBy === 'usage') return (b.bandwidth?.egressTB ?? 0) - (a.bandwidth?.egressTB ?? 0)
          if (sortBy === 'name') return (a.instanceName ?? '').localeCompare(b.instanceName ?? '')
          if (sortBy === 'user') return (a.userName ?? '').localeCompare(b.userName ?? '')
          return 0
        })
        return { ...compartment, vms: sortedVms }
      })
      .filter(c => c.vms.length > 0 || (c.deletedVmsSummary && c.deletedVmsSummary.count > 0))
  }, [data, filterText, sortBy])

  const totalFilteredVMs = useMemo(
    () => filteredCompartments.reduce((s, c) => s + c.vms.length, 0),
    [filteredCompartments]
  )

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg">{t('admin.bandwidth.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('admin.bandwidth.title')}</h1>
          <p className="text-muted-foreground">{t('admin.bandwidth.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{t('admin.bandwidth.month.label')}</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-4 py-2 border rounded-md bg-background">
            {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {t('admin.bandwidth.refresh')}
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">{t('admin.bandwidth.info.text')}</p>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{t('admin.bandwidth.summary.totalVMs')}</p>
                  <p className="text-3xl font-bold">{data.summary?.totalVMs ?? 0}</p>
                  {(data.summary?.totalDeletedVMs ?? 0) > 0 && (
                    <p className="text-xs opacity-75 mt-1">
                      +{data.summary.totalDeletedVMs} {t('admin.bandwidth.summary.deleted')}
                    </p>
                  )}
                </div>
                <Server className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{t('admin.bandwidth.summary.vmsWithData')}</p>
                  <p className="text-3xl font-bold">{data.summary?.vmsWithData ?? 0}</p>
                </div>
                <Activity className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{t('admin.bandwidth.summary.totalEgress')}</p>
                  <p className="text-3xl font-bold">
                    {((data.summary?.totalEgressTBIncDeleted ?? data.summary?.totalEgressTB) ?? 0).toFixed(4)} TB
                  </p>
                  {(data.summary?.totalDeletedVMs ?? 0) > 0 && (
                    <p className="text-xs opacity-75 mt-1">
                      {t('admin.bandwidth.summary.activeVMs')}: {(data.summary?.totalEgressTB ?? 0).toFixed(4)} TB
                    </p>
                  )}
                </div>
                <Upload className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">{t('admin.bandwidth.summary.totalIngress')}</p>
                  <p className="text-3xl font-bold">
                    {((data.summary?.totalIngressTBIncDeleted ?? data.summary?.totalIngressTB) ?? 0).toFixed(4)} TB
                  </p>
                  {(data.summary?.totalDeletedVMs ?? 0) > 0 && (
                    <p className="text-xs opacity-75 mt-1">
                      {t('admin.bandwidth.summary.activeVMs')}: {(data.summary?.totalIngressTB ?? 0).toFixed(4)} TB
                    </p>
                  )}
                </div>
                <Download className="h-12 w-12 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search + Sort */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder={t('admin.bandwidth.filter.searchPlaceholder')}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="max-w-sm"
              />
              {filterText && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {totalFilteredVMs} / {data?.summary?.totalVMs ?? 0} VMs
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <ArrowUpDown className="h-4 w-4" />
              <span className="font-medium text-sm">{t('admin.bandwidth.sort.label')}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'usage' | 'name' | 'user')}
                className="px-3 py-1 border rounded-md bg-background"
              >
                <option value="usage">{t('admin.bandwidth.sort.usage')}</option>
                <option value="name">{t('admin.bandwidth.sort.name')}</option>
                <option value="user">{t('admin.bandwidth.sort.user')}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compartment List */}
      <div className="space-y-4">
        {filteredCompartments.map((compartment) => {
          const isExpanded = expandedCompartments.has(compartment.compartmentId)
          // Show a short label: if name differs from OCID, use name; else trim the OCID
          const displayName = compartment.compartmentName !== compartment.compartmentId
            ? compartment.compartmentName
            : compartment.compartmentId.split('.').slice(-1)[0]?.substring(0, 20) ?? compartment.compartmentId

          return (
            <Card key={compartment.compartmentId} className="overflow-hidden">
              {/* Compartment Header */}
              <button
                type="button"
                className="w-full text-left"
                onClick={() => toggleCompartment(compartment.compartmentId)}
              >
                <div className="flex items-center justify-between px-6 py-4 bg-muted/40 hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base truncate">{displayName}</span>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {compartment.vmCount} {t('admin.bandwidth.compartment.vms')}
                        </Badge>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {compartment.vmsWithData} {t('admin.bandwidth.compartment.withData')}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{compartment.compartmentId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0 ml-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">{t('admin.bandwidth.details.egress')}</p>
                      <p className="font-bold text-orange-600">
                        {(compartment.egressTB + (compartment.deletedVmsSummary?.egressTB ?? 0)).toFixed(4)} TB
                      </p>
                      {(compartment.deletedVmsSummary?.egressTB ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {t('admin.bandwidth.compartment.active')}: {compartment.egressTB.toFixed(4)} TB
                        </p>
                      )}
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">{t('admin.bandwidth.details.ingress')}</p>
                      <p className="font-bold text-blue-600">
                        {(compartment.ingressTB + (compartment.deletedVmsSummary?.ingressTB ?? 0)).toFixed(4)} TB
                      </p>
                      {(compartment.deletedVmsSummary?.ingressTB ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {t('admin.bandwidth.compartment.active')}: {compartment.ingressTB.toFixed(4)} TB
                        </p>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      : <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    }
                  </div>
                </div>
              </button>

              {/* VM List within compartment */}
              {isExpanded && (
                <div className="divide-y">
                  {compartment.vms.map((vm) => (
                    <div key={vm.vmId} className="px-6 py-4">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="text-lg font-bold">{vm.instanceName}</h3>
                              {getStatusBadge(vm.bandwidth?.dataSource ?? 'none')}
                              <Badge variant="outline">{vm.lifecycleState}</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>{vm.userName}</span>
                              </div>
                              <div>{t('admin.bandwidth.details.email')}: {vm.userEmail}</div>
                              <div>{t('admin.bandwidth.details.ip')}: {vm.publicIp || 'N/A'}</div>
                              <div>{t('admin.bandwidth.details.package')}: {vm.packageName}</div>
                              {vm.companyName && <div>{t('admin.bandwidth.details.company')}: {vm.companyName}</div>}
                            </div>
                          </div>
                        </div>

                        {vm.bandwidth?.dataSource !== 'error' ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Upload className="h-3 w-3" />{t('admin.bandwidth.details.egress')}
                              </p>
                              <p className="text-2xl font-bold">{formatBytes(vm.bandwidth?.bytesOut ?? 0)}</p>
                              <p className="text-xs text-muted-foreground mt-1">{(vm.bandwidth?.egressTB ?? 0).toFixed(6)} TB</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Download className="h-3 w-3" />{t('admin.bandwidth.details.ingress')}
                              </p>
                              <p className="text-2xl font-bold">{formatBytes(vm.bandwidth?.bytesIn ?? 0)}</p>
                              <p className="text-xs text-muted-foreground mt-1">{(vm.bandwidth?.ingressTB ?? 0).toFixed(6)} TB</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">{t('admin.bandwidth.details.dataSource')}</p>
                              <p className="text-sm font-medium mt-2">
                                {vm.bandwidth?.dataSource === 'oci' ? t('admin.bandwidth.source.oci') :
                                 vm.bandwidth?.dataSource === 'archived' ? t('admin.bandwidth.source.archived') :
                                 t('admin.bandwidth.source.none')}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-300 rounded-lg p-4">
                            <p className="text-sm text-muted-foreground">
                              {t('admin.bandwidth.warning.errorMessage', { error: vm.bandwidth?.error })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Deleted VMs aggregated row — always shown */}
                  {compartment.deletedVmsSummary && (
                    <div className="px-6 py-4 bg-red-50 dark:bg-red-950/30 border-t-2 border-red-200 dark:border-red-800">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Trash2 className="h-5 w-5 text-red-500 flex-shrink-0" />
                          <h3 className="text-base font-bold text-red-700 dark:text-red-400">
                            {t('admin.bandwidth.deletedVms.label')}
                          </h3>
                          <Badge variant="destructive" className="text-xs">
                            {compartment.deletedVmsSummary.count} {t('admin.bandwidth.deletedVms.vmsCount')}
                          </Badge>
                          {compartment.deletedVmsSummary.count > 0 && (
                            <Badge
                              variant="outline"
                              className={
                                compartment.deletedVmsSummary.dataSource === 'archived'
                                  ? 'text-blue-600 border-blue-500 text-xs'
                                  : 'text-green-600 border-green-500 text-xs'
                              }
                            >
                              {compartment.deletedVmsSummary.dataSource === 'archived'
                                ? t('admin.bandwidth.status.archived')
                                : t('admin.bandwidth.status.live')}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-red-100 dark:bg-red-900/40 p-4 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <Upload className="h-3 w-3" />{t('admin.bandwidth.details.egress')}
                            </p>
                            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                              {compartment.deletedVmsSummary.count > 0
                                ? formatBytes(compartment.deletedVmsSummary.egressTB * 1024 ** 4)
                                : '0 B'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {compartment.deletedVmsSummary.egressTB.toFixed(6)} TB
                            </p>
                          </div>
                          <div className="bg-red-100 dark:bg-red-900/40 p-4 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <Download className="h-3 w-3" />{t('admin.bandwidth.details.ingress')}
                            </p>
                            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                              {compartment.deletedVmsSummary.count > 0
                                ? formatBytes(compartment.deletedVmsSummary.ingressTB * 1024 ** 4)
                                : '0 B'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {compartment.deletedVmsSummary.ingressTB.toFixed(6)} TB
                            </p>
                          </div>
                          <div className="bg-red-100 dark:bg-red-900/40 p-4 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">{t('admin.bandwidth.details.dataSource')}</p>
                            <p className="text-sm font-medium mt-2 text-red-700 dark:text-red-400">
                              {compartment.deletedVmsSummary.count === 0
                                ? t('admin.bandwidth.deletedVms.noDeletedVms')
                                : compartment.deletedVmsSummary.dataSource === 'oci'
                                  ? t('admin.bandwidth.deletedVms.sourceOci')
                                  : t('admin.bandwidth.deletedVms.sourceArchived')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}

        {filteredCompartments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Database className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">{t('admin.bandwidth.noVms')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
