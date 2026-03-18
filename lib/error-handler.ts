/**
 * Global error handling utility
 * Dispatch custom events cho unauthorized errors
 */

export const dispatchUnauthorized = (status: number, message?: string) => {
  const event = new CustomEvent('unauthorized', {
    detail: { status, message }
  })
  window.dispatchEvent(event)
}

/**
 * Setup global error handler cho unhandled promise rejections
 */
export const setupGlobalErrorHandler = () => {
  if (typeof window === 'undefined') return

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.response?.status === 401) {
      console.error('🔴 Unhandled 401 error:', event.reason)
      dispatchUnauthorized(401, event.reason?.message)
    }
  })
}
