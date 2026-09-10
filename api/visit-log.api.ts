import { fetchJsonWithAuth } from '@/lib/fetch-wrapper'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

export type VisitRange = 'today' | '7d' | '28d' | '90d' | 'all'

export interface NameValue {
  name: string
  value: number
}

export interface VisitorSummaryRow {
  visitorId: string
  visits: number
  ipCount: number
  lastIp: string | null
  firstSeen: string
  lastSeen: string
  lastPath: string | null
  device: string | null
}

export interface VisitRow {
  id: string
  createdAt: string
  ip: string | null
  visitorId: string
  sessionId: string
  isNewVisitor: boolean
  path: string
  title: string | null
  referrer: string | null
  device: string | null
  browser: string | null
  os: string | null
  screen: string | null
  lang: string | null
}

export interface VisitStats {
  range: VisitRange
  from: string
  to: string
  summary: {
    visits: number
    visitors: number
    ips: number
    sessions: number
    newVisitors: number
    returningVisits: number
    botVisits: number
  }
  daily: { date: string; visits: number; visitors: number }[]
  topPaths: NameValue[]
  topReferrers: NameValue[]
  devices: NameValue[]
  browsers: NameValue[]
  operatingSystems: NameValue[]
  topVisitors: VisitorSummaryRow[]
  recent: VisitRow[]
  recentTotal: number
  page: number
  pageSize: number
  updatedAt: string
}

export interface VisitStatsQuery {
  range: VisitRange
  page?: number
  q?: string
  /** YYYY-MM-DD theo giờ Việt Nam; có thì đè lên preset `range`. */
  from?: string
  to?: string
}

export const visitLogApi = {
  getStats: async (query: VisitStatsQuery): Promise<VisitStats> => {
    const params = new URLSearchParams({ range: query.range })
    if (query.page && query.page > 1) params.set('page', String(query.page))
    if (query.q?.trim()) params.set('q', query.q.trim())
    if (query.from) params.set('from', query.from)
    if (query.to) params.set('to', query.to)

    return fetchJsonWithAuth<VisitStats>(`${API_BASE_URL}/visits/stats?${params}`, {
      method: 'GET',
    })
  },
}
