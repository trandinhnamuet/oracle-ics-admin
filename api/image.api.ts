import { fetchWithAuth, fetchJsonWithAuth } from '@/lib/fetch-wrapper';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

export interface Image {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  url: string
  uploadedBy?: number
  createdAt: string
  updatedAt: string
}

export const imageApi = {
  async uploadImage(file: File): Promise<Image> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetchJsonWithAuth<Image>(`${API_URL}/images/upload`, {
      method: 'POST',
      body: formData,
    })
    
    return response
  },

  async getImage(id: string): Promise<Image> {
    const response = await fetchJsonWithAuth<Image>(`${API_URL}/images/${id}`)
    return response
  },

  async getUserImages(userId: number): Promise<Image[]> {
    const response = await fetchJsonWithAuth<Image[]>(`${API_URL}/images/user/${userId}`)
    return response
  },

  async deleteImage(id: string): Promise<{ message: string }> {
    const response = await fetchJsonWithAuth<{ message: string }>(`${API_URL}/images/${id}`, {
      method: 'DELETE',
    })
    return response
  },

  getImageUrl(url: string): string {
    if (!url) return ''
    if (url.startsWith('http')) return url
    // For old /uploads/ paths, rewrite to the serve endpoint
    if (url.startsWith('/uploads/')) {
      const filename = url.replace('/uploads/', '')
      return `${API_URL}/images/serve/${filename}`
    }
    return `${API_URL}${url}`
  },
}