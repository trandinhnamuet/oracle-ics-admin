import { fetchJsonWithAuth } from '@/lib/fetch-wrapper'

const API_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Get bandwidth usage for all VMs for a specific calendar month (Admin only).
 * @param month - "YYYY-MM" format, e.g. "2026-03". Defaults to current month on the server.
 */
export async function getAllVmsBandwidth(month?: string) {
  const params = month ? `?month=${encodeURIComponent(month)}` : ''
  const response = await fetchJsonWithAuth<any>(
    `${API_URL}/bandwidth/all-vms${params}`,
  )
  return response
}
