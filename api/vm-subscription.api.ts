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
    /** The password itself is never returned by the detail API — it is handed to
     *  the owner once via revealInitialWindowsPassword(). These only say whether
     *  provisioning has produced one yet and whether it was already retrieved. */
    windowsPasswordReady?: boolean
    windowsInitialPasswordRevealed?: boolean
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
    /** The password itself is never returned by the detail API — it is handed to
     *  the owner once via revealInitialWindowsPassword(). These only say whether
     *  provisioning has produced one yet and whether it was already retrieved. */
    windowsPasswordReady?: boolean
    windowsInitialPasswordRevealed?: boolean
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

/*
 * resetWindowsPassword() and requestNewSshKey() used to live here. Both endpoints
 * are owner-only in the backend — the service scopes the subscription by user_id
 * and the mandatory OTP is mailed to the VM owner — so an administrator can never
 * complete them, and the versions here also omitted the required otpCode and so
 * always answered 400 (QA 2026-09-10). Removed rather than left as a trap for the
 * next person to wire a button to. Customers use the equivalents in
 * oracle-ics-frontend/api/vm-subscription.api.ts, which carry the OTP flow.
 */

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

