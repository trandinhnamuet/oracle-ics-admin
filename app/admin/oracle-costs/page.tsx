'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ArrowLeft, RefreshCw, Search, Download, Cloud, Wallet, TrendingUp, TrendingDown,
  Server, AlertTriangle, Info,
} from 'lucide-react'
import { getOciCostMonthly, OciCostMonthlyReport, VmCostRow, CostComponentKey } from '@/api/oci-cost.api'
import { formatPrice, formatDateOnly } from '@/lib/utils'

const COMPONENT_KEYS: CostComponentKey[] = ['cpu', 'ram', 'storage', 'egress', 'windows', 'other']

function fmtUsd(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

function fmtVnd(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return `${n < 0 ? '-' : ''}${formatPrice(Math.abs(n))}₫`
}

function fmtHours(h: number): string {
  return `${h.toLocaleString('en-US', { maximumFractionDigits: 1 })}h`
}

function stateBadgeClass(state: string | null): string {
  switch (state) {
    case 'RUNNING':
      return 'border-green-300 text-green-700 bg-green-50'
    case 'STOPPED':
      return 'border-amber-300 text-amber-700 bg-amber-50'
    case 'TERMINATED':
    case 'TERMINATING':
      return 'border-gray-300 text-gray-600 bg-gray-50'
    default:
      return 'border-blue-300 text-blue-700 bg-blue-50'
  }
}

export default function AdminOracleCostsPage() {
  const { t } = useTranslation()
  const router = useRouter()

  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([])
  const [month, setMonth] = useState('')
  const [report, setReport] = useState<OciCostMonthlyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Month options: current month + 11 previous (client only, avoids SSR mismatch)
  useEffect(() => {
    const options: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
      options.push({ value, label: i === 0 ? `${label} ${t('admin.oracleCosts.month.current')}` : label })
    }
    setMonthOptions(options)
    setMonth((m) => m || options[0].value)
  }, [t])

  const fetchReport = async (sync = true) => {
    if (!month) return
    try {
      setLoading(true)
      setError(null)
      const res = await getOciCostMonthly(month, { sync })
      if (res?.success) setReport(res.data)
      else setError(t('admin.oracleCosts.error'))
    } catch (e: any) {
      console.error('Error fetching Oracle cost report:', e)
      setError(e?.message || t('admin.oracleCosts.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (month) fetchReport(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  const componentLabel = (k: CostComponentKey | 'total') => t(`admin.oracleCosts.components.${k}`)

  const filteredRows = useMemo((): VmCostRow[] => {
    if (!report) return []
    const term = searchTerm.trim().toLowerCase()
    if (!term) return report.rows
    return report.rows.filter((r) =>
      [r.instanceName, r.user.email, r.user.name, r.user.company, r.subscription.packageName, r.shape, r.instanceId]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    )
  }, [report, searchTerm])

  const exportCsv = () => {
    if (!report) return
    const header = [
      'month', 'vm_id', 'instance_name', 'instance_id', 'shape', 'state', 'customer_email', 'customer_name', 'company',
      'package', 'os', 'subscription_status', 'period_from', 'period_to', 'exist_hours', 'running_hours',
      'ocpus', 'billed_ocpus', 'baseline', 'memory_gb', 'boot_volume_gb', 'egress_gb',
      'cpu_usd', 'ram_usd', 'storage_usd', 'egress_usd', 'windows_usd', 'other_usd', 'list_usd', 'net_usd', 'net_vnd',
      'paid_in_month_vnd', 'margin_vnd', 'assumptions',
    ]
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = report.rows.map((r) => [
      report.month, r.vmId, r.instanceName, r.instanceId, r.shape, r.lifecycleState, r.user.email, r.user.name, r.user.company,
      r.subscription.packageName, r.subscription.osType, r.subscription.status, r.period.from, r.period.to,
      r.period.existHours, r.period.runningHours,
      r.spec.ocpus, r.spec.billedOcpus, r.spec.baseline, r.spec.memoryGb, r.spec.bootVolumeGb, r.egress.gb,
      r.cost.cpu, r.cost.ram, r.cost.storage, r.cost.egress, r.cost.windows, r.cost.other, r.cost.listUsd, r.cost.netUsd, r.cost.netVnd,
      r.revenue.paidInMonthVnd, r.marginVnd, r.assumptions.join('|'),
    ].map(esc).join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `oracle-cost-${report.month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const s = report?.summary
  const total = s?.components.total

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('admin.oracleCosts.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t('admin.oracleCosts.title')}</h1>
              <p className="text-muted-foreground mt-1">{t('admin.oracleCosts.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{t('admin.oracleCosts.month.label')}</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-sm"
              disabled={loading}
            >
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Button onClick={() => fetchReport(true)} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('admin.oracleCosts.refresh')}
            </Button>
            <Button onClick={exportCsv} variant="outline" disabled={!report || loading}>
              <Download className="h-4 w-4 mr-2" />
              {t('admin.oracleCosts.exportCsv')}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md border border-red-300 bg-red-50 text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        {loading && !report && (
          <div className="flex justify-center items-center py-24">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mr-2" />
            <span>{t('admin.oracleCosts.loading')}</span>
          </div>
        )}

        {report && s && total && (
          <>
            {(report.window.isCurrentMonth || report.warnings.length > 0) && (
              <div className="space-y-2">
                {report.window.isCurrentMonth && (
                  <div className="flex items-start gap-2 p-3 rounded-md border border-blue-200 bg-blue-50 text-blue-800 text-sm">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      {t('admin.oracleCosts.currentMonthNote', {
                        elapsed: Math.round(report.window.hoursElapsed),
                        total: report.window.hoursInMonth,
                      })}
                    </span>
                  </div>
                )}
                {report.warnings.map((w) => (
                  <div key={w} className="flex items-start gap-2 p-3 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{t(`admin.oracleCosts.warnings.${w.split(':')[0]}`, { count: Number(w.split(':')[1] || 0) })}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('admin.oracleCosts.summary.oracleBill')}</CardTitle>
                  <Cloud className="h-5 w-5 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{fmtVnd(total.netVnd)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fmtUsd(total.netUsd)} · {t('admin.oracleCosts.summary.oracleBillDesc', { list: fmtUsd(total.listUsd), discount: total.discountPct })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('admin.oracleCosts.summary.collected')}</CardTitle>
                  <Wallet className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{fmtVnd(s.revenue.totalCollectedVnd)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('admin.oracleCosts.summary.collectedDesc', { unattributed: fmtVnd(s.revenue.unattributedVnd) })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('admin.oracleCosts.summary.margin')}</CardTitle>
                  {s.marginVnd >= 0
                    ? <TrendingUp className="h-5 w-5 text-emerald-500" />
                    : <TrendingDown className="h-5 w-5 text-red-500" />}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${s.marginVnd >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {s.marginVnd >= 0 ? '+' : ''}{fmtVnd(s.marginVnd)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.marginPct != null
                      ? t('admin.oracleCosts.summary.marginDesc', { pct: s.marginPct })
                      : t('admin.oracleCosts.summary.marginNoRevenue')}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{t('admin.oracleCosts.summary.vms')}</CardTitle>
                  <Server className="h-5 w-5 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{s.vmCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('admin.oracleCosts.summary.vmsDesc', {
                      running: s.runningVmCount,
                      terminated: s.terminatedInMonthCount,
                      windows: s.windowsVmCount,
                    })}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Component breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.oracleCosts.components.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.oracleCosts.components.component')}</TableHead>
                        <TableHead className="text-right">{t('admin.oracleCosts.components.listUsd')}</TableHead>
                        <TableHead className="text-right">{t('admin.oracleCosts.components.discount')}</TableHead>
                        <TableHead className="text-right">{t('admin.oracleCosts.components.netUsd')}</TableHead>
                        <TableHead className="text-right">{t('admin.oracleCosts.components.netVnd')}</TableHead>
                        <TableHead className="text-right">{t('admin.oracleCosts.components.share')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {COMPONENT_KEYS.map((k) => {
                        const c = s.components[k]
                        if (k === 'other' && c.listUsd === 0) return null
                        const share = total.netUsd > 0 ? (c.netUsd / total.netUsd) * 100 : 0
                        return (
                          <TableRow key={k}>
                            <TableCell className="font-medium">
                              {componentLabel(k)}
                              {k === 'egress' && (
                                <div className="text-xs text-muted-foreground font-normal">
                                  {t('admin.oracleCosts.components.egressNote', {
                                    total: s.egress.totalGb.toLocaleString('en-US', { maximumFractionDigits: 1 }),
                                    unattributed: s.egress.unattributedGb.toLocaleString('en-US', { maximumFractionDigits: 1 }),
                                    free: s.egress.freeGb.toLocaleString('en-US'),
                                    billable: s.egress.billableGb.toLocaleString('en-US', { maximumFractionDigits: 1 }),
                                  })}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{fmtUsd(c.listUsd)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{c.discountPct}%</TableCell>
                            <TableCell className="text-right font-semibold">{fmtUsd(c.netUsd)}</TableCell>
                            <TableCell className="text-right font-semibold">{fmtVnd(c.netVnd)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{share.toFixed(1)}%</TableCell>
                          </TableRow>
                        )
                      })}
                      <TableRow className="bg-muted/50">
                        <TableCell className="font-bold">{componentLabel('total')}</TableCell>
                        <TableCell className="text-right font-bold">{fmtUsd(total.listUsd)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{total.discountPct}%</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{fmtUsd(total.netUsd)}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">{fmtVnd(total.netVnd)}</TableCell>
                        <TableCell className="text-right">100%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {t('admin.oracleCosts.fxNote', {
                    rate: report.rates.usdToVnd.toLocaleString('en-US'),
                    source: t(`admin.oracleCosts.fxSource.${report.rates.fxSource}`),
                    date: report.rates.fxDate || '',
                  })}
                </p>
              </CardContent>
            </Card>

            {/* Detail tabs */}
            <Tabs defaultValue="vms" className="w-full">
              <TabsList>
                <TabsTrigger value="vms">{t('admin.oracleCosts.tabs.byVm')} ({report.rows.length})</TabsTrigger>
                <TabsTrigger value="users">{t('admin.oracleCosts.tabs.byUser')} ({report.byUser.length})</TabsTrigger>
                <TabsTrigger value="packages">{t('admin.oracleCosts.tabs.byPackage')} ({report.byPackage.length})</TabsTrigger>
                <TabsTrigger value="assumptions">{t('admin.oracleCosts.tabs.assumptions')}</TabsTrigger>
              </TabsList>

              {/* Per VM */}
              <TabsContent value="vms">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <CardTitle>{t('admin.oracleCosts.tabs.byVm')}</CardTitle>
                      <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder={t('admin.oracleCosts.table.search')}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('admin.oracleCosts.table.customer')}</TableHead>
                            <TableHead>{t('admin.oracleCosts.table.vm')}</TableHead>
                            <TableHead>{t('admin.oracleCosts.table.package')}</TableHead>
                            <TableHead>{t('admin.oracleCosts.table.period')}</TableHead>
                            <TableHead>{t('admin.oracleCosts.table.spec')}</TableHead>
                            <TableHead className="text-right">{componentLabel('cpu')}</TableHead>
                            <TableHead className="text-right">{componentLabel('ram')}</TableHead>
                            <TableHead className="text-right">{componentLabel('storage')}</TableHead>
                            <TableHead className="text-right">{componentLabel('egress')}</TableHead>
                            <TableHead className="text-right">{componentLabel('windows')}</TableHead>
                            <TableHead className="text-right">{t('admin.oracleCosts.table.totalUsd')}</TableHead>
                            <TableHead className="text-right">{t('admin.oracleCosts.table.totalVnd')}</TableHead>
                            <TableHead className="text-right">{t('admin.oracleCosts.table.paid')}</TableHead>
                            <TableHead className="text-right">{t('admin.oracleCosts.table.margin')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRows.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                                {t('admin.oracleCosts.table.noData')}
                              </TableCell>
                            </TableRow>
                          )}
                          {filteredRows.map((r) => (
                            <TableRow key={r.vmId}>
                              <TableCell>
                                <div className="font-medium">{r.user.name || r.user.email || '—'}</div>
                                <div className="text-xs text-muted-foreground">{r.user.email}</div>
                                {r.user.company && <div className="text-xs text-muted-foreground">{r.user.company}</div>}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{r.instanceName}</div>
                                <div className="text-xs text-muted-foreground">{r.shape}</div>
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge variant="outline" className={`text-[10px] ${stateBadgeClass(r.lifecycleState)}`}>
                                    {r.lifecycleState || '—'}
                                  </Badge>
                                  {r.assumptions.length > 0 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-3.5 w-3.5 text-amber-500 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <ul className="list-disc pl-4 text-xs space-y-0.5">
                                          {r.assumptions.map((a) => (
                                            <li key={a}>{t(`admin.oracleCosts.assumptions.${a}`)}</li>
                                          ))}
                                        </ul>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{r.subscription.packageName || '—'}</div>
                                <div className="text-xs text-muted-foreground">
                                  {r.subscription.osType === 'windows' ? 'Windows' : 'Linux'}
                                  {r.subscription.status ? ` · ${r.subscription.status}` : ''}
                                </div>
                                {r.subscription.endDate && (
                                  <div className="text-xs text-muted-foreground">
                                    {t('admin.oracleCosts.table.until')} {formatDateOnly(r.subscription.endDate)}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {fmtHours(r.period.runningHours)} <span className="text-muted-foreground">/ {fmtHours(r.period.existHours)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {t('admin.oracleCosts.table.coverage', { pct: r.period.coveragePct })}
                                </div>
                                {r.terminatedAt && (
                                  <div className="text-xs text-gray-500">
                                    {t('admin.oracleCosts.table.terminated')} {formatDateOnly(r.terminatedAt)}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                <div>{r.spec.billedOcpus} OCPU{r.spec.baselineFraction !== 1 ? ` (${r.spec.ocpus} × ${r.spec.baselineFraction * 100}%)` : ''}</div>
                                <div>{r.spec.memoryGb} GB RAM</div>
                                <div>{r.spec.bootVolumeGb} GB SSD</div>
                              </TableCell>
                              <TableCell className="text-right">{r.cost.cpu ? fmtUsd(r.cost.cpu) : '—'}</TableCell>
                              <TableCell className="text-right">{r.cost.ram ? fmtUsd(r.cost.ram) : '—'}</TableCell>
                              <TableCell className="text-right">{r.cost.storage ? fmtUsd(r.cost.storage) : '—'}</TableCell>
                              <TableCell className="text-right">
                                <div>{r.cost.egress ? fmtUsd(r.cost.egress) : '—'}</div>
                                <div className="text-xs text-muted-foreground">{r.egress.gb.toLocaleString('en-US', { maximumFractionDigits: 2 })} GB</div>
                              </TableCell>
                              <TableCell className="text-right">{r.cost.windows ? fmtUsd(r.cost.windows) : '—'}</TableCell>
                              <TableCell className="text-right font-semibold">
                                <div>{fmtUsd(r.cost.netUsd)}</div>
                                {r.cost.other > 0 && <div className="text-xs text-muted-foreground">{componentLabel('other')}: {fmtUsd(r.cost.other)}</div>}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-red-600">{fmtVnd(r.cost.netVnd)}</TableCell>
                              <TableCell className="text-right text-green-600">
                                {r.revenue.paidInMonthVnd > 0 ? fmtVnd(r.revenue.paidInMonthVnd) : '—'}
                              </TableCell>
                              <TableCell className={`text-right font-semibold ${r.marginVnd >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {r.marginVnd >= 0 ? '+' : ''}{fmtVnd(r.marginVnd)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Per user */}
              <TabsContent value="users">
                <Card>
                  <CardHeader><CardTitle>{t('admin.oracleCosts.tabs.byUser')}</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('admin.oracleCosts.table.customer')}</TableHead>
                          <TableHead className="text-right">{t('admin.oracleCosts.table.vmCount')}</TableHead>
                          <TableHead className="text-right">{t('admin.oracleCosts.table.totalUsd')}</TableHead>
                          <TableHead className="text-right">{t('admin.oracleCosts.table.totalVnd')}</TableHead>
                          <TableHead className="text-right">{t('admin.oracleCosts.table.paid')}</TableHead>
                          <TableHead className="text-right">{t('admin.oracleCosts.table.margin')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.byUser.map((u) => (
                          <TableRow key={String(u.userId)}>
                            <TableCell>
                              <div className="font-medium">{u.name || u.email || '—'}</div>
                              <div className="text-xs text-muted-foreground">{u.email}{u.company ? ` · ${u.company}` : ''}</div>
                            </TableCell>
                            <TableCell className="text-right">{u.vmCount}</TableCell>
                            <TableCell className="text-right">{fmtUsd(u.netUsd)}</TableCell>
                            <TableCell className="text-right text-red-600 font-semibold">{fmtVnd(u.netVnd)}</TableCell>
                            <TableCell className="text-right text-green-600">{u.paidVnd > 0 ? fmtVnd(u.paidVnd) : '—'}</TableCell>
                            <TableCell className={`text-right font-semibold ${u.marginVnd >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {u.marginVnd >= 0 ? '+' : ''}{fmtVnd(u.marginVnd)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Per package */}
              <TabsContent value="packages">
                <Card>
                  <CardHeader><CardTitle>{t('admin.oracleCosts.tabs.byPackage')}</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('admin.oracleCosts.table.package')}</TableHead>
                          <TableHead className="text-right">{t('admin.oracleCosts.table.vmCount')}</TableHead>
                          <TableHead className="text-right">{t('admin.oracleCosts.table.totalUsd')}</TableHead>
                          <TableHead className="text-right">{t('admin.oracleCosts.table.totalVnd')}</TableHead>
                          <TableHead className="text-right">{t('admin.oracleCosts.table.paid')}</TableHead>
                          <TableHead className="text-right">{t('admin.oracleCosts.table.margin')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.byPackage.map((p) => (
                          <TableRow key={String(p.packageId)}>
                            <TableCell className="font-medium">{p.packageName || '—'}</TableCell>
                            <TableCell className="text-right">{p.vmCount}</TableCell>
                            <TableCell className="text-right">{fmtUsd(p.netUsd)}</TableCell>
                            <TableCell className="text-right text-red-600 font-semibold">{fmtVnd(p.netVnd)}</TableCell>
                            <TableCell className="text-right text-green-600">{p.paidVnd > 0 ? fmtVnd(p.paidVnd) : '—'}</TableCell>
                            <TableCell className={`text-right font-semibold ${p.marginVnd >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {p.marginVnd >= 0 ? '+' : ''}{fmtVnd(p.marginVnd)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Assumptions & rate card */}
              <TabsContent value="assumptions">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle>{t('admin.oracleCosts.rates.title')}</CardTitle></CardHeader>
                    <CardContent>
                      <Table>
                        <TableBody>
                          {Object.entries(report.rates.ocpuHourUsd).map(([fam, v]) => (
                            <TableRow key={`ocpu-${fam}`}>
                              <TableCell>{t('admin.oracleCosts.rates.ocpuHour', { family: fam })}</TableCell>
                              <TableCell className="text-right">{fmtUsd(v, 4)}</TableCell>
                            </TableRow>
                          ))}
                          {Object.entries(report.rates.memoryGbHourUsd).map(([fam, v]) => (
                            <TableRow key={`mem-${fam}`}>
                              <TableCell>{t('admin.oracleCosts.rates.memGbHour', { family: fam })}</TableCell>
                              <TableCell className="text-right">{fmtUsd(v, 4)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell>{t('admin.oracleCosts.rates.blockGbMonth')}</TableCell>
                            <TableCell className="text-right">{fmtUsd(report.rates.blockGbMonthUsd, 4)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>{t('admin.oracleCosts.rates.blockVpu', { vpus: report.rates.defaultVpusPerGb })}</TableCell>
                            <TableCell className="text-right">{fmtUsd(report.rates.blockVpuGbMonthUsd, 4)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>{t('admin.oracleCosts.rates.egressGb')}</TableCell>
                            <TableCell className="text-right">{fmtUsd(report.rates.egressGbUsd, 4)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>{t('admin.oracleCosts.rates.egressFree')}</TableCell>
                            <TableCell className="text-right">{report.rates.egressFreeGbPerMonth.toLocaleString('en-US')} GB</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>{t('admin.oracleCosts.rates.windowsLicense')}</TableCell>
                            <TableCell className="text-right">{fmtUsd(report.rates.windowsLicenseOcpuHourUsd, 4)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>{t('admin.oracleCosts.rates.discounts')}</TableCell>
                            <TableCell className="text-right text-xs">
                              {COMPONENT_KEYS.map((k) => `${componentLabel(k)} ${report.rates.discountPct[k]}%`).join(' · ')}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>{t('admin.oracleCosts.rates.fx')}</TableCell>
                            <TableCell className="text-right">
                              {report.rates.usdToVnd.toLocaleString('en-US')} ₫/USD
                              <div className="text-xs text-muted-foreground">
                                {t(`admin.oracleCosts.fxSource.${report.rates.fxSource}`)}{report.rates.fxDate ? ` · ${report.rates.fxDate}` : ''}
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <p className="text-xs text-muted-foreground mt-3">{t('admin.oracleCosts.rates.envNote')}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>{t('admin.oracleCosts.method.title')}</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="list-disc pl-5 space-y-2 text-sm">
                        {['compute', 'storage', 'egress', 'windows', 'revenue', 'partial', 'excluded'].map((k) => (
                          <li key={k}>{t(`admin.oracleCosts.method.${k}`)}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
