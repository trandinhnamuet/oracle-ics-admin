import { fetchWithAuth, fetchJsonWithAuth } from '@/lib/fetch-wrapper'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

export interface VmDetails {
  subscription: {
    id: string
    status: string
    packageName?: string
    startDate?: string
    endDate?: string
  }
  vm: {
    id: string
    subscriptionId: string
    instanceName: string
    instanceId: string
    compartmentId?: string
    shape: string
    imageId?: string
    imageName?: string
    operatingSystem?: string
    operatingSystemVersion?: string
    region?: string
    availabilityDomain: string
    lifecycleState: string
    publicIp?: string
    privateIp?: string
    vcnId?: string
    subnetId?: string
    sshPublicKey?: string
    windowsInitialPassword?: string
    createdAt: string
    startedAt?: string
    updatedAt: string
  } | null
  isConfigured: boolean
}

export interface ConfigureVmDto {
  displayName?: string
  imageId: string
  shape: string
  ocpus?: number
  memoryInGBs?: number
  bootVolumeSizeInGBs?: number
  notificationEmail?: string
  description?: string
}

export interface VmActionDto {
  action: 'START' | 'STOP' | 'RESTART' | 'TERMINATE'
}

export interface ConfigureVmResponse {
  success: boolean
  message: string
  vm?: {
    instanceName: string
    instanceId: string
    operatingSystem?: string
    publicIp?: string
    lifecycleState: string
    windowsInitialPassword?: string
  }
  sshKey?: {
    publicKey: string
    privateKey: string
    fingerprint: string
  }
  subscription?: {
    id: string
    status: string
  }
  data?: {
    vmInstanceId: string
    instanceOcid: string
    displayName: string
    shape: string
    lifecycleState: string
    publicIp?: string
  }
}

/**
 * Get VM details for a subscription
 */
export const getSubscriptionVm = async (subscriptionId: string): Promise<VmDetails> => {
  const result = await fetchJsonWithAuth<VmDetails>(
    `${API_BASE_URL}/vm-subscription/${subscriptionId}`,
    {
      method: 'GET'
    }
  )
  return result
}

/**
 * Configure VM for a subscription
 */
export const configureSubscriptionVm = async (
  subscriptionId: string,
  data: ConfigureVmDto
): Promise<ConfigureVmResponse> => {
  const result = await fetchJsonWithAuth<ConfigureVmResponse>(
    `${API_BASE_URL}/vm-subscription/${subscriptionId}/configure`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  )
  return result
}

/**
 * Perform VM action (start, stop, restart, terminate)
 */
export const performVmAction = async (
  subscriptionId: string,
  action: VmActionDto['action']
): Promise<{ success: boolean; message: string }> => {
  const result = await fetchJsonWithAuth<{ success: boolean; message: string }>(
    `${API_BASE_URL}/vm-subscription/${subscriptionId}/action`,
    {
      method: 'POST',
      body: JSON.stringify({ action })
    }
  )
  return result
}

/**
 * Reset Windows VM password via SSH
 * @param newPassword Optional. If provided, sets the VM password to this value.
 *                    If omitted, the server auto-generates a random password.
 */
export const resetWindowsPassword = async (
  subscriptionId: string,
  newPassword?: string,
): Promise<{ success: boolean; username: string; newPassword: string; message: string }> => {
  return fetchJsonWithAuth(
    `${API_BASE_URL}/vm-subscription/${subscriptionId}/reset-windows-password`,
    {
      method: 'POST',
      ...(newPassword ? { body: JSON.stringify({ newPassword }) } : {}),
    }
  )
}

/**
 * Request new SSH key for VM
 */
export const requestNewSshKey = async (
  subscriptionId: string,
  email: string
): Promise<{ 
  success: boolean
  message: string
  sshKey?: {
    publicKey: string
    privateKey: string
    fingerprint: string
  }
  keysInfo?: {
    totalKeys: number
    removedOldest: boolean
  }
}> => {
  const result = await fetchJsonWithAuth<{ 
    success: boolean
    message: string
    sshKey?: {
      publicKey: string
      privateKey: string
      fingerprint: string
    }
    keysInfo?: {
      totalKeys: number
      removedOldest: boolean
    }
  }>(
    `${API_BASE_URL}/vm-subscription/${subscriptionId}/request-key`,
    {
      method: 'POST',
      body: JSON.stringify({ email })
    }
  )
  return result
}

/**
 * Start VM
 */
export const startVm = async (
  subscriptionId: string
): Promise<{ success: boolean; message: string }> => {
  return performVmAction(subscriptionId, 'START')
}

/**
 * Stop VM
 */
export const stopVm = async (
  subscriptionId: string
): Promise<{ success: boolean; message: string }> => {
  return performVmAction(subscriptionId, 'STOP')
}

/**
 * Delete VM only (keep subscription active)
 */
export const deleteVmOnly = async (
  subscriptionId: string
): Promise<{ success: boolean; message: string }> => {
  const result = await fetchJsonWithAuth<{ success: boolean; message: string }>(
    `${API_BASE_URL}/vm-subscription/${subscriptionId}/vm-only`,
    {
      method: 'DELETE'
    }
  )
  return result
}

