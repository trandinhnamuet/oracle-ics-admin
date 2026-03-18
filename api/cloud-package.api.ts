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
export async function getAllCloudPackages(token: string): Promise<CloudPackage[]> {
  const res = await fetch(`${API_URL}/cloud-packages`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch cloud packages')
  return res.json()
}

export async function createCloudPackage(token: string, data: Partial<CloudPackage>): Promise<CloudPackage> {
  const res = await fetch(`${API_URL}/cloud-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create cloud package')
  return res.json()
}

export async function updateCloudPackage(token: string, id: number, data: Partial<CloudPackage>): Promise<CloudPackage> {
  const res = await fetch(`${API_URL}/cloud-packages/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to update cloud package')
  return res.json()
}

export async function deleteCloudPackage(token: string, id: number): Promise<void> {
  const res = await fetch(`${API_URL}/cloud-packages/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to delete cloud package')
}

export async function deactivateCloudPackage(token: string, id: number): Promise<CloudPackage> {
  const res = await fetch(`${API_URL}/cloud-packages/${id}/deactivate`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to deactivate cloud package')
  return res.json()
}

/**
 * Build a features string array from a CloudPackage record.
 */
export function buildFeatures(pkg: CloudPackage): string[] {
  return [pkg.cpu, pkg.ram, pkg.memory, pkg.bandwidth, pkg.feature].filter(Boolean) as string[]
}
