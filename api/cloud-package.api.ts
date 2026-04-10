import { fetchJsonWithAuth } from '@/lib/fetch-wrapper'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

export interface CloudPackage {
  id: number
  name: string
  type: string | null
  cost: number
  cost_vnd: number
  cpu: string | null
  ram: string | null
  memory: string | null
  feature: string | null
  bandwidth: string | null
  is_active: boolean
  updated_at: string
  updated_by: number | null
}

/**
 * Fetch all active cloud packages (public, no auth required)
 */
export async function getActiveCloudPackages(): Promise<CloudPackage[]> {
  const res = await fetch(`${API_URL}/cloud-packages/active`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch cloud packages')
  return res.json()
}

/**
 * Fetch all cloud packages (admin)
 */
export async function getAllCloudPackages(): Promise<CloudPackage[]> {
  return fetchJsonWithAuth<CloudPackage[]>('/cloud-packages', { cache: 'no-store' } as RequestInit)
}

export async function createCloudPackage(data: Partial<CloudPackage>): Promise<CloudPackage> {
  return fetchJsonWithAuth<CloudPackage>('/cloud-packages', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCloudPackage(id: number, data: Partial<CloudPackage>): Promise<CloudPackage> {
  return fetchJsonWithAuth<CloudPackage>(`/cloud-packages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function deleteCloudPackage(id: number): Promise<void> {
  return fetchJsonWithAuth<void>(`/cloud-packages/${id}`, {
    method: 'DELETE',
  })
}

export async function deactivateCloudPackage(id: number): Promise<CloudPackage> {
  return fetchJsonWithAuth<CloudPackage>(`/cloud-packages/${id}/deactivate`, {
    method: 'PATCH',
  })
}

/**
 * Build a features string array from a CloudPackage record.
 */
export function buildFeatures(pkg: CloudPackage): string[] {
  const base = [pkg.cpu, pkg.ram, pkg.memory, pkg.bandwidth].filter(Boolean) as string[]
  if (pkg.feature) {
    const lines = pkg.feature.split('\n').map(l => l.trim()).filter(Boolean)
    return [...base, ...lines]
  }
  return base
}
