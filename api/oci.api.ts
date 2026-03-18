import { fetchJsonWithAuth } from '@/lib/fetch-wrapper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export interface ComputeImage {
  id: string;
  displayName: string;
  operatingSystem: string;
  operatingSystemVersion: string;
  createImageAllowed: boolean;
  lifecycleState: string;
  sizeInMBs: number;
  timeCreated: Date;
  compartmentId: string;
  architecture?: string; // 'AARCH64' (ARM) or 'X86_64' (x86)
}

export interface MarketplaceImage {
  listingId: string;
  displayName: string;
  summary: string;
  publisherName: string;
}

export interface Shape {
  shape: string;
  processorDescription: string;
  ocpus: number;
  memoryInGBs: number;
  networkingBandwidthInGbps: number;
  maxVnicAttachments: number;
  gpus?: number;
  localDisks?: number;
  localDisksTotalSizeInGBs?: number;
}

export interface Compartment {
  id: string;
  name: string;
  description: string;
  lifecycleState: string;
  timeCreated: Date;
}

/**
 * Get list of available compute images (Operating Systems)
 */
export const getComputeImages = async (
  compartmentId?: string,
  operatingSystem?: string,
  shape?: string
): Promise<ComputeImage[]> => {
  try {
    const params = new URLSearchParams();
    if (compartmentId) params.append('compartmentId', compartmentId);
    if (operatingSystem) params.append('operatingSystem', operatingSystem);
    if (shape) params.append('shape', shape);

    const response = await fetchJsonWithAuth<{ success: boolean; data: ComputeImage[] }>(
      `${API_URL}/oci/images?${params.toString()}`
    );

    return response.data || [];
  } catch (error: any) {
    console.error('Error fetching compute images:', error);

    // Log more detailed error information
    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Request error:', error.request);
    } else {
      console.error('Error:', error.message);
    }

    throw error;
  }
};

/**
 * Get list of marketplace images (Applications)
 */
export const getMarketplaceImages = async (
  compartmentId?: string
): Promise<MarketplaceImage[]> => {
  try {
    const params = new URLSearchParams();
    if (compartmentId) params.append('compartmentId', compartmentId);

    const response = await fetchJsonWithAuth<{ success: boolean; data: MarketplaceImage[] }>(
      `${API_URL}/oci/marketplace-images?${params.toString()}`
    );

    return response.data || [];
  } catch (error: any) {
    console.error('Error fetching marketplace images:', error);

    // Log more detailed error information
    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Request error:', error.request);
    } else {
      console.error('Error:', error.message);
    }

    throw error;
  }
};

/**
 * Get list of available shapes
 */
export const getShapes = async (compartmentId?: string): Promise<Shape[]> => {
  try {
    const params = new URLSearchParams();
    if (compartmentId) params.append('compartmentId', compartmentId);

    const response = await fetchJsonWithAuth<{ success: boolean; data: Shape[] }>(
      `${API_URL}/oci/shapes?${params.toString()}`
    );

    return response.data || [];
  } catch (error: any) {
    console.error('Error fetching shapes:', error);

    // Log more detailed error information
    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Request error:', error.request);
    } else {
      console.error('Error:', error.message);
    }

    throw error;
  }
};

/**
 * Get list of compartments
 */
export const getCompartments = async (): Promise<Compartment[]> => {
  try {
    const response = await fetchJsonWithAuth<{ success: boolean; data: Compartment[] }>(
      `${API_URL}/oci/compartments`
    );

    return response.data || [];
  } catch (error: any) {
    console.error('Error fetching compartments:', error);

    // Log more detailed error information
    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Request error:', error.request);
    } else {
      console.error('Error:', error.message);
    }

    throw error;
  }
};

/**
 * Delete a compartment and all resources inside it
 */
export const deleteCompartment = async (compartmentName: string): Promise<any> => {
  try {
    const response = await fetchJsonWithAuth(
      `${API_URL}/oci/compartment/${encodeURIComponent(compartmentName)}`,
      { method: 'DELETE' }
    );

    return response;
  } catch (error: any) {
    console.error('Error deleting compartment:', error);

    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('Request error:', error.request);
    } else {
      console.error('Error:', error.message);
    }

    throw error;
  }
};

export interface MetricsData {
  time: string
  value: number
}

export interface InstanceMetrics {
  cpu: MetricsData[]
  memory: MetricsData[]
  network: {
    in: MetricsData[]
    out: MetricsData[]
  }
  disk: {
    read: MetricsData[]
    write: MetricsData[]
  }
}

/**
 * Get instance metrics from OCI Monitoring
 */
export const getInstanceMetrics = async (
  instanceId: string,
  timeRange: '1h' | '6h' | '24h' | '7d' = '1h'
): Promise<InstanceMetrics> => {
  try {
    const params = new URLSearchParams({ timeRange });
    const response = await fetchJsonWithAuth<{ success: boolean; data: InstanceMetrics }>(
      `${API_URL}/oci/instance/${encodeURIComponent(instanceId)}/metrics?${params.toString()}`
    );

    return response.data;
  } catch (error: any) {
    console.error('Error fetching instance metrics:', error);
    throw error;
  }
};

