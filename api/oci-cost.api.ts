import { fetchJsonWithAuth } from '@/lib/fetch-wrapper'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export type CostComponentKey = 'cpu' | 'ram' | 'storage' | 'egress' | 'windows' | 'other'

export interface ComponentAmount {
  listUsd: number
  discountPct: number
  netUsd: number
  netVnd: number
}

export interface OciRateCard {
  ocpuHourUsd: Record<string, number>
  memoryGbHourUsd: Record<string, number>
  blockGbMonthUsd: number
  blockVpuGbMonthUsd: number
  defaultVpusPerGb: number
  egressGbUsd: number
  egressFreeGbPerMonth: number
  windowsLicenseOcpuHourUsd: number
  discountPct: Record<CostComponentKey, number>
  usdToVnd: number
  fxSource: 'query' | 'exchange_rate_table' | 'env' | 'default'
  fxDate?: string
}

export interface VmCostRow {
  vmId: number
  instanceId: string
  instanceName: string
  shape: string | null
  shapeFamily: string
  lifecycleState: string | null
  compartmentId: string
  createdAt: string
  terminatedAt: string | null
  user: { id: number | null; email: string | null; name: string | null; company: string | null }
  subscription: {
    id: string | null
    status: string | null
    osType: 'linux' | 'windows'
    startDate: string | null
    endDate: string | null
    packageId: number | null
    packageName: string | null
    packageMonthlyVnd: number | null
  }
  period: {
    from: string
    to: string
    existHours: number
    runningHours: number
    stoppedHours: number
    coveragePct: number
    runningPct: number
  }
  spec: {
    ocpus: number
    billedOcpus: number
    baseline: string | null
    baselineFraction: number
    memoryGb: number
    bootVolumeGb: number
    vpusPerGb: number
    source: 'oci' | 'launch' | 'package'
  }
  egress: { gb: number; dataSource: string }
  cost: Record<CostComponentKey, number> & { listUsd: number; netUsd: number; netVnd: number }
  revenue: { paidInMonthVnd: number }
  marginVnd: number
  assumptions: string[]
}

export interface OciCostMonthlyReport {
  month: string
  generatedAt: string
  window: {
    start: string
    end: string
    hoursInMonth: number
    hoursElapsed: number
    isCurrentMonth: boolean
  }
  rates: OciRateCard
  summary: {
    vmCount: number
    runningVmCount: number
    terminatedInMonthCount: number
    windowsVmCount: number
    components: Record<CostComponentKey | 'total', ComponentAmount>
    egress: { totalGb: number; attributedGb: number; unattributedGb: number; freeGb: number; billableGb: number }
    revenue: { attributedVnd: number; totalCollectedVnd: number; unattributedVnd: number }
    marginVnd: number
    marginPct: number | null
  }
  rows: VmCostRow[]
  byUser: Array<{
    userId: number | null
    email: string | null
    name: string | null
    company: string | null
    vmCount: number
    netUsd: number
    netVnd: number
    paidVnd: number
    marginVnd: number
  }>
  byPackage: Array<{
    packageId: number | null
    packageName: string | null
    vmCount: number
    netUsd: number
    netVnd: number
    paidVnd: number
    marginVnd: number
  }>
  warnings: string[]
}

/**
 * Estimated Oracle bill for a calendar month, per VM and per component, against
 * what customers paid in that month (Admin only).
 * @param month "YYYY-MM"; defaults to the current month on the server.
 * @param opts.sync false = skip the OCI shape refresh (faster, cached values).
 */
export async function getOciCostMonthly(
  month?: string,
  opts: { sync?: boolean; usdToVnd?: number } = {},
): Promise<{ success: boolean; data: OciCostMonthlyReport }> {
  const params = new URLSearchParams()
  if (month) params.set('month', month)
  if (opts.sync === false) params.set('sync', 'false')
  if (opts.usdToVnd && opts.usdToVnd > 0) params.set('usdToVnd', String(opts.usdToVnd))
  const qs = params.toString()
  return fetchJsonWithAuth<{ success: boolean; data: OciCostMonthlyReport }>(
    `${API_URL}/oci-cost/monthly${qs ? `?${qs}` : ''}`,
  )
}
