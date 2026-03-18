import { fetchJsonWithAuth } from '@/lib/fetch-wrapper'

export interface AnalyticsDashboardStats {
  summary: {
    total_page_views: number
    unique_users: number
    bounce_rate: number
    avg_load_time: number
  }
  pages: Array<{
    page_path: string
    page_title: string
    view_count: number
  }>
  daily_views: Array<{
    date: string
    view_count: number
  }>
  events: Array<{
    event_type: string
    event_count: number
  }>
  date_range: {
    start: string
    end: string
  }
}

export interface PageAnalytics {
  page_path: string
  page_title: string
  view_count: number
}

export class AnalyticsApi {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AnalyticsDashboardStats> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate.toISOString())
    if (endDate) params.append('endDate', endDate.toISOString())

    try {
      const response = await fetchJsonWithAuth<{ success: boolean; data: AnalyticsDashboardStats }>(
        `/api/analytics/dashboard?${params.toString()}`
      )
      
      if (!response.data) {
        throw new Error('Invalid response format from analytics API')
      }
      
      return response.data
    } catch (error) {
      console.error('Error fetching analytics dashboard:', error)
      throw error
    }
  }

  /**
   * Get page views by path
   */
  static async getPageViewsByPath(
    startDate?: Date,
    endDate?: Date,
  ): Promise<PageAnalytics[]> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate.toISOString())
    if (endDate) params.append('endDate', endDate.toISOString())

    const response = await fetchJsonWithAuth<{ success: boolean; data: PageAnalytics[] }>(
      `/api/analytics/pages?${params.toString()}`
    )
    return response.data
  }

  /**
   * Get daily page views
   */
  static async getDailyViews(startDate?: Date, endDate?: Date) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate.toISOString())
    if (endDate) params.append('endDate', endDate.toISOString())

    const response = await fetchJsonWithAuth<{ success: boolean; data: any }>(
      `/api/analytics/daily?${params.toString()}`
    )
    return response.data
  }

  /**
   * Get average page load time
   */
  static async getAveragePageLoadTime(startDate?: Date, endDate?: Date) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate.toISOString())
    if (endDate) params.append('endDate', endDate.toISOString())

    const response = await fetchJsonWithAuth<{ success: boolean; data: any }>(
      `/api/analytics/load-time?${params.toString()}`
    )
    return response.data
  }

  /**
   * Get unique users count
   */
  static async getUniqueUsers(startDate?: Date, endDate?: Date) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate.toISOString())
    if (endDate) params.append('endDate', endDate.toISOString())

    const response = await fetchJsonWithAuth<{ success: boolean; data: any }>(
      `/api/analytics/users?${params.toString()}`
    )
    return response.data
  }

  /**
   * Get bounce rate
   */
  static async getBounceRate(startDate?: Date, endDate?: Date) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate.toISOString())
    if (endDate) params.append('endDate', endDate.toISOString())

    const response = await fetchJsonWithAuth<{ success: boolean; data: any }>(
      `/api/analytics/bounce-rate?${params.toString()}`
    )
    return response.data
  }

  /**
   * Get top events
   */
  static async getTopEvents(startDate?: Date, endDate?: Date, limit: number = 10) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate.toISOString())
    if (endDate) params.append('endDate', endDate.toISOString())
    params.append('limit', limit.toString())

    const response = await fetchJsonWithAuth<{ success: boolean; data: any }>(
      `/api/analytics/events?${params.toString()}`
    )
    return response.data
  }
}
