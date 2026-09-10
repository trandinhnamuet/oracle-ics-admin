'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  RefreshCw, Search, Eye, Users, Globe, Layers, UserPlus, Repeat,
  ChevronLeft, ChevronRight, ArrowRight, BarChart3,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { visitLogApi, type VisitRange, type VisitStats, type NameValue } from '@/api/visit-log.api'
import { formatDateTime } from '@/lib/utils'

const RANGES: VisitRange[] = ['today', '7d', '28d', '90d', 'all']

/** visitor_id là UUID 36 ký tự — bảng không đọc nổi, lấy 8 ký tự đầu là đủ phân biệt. */
const shortId = (id: string) => id.slice(0, 8)

/** Ngày trong `daily` là nhãn lịch giờ VN, KHÔNG được đổi múi giờ lại lần nữa. */
const dayLabel = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`

/** Referrer chỉ cần biết đến từ đâu, không cần cả query string. */
function refHost(ref: string | null) {
  if (!ref) return null
  try {
    const url = new URL(ref)
    return url.hostname + (url.pathname !== '/' ? url.pathname : '')
  } catch {
    return ref
  }
}

/* ------------------------------------------------------------------ */

function Kpi({ label, value, hint, icon: Icon, tone }: {
  label: string
  value: string
  hint: string
  icon: typeof Eye
  tone: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-gray-500 dark:text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${tone}`}>{value}</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-muted-foreground">{hint}</p>
          </div>
          <Icon className={`h-7 w-7 shrink-0 ${tone} opacity-60`} />
        </div>
      </CardContent>
    </Card>
  )
}

function BarList({ rows, unit, empty }: { rows: { label: string; value: number }[]; unit: string; empty: string }) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0)
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500 dark:text-muted-foreground">{empty}</p>
  }
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={`${row.label}-${i}`} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate" title={row.label}>{row.label}</span>
            <span className="shrink-0 tabular-nums text-gray-500 dark:text-muted-foreground">
              {row.value.toLocaleString()} {unit}
            </span>
          </div>
          {/* Thanh nền dựng bằng div thay vì <Progress>: ở đây cần so tương đối
              giữa các dòng (chia cho giá trị lớn nhất), không phải phần trăm. */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: max > 0 ? `${Math.max(2, (row.value / max) * 100)}%` : '0%' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export default function VisitorsPage() {
  const { t, i18n } = useTranslation()
  const [range, setRange] = useState<VisitRange>('7d')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [data, setData] = useState<VisitStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const nf = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language])

  const load = useCallback(async (
    key: VisitRange, pageNo: number, q: string, from: string, to: string,
  ) => {
    setLoading(true)
    setError('')
    try {
      const result = await visitLogApi.getStats({
        range: key,
        page: pageNo,
        q,
        // Chỉ gửi khoảng tuỳ chọn khi đủ cả hai đầu; thiếu một đầu thì preset
        // vẫn là thứ đang hiển thị, gửi nửa vời sẽ ra kết quả khó hiểu.
        from: from && to ? from : undefined,
        to: from && to ? to : undefined,
      })
      setData(result)
    } catch (err: any) {
      console.error('Error fetching visit stats:', err)
      setError(err?.message || t('admin.visitors.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load('7d', 1, '', '', '') }, [load])

  // Gõ tới đâu tìm tới đó, nhưng đợi 400ms cho người dùng gõ xong đã.
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current) }, [])

  const onSearch = (value: string) => {
    setSearch(value)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      setPage(1)
      load(range, 1, value, dateFrom, dateTo)
    }, 400)
  }

  const pickRange = (key: VisitRange) => {
    setRange(key)
    setPage(1)
    setDateFrom('')
    setDateTo('')
    load(key, 1, search, '', '')
  }

  const applyCustomRange = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
    setPage(1)
    if (from && to) load(range, 1, search, from, to)
  }

  const goPage = (next: number) => {
    setPage(next)
    load(range, next, search, dateFrom, dateTo)
  }

  const refresh = () => load(range, page, search, dateFrom, dateTo)

  const totalPages = data ? Math.max(1, Math.ceil(data.recentTotal / data.pageSize)) : 1
  const usingCustom = !!(dateFrom && dateTo)

  /** device/os/browser trả về khoá ổn định; 'other' và các loại thiết bị thì dịch. */
  const labelFor = (name: string) => {
    if (name === 'other') return t('admin.visitors.other')
    if (name === 'desktop' || name === 'mobile' || name === 'tablet') {
      return t(`admin.visitors.device.${name}`)
    }
    return name
  }

  const SERIES = [
    { key: 'visits', label: t('admin.visitors.series.visits'), color: '#3b82f6' },
    { key: 'visitors', label: t('admin.visitors.series.visitors'), color: '#10b981' },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.visitors.title')}</h1>
          <p className="mt-1 text-gray-500 dark:text-muted-foreground">
            {t('admin.visitors.subtitle')}
            {data && ` · ${t('admin.visitors.updatedAt', { time: formatDateTime(data.updatedAt, i18n.language) })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              {t('admin.visitors.legacyLink')}
            </Link>
          </Button>
          <Button onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('admin.visitors.refresh')}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-300 dark:border-red-900">
          <CardContent className="pt-6 text-sm text-red-600 dark:text-red-400">
            <strong>{t('admin.visitors.errorTitle')}</strong> {error}
          </CardContent>
        </Card>
      )}

      {/* Bộ lọc thời gian */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('admin.visitors.range.label')}</label>
            <div className="flex flex-wrap gap-2">
              {RANGES.map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={!usingCustom && key === range ? 'default' : 'outline'}
                  onClick={() => pickRange(key)}
                  disabled={loading}
                >
                  {t(`admin.visitors.range.${key}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('admin.visitors.range.custom')}</label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                aria-label={t('admin.visitors.range.from')}
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => applyCustomRange(e.target.value, dateTo)}
                className="w-40 text-sm"
              />
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                type="date"
                aria-label={t('admin.visitors.range.to')}
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => applyCustomRange(dateFrom, e.target.value)}
                className="w-40 text-sm"
              />
            </div>
          </div>

          {data && (
            <p className="ml-auto text-sm text-muted-foreground">
              {t('admin.visitors.window', { from: data.from, to: data.to })}
              {data.summary.botVisits > 0 &&
                ` · ${t('admin.visitors.botsFiltered', { count: data.summary.botVisits })}`}
            </p>
          )}
        </CardContent>
      </Card>

      {!data && loading && (
        <div className="py-16 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400 dark:text-muted-foreground" />
          <p className="mt-2 text-gray-500 dark:text-muted-foreground">{t('admin.visitors.loading')}</p>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Kpi label={t('admin.visitors.kpi.visits')} value={nf.format(data.summary.visits)} hint={t('admin.visitors.kpi.visitsHint')} icon={Eye} tone="text-blue-500" />
            <Kpi label={t('admin.visitors.kpi.visitors')} value={nf.format(data.summary.visitors)} hint={t('admin.visitors.kpi.visitorsHint')} icon={Users} tone="text-emerald-500" />
            <Kpi label={t('admin.visitors.kpi.ips')} value={nf.format(data.summary.ips)} hint={t('admin.visitors.kpi.ipsHint')} icon={Globe} tone="text-violet-500" />
            <Kpi label={t('admin.visitors.kpi.sessions')} value={nf.format(data.summary.sessions)} hint={t('admin.visitors.kpi.sessionsHint')} icon={Layers} tone="text-amber-500" />
            <Kpi label={t('admin.visitors.kpi.newVisitors')} value={nf.format(data.summary.newVisitors)} hint={t('admin.visitors.kpi.newVisitorsHint')} icon={UserPlus} tone="text-cyan-500" />
            <Kpi label={t('admin.visitors.kpi.returning')} value={nf.format(data.summary.returningVisits)} hint={t('admin.visitors.kpi.returningHint')} icon={Repeat} tone="text-pink-500" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('admin.visitors.chart.title')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {data.daily.length < 2 ? t('admin.visitors.chart.needMoreDays') : t('admin.visitors.chart.hint')}
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.daily} margin={{ top: 6, right: 12, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="date" tickFormatter={dayLabel} tickLine={false} minTickGap={24} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={56} fontSize={12} />
                    <Tooltip
                      labelFormatter={(label) => dayLabel(String(label))}
                      formatter={(value: any, key: any) => [
                        nf.format(Number(value)),
                        SERIES.find((s) => s.key === key)?.label ?? key,
                      ]}
                    />
                    {SERIES.map((s) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.label}
                        stroke={s.color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('admin.visitors.cards.topPaths')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('admin.visitors.cards.topPathsHint')}</p>
              </CardHeader>
              <CardContent>
                <BarList
                  rows={data.topPaths.map((p) => ({ label: p.name, value: p.value }))}
                  unit={t('admin.visitors.unit')}
                  empty={t('admin.visitors.empty')}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('admin.visitors.cards.referrers')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('admin.visitors.cards.referrersHint')}</p>
              </CardHeader>
              <CardContent>
                <BarList
                  rows={data.topReferrers.map((r) => ({
                    label: refHost(r.name) || t('admin.visitors.direct'),
                    value: r.value,
                  }))}
                  unit={t('admin.visitors.unit')}
                  empty={t('admin.visitors.empty')}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {([
              ['devices', data.devices],
              ['browsers', data.browsers],
              ['os', data.operatingSystems],
            ] as [string, NameValue[]][]).map(([key, rows]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-lg">{t(`admin.visitors.cards.${key}`)}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t('admin.visitors.cards.fromUserAgent')}</p>
                </CardHeader>
                <CardContent>
                  <BarList
                    rows={rows.map((r) => ({ label: labelFor(r.name), value: r.value }))}
                    unit={t('admin.visitors.unit')}
                    empty={t('admin.visitors.empty')}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('admin.visitors.topVisitors.title')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('admin.visitors.topVisitors.hint')}</p>
            </CardHeader>
            <CardContent>
              {data.topVisitors.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t('admin.visitors.empty')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.visitors.topVisitors.visitorId')}</TableHead>
                        <TableHead>{t('admin.visitors.topVisitors.visits')}</TableHead>
                        <TableHead>{t('admin.visitors.topVisitors.lastIp')}</TableHead>
                        <TableHead>{t('admin.visitors.topVisitors.device')}</TableHead>
                        <TableHead>{t('admin.visitors.topVisitors.firstSeen')}</TableHead>
                        <TableHead>{t('admin.visitors.topVisitors.lastSeen')}</TableHead>
                        <TableHead>{t('admin.visitors.topVisitors.lastPath')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topVisitors.map((v) => (
                        <TableRow key={v.visitorId}>
                          <TableCell className="font-mono text-sm" title={v.visitorId}>{shortId(v.visitorId)}</TableCell>
                          <TableCell className="font-semibold tabular-nums">{nf.format(v.visits)}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {v.lastIp || '—'}
                            {v.ipCount > 1 && (
                              <div className="text-xs text-muted-foreground">
                                {t('admin.visitors.topVisitors.ipCount', { count: v.ipCount })}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{v.device ? labelFor(v.device) : '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDateTime(v.firstSeen, i18n.language)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDateTime(v.lastSeen, i18n.language)}</TableCell>
                          <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={v.lastPath || ''}>{v.lastPath || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{t('admin.visitors.log.title')}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.visitors.log.hint', { total: nf.format(data.recentTotal) })}
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => onSearch(e.target.value)}
                    placeholder={t('admin.visitors.log.searchPlaceholder')}
                    className="w-80 pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data.recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t('admin.visitors.log.empty')}</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('admin.visitors.log.time')}</TableHead>
                          <TableHead>{t('admin.visitors.log.ip')}</TableHead>
                          <TableHead>{t('admin.visitors.log.visitor')}</TableHead>
                          <TableHead>{t('admin.visitors.log.page')}</TableHead>
                          <TableHead>{t('admin.visitors.log.device')}</TableHead>
                          <TableHead>{t('admin.visitors.log.source')}</TableHead>
                          <TableHead>{t('admin.visitors.log.screen')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.recent.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {formatDateTime(v.createdAt, i18n.language)}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{v.ip || '—'}</TableCell>
                            <TableCell className="text-sm">
                              <span className="font-mono" title={v.visitorId}>{shortId(v.visitorId)}</span>
                              <Badge
                                variant={v.isNewVisitor ? 'default' : 'secondary'}
                                className="ml-2 text-[10px]"
                              >
                                {v.isNewVisitor ? t('admin.visitors.tag.new') : t('admin.visitors.tag.returning')}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate" title={v.path}>{v.path}</div>
                              {v.title && (
                                <div className="truncate text-xs text-muted-foreground" title={v.title}>{v.title}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              <div>{v.device ? labelFor(v.device) : '—'}</div>
                              <div className="text-xs">
                                {labelFor(v.browser || 'other')} · {labelFor(v.os || 'other')}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[14rem] truncate text-sm text-muted-foreground" title={v.referrer || ''}>
                              {refHost(v.referrer) || t('admin.visitors.direct')}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">{v.screen || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <span className="text-sm text-muted-foreground">
                        {t('admin.visitors.pagination.info', {
                          current: page, total: totalPages, records: nf.format(data.recentTotal),
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => goPage(page - 1)} disabled={page <= 1 || loading}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => goPage(page + 1)} disabled={page >= totalPages || loading}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
