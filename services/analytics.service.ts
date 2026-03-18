/**
 * Google Analytics Service
 * Handles page views, custom events, and user tracking
 */

// Google Measurement ID - Replace with your actual GA4 measurement ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX'

interface PageViewEvent {
  page_path: string
  page_title: string
  page_location?: string
}

interface CustomEvent {
  name: string
  parameters?: Record<string, any>
}

/**
 * Initialize Google Analytics
 */
export const initializeGA = () => {
  if (typeof window === 'undefined') return

  // Load Google Analytics script
  const script = document.createElement('script')
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  script.async = true
  document.head.appendChild(script)

  // Initialize dataLayer
  ;(window as any).dataLayer = (window as any).dataLayer || []

  function gtag(...args: any[]) {
    ;(window as any).dataLayer.push(arguments)
  }

  gtag('js', new Date())
  gtag('config', GA_MEASUREMENT_ID, {
    page_path: window.location.pathname,
    page_title: document.title,
  })

  ;(window as any).gtag = gtag
}

/**
 * Track page views
 */
export const trackPageView = (pageData: PageViewEvent) => {
  if (typeof window === 'undefined') return

  const gtag = (window as any).gtag
  if (!gtag) return

  gtag('event', 'page_view', {
    page_path: pageData.page_path,
    page_title: pageData.page_title,
    page_location: pageData.page_location || window.location.href,
  })

  // Also send to backend for analytics dashboard
  recordAnalytics({
    event_type: 'page_view',
    page_path: pageData.page_path,
    page_title: pageData.page_title,
    page_location: pageData.page_location,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  }).catch((err) => console.log('Failed to record analytics:', err))
}

/**
 * Track custom events
 */
export const trackEvent = (event: CustomEvent) => {
  if (typeof window === 'undefined') return

  const gtag = (window as any).gtag
  if (!gtag) return

  gtag('event', event.name, event.parameters || {})

  // Also send to backend
  recordAnalytics({
    event_type: event.name,
    ...event.parameters,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  }).catch((err) => console.log('Failed to record analytics:', err))
}

/**
 * Track button clicks
 */
export const trackButtonClick = (buttonName: string, buttonLabel?: string) => {
  trackEvent({
    name: 'button_click',
    parameters: {
      button_name: buttonName,
      button_label: buttonLabel,
    },
  })
}

/**
 * Track form submissions
 */
export const trackFormSubmit = (formName: string) => {
  trackEvent({
    name: 'form_submit',
    parameters: {
      form_name: formName,
    },
  })
}

/**
 * Track page load time
 */
export const trackPageLoadTime = () => {
  if (typeof window === 'undefined') return

  if (window.performance) {
    window.addEventListener('load', () => {
      const perfData = window.performance.timing
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart

      trackEvent({
        name: 'page_load_time',
        parameters: {
          load_time_ms: pageLoadTime,
        },
      })
    })
  }
}

/**
 * Track user engagement (scroll depth)
 */
export const trackScrollDepth = () => {
  if (typeof window === 'undefined') return

  let scrolled = false

  const handleScroll = () => {
    if (scrolled) return

    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrollPercent = (window.scrollY / docHeight) * 100

    if (scrollPercent > 90) {
      trackEvent({
        name: 'scroll_depth',
        parameters: {
          scroll_percent: Math.round(scrollPercent),
        },
      })
      scrolled = true
    }
  }

  window.addEventListener('scroll', handleScroll)

  return () => {
    window.removeEventListener('scroll', handleScroll)
  }
}

/**
 * Record analytics to backend database
 */
export const recordAnalytics = async (analyticsData: any) => {
  try {
    // Get the API base URL from environment variable
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

    const response = await fetch(`${apiUrl}/api/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analyticsData),
    })

    if (!response.ok) {
      console.error('Failed to record analytics:', response.statusText)
    }
  } catch (error) {
    console.error('Error recording analytics:', error)
  }
}

/**
 * Set user ID for tracking
 */
export const setUserId = (userId: string) => {
  if (typeof window === 'undefined') return

  const gtag = (window as any).gtag
  if (!gtag) return

  gtag('config', GA_MEASUREMENT_ID, {
    user_id: userId,
  })

  gtag('set', { 'user_id': userId })
}

/**
 * Set user properties
 */
export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window === 'undefined') return

  const gtag = (window as any).gtag
  if (!gtag) return

  gtag('set', properties)
}
