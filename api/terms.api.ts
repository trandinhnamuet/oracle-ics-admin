import { fetchJsonWithAuth, fetchWithAuth } from '@/lib/fetch-wrapper'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:3003'

export interface TermsArticle {
  number: string
  heading: string
  paragraphs: string[]
}

export interface PublicTermsSection {
  id: number
  title: string
  orderIndex: number
  articles: TermsArticle[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminTermsSection {
  id: number
  titleVi: string
  titleEn: string
  orderIndex: number
  articlesVi: TermsArticle[]
  articlesEn: TermsArticle[]
  isActive: boolean
  updatedBy?: number
  createdAt: string
  updatedAt: string
}

export interface UpsertTermsSectionPayload {
  titleVi: string
  titleEn: string
  orderIndex: number
  articlesVi: TermsArticle[]
  articlesEn: TermsArticle[]
  isActive?: boolean
}

function getApiBase(): string {
  return API_URL.replace(/\/$/, '')
}

export async function getPublicTermsSections(language: string): Promise<PublicTermsSection[]> {
  const res = await fetch(`${getApiBase()}/terms/public`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': language,
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Failed to load terms')
  }

  return res.json()
}

export async function getAdminTermsSections(): Promise<AdminTermsSection[]> {
  return fetchJsonWithAuth<AdminTermsSection[]>(`${getApiBase()}/terms/admin`, { method: 'GET' })
}

export async function createTermsSection(
  payload: UpsertTermsSectionPayload,
): Promise<AdminTermsSection> {
  return fetchJsonWithAuth<AdminTermsSection>(`${getApiBase()}/terms/admin`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateTermsSection(
  id: number,
  payload: Partial<UpsertTermsSectionPayload>,
): Promise<AdminTermsSection> {
  return fetchJsonWithAuth<AdminTermsSection>(`${getApiBase()}/terms/admin/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteTermsSection(id: number): Promise<void> {
  const res = await fetchWithAuth(`${getApiBase()}/terms/admin/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Failed to delete terms section')
  }
}
