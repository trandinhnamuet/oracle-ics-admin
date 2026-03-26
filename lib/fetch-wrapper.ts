import { authService } from '@/services/auth.service';

/**
 * Returns the currently selected UI language for the Accept-Language header.
 * Reads from the `language` cookie (set by the i18n module) or localStorage fallback.
 */
export function getCurrentLang(): string {
  const supported = ['vi', 'en', 'zh', 'ja', 'ko'];

  if (typeof document !== 'undefined') {
    const cookieLang = document.cookie
      .split('; ')
      .find(row => row.startsWith('language='))
      ?.split('=')[1];
    if (cookieLang && supported.includes(cookieLang)) {
      return cookieLang;
    }
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('selectedLanguage');
    if (stored && supported.includes(stored)) {
      return stored;
    }

    // Final client fallback: infer from browser language
    const browserPrimary = (navigator.language || 'en').split('-')[0].toLowerCase();
    if (supported.includes(browserPrimary)) {
      return browserPrimary;
    }
  }

  // Default to English when no explicit language is available
  return 'en';
}

/**
 * Global fetch wrapper with automatic token refresh on 401
 * Handles authorization headers, token refresh, and redirects
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  skipAuthRefresh: boolean = false,
  skipRedirectOnError: boolean = false
): Promise<Response> {
  // Resolve API_BASE_URL dynamically (so it picks up env changes)
  const API_BASE_URL = (typeof window === 'undefined' 
    ? process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL 
    : process.env.NEXT_PUBLIC_API_URL) || ''
  const baseUrl = API_BASE_URL.replace(/\/$/, '')
  
  // Build final URL: if relative, prefix with API_BASE_URL
  const finalUrl = /^https?:\/\//i.test(url)
    ? url
    : `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`

  const headers: Record<string, string> = {
    // Don't set Content-Type for FormData — browser must set it with the multipart boundary
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    'Accept-Language': getCurrentLang(),
    ...(options.headers as Record<string, string> || {}),
  };

  // Add Authorization header if token exists
  const accessToken = authService.getAccessToken();
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(finalUrl, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 Unauthorized
  if (response.status === 401 && !skipAuthRefresh) {
    console.log('Received 401, attempting refresh...');
    if (!accessToken) {
      // No token to begin with, don't try to refresh
      console.log('No access token available, cannot refresh');
      return response;
    }
    
    try {
      // Try to refresh the token
      console.log('Calling refresh endpoint...');
      await authService.refresh();
      console.log('Refresh successful, retrying request...');

      // Get new token and retry request
      const newAccessToken = authService.getAccessToken();
      if (newAccessToken) {
        const retryHeaders: Record<string, string> = {
          // Don't set Content-Type for FormData — browser must set it with the multipart boundary
          ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
          'Accept-Language': getCurrentLang(),
          ...(options.headers as Record<string, string> || {}),
          'Authorization': `Bearer ${newAccessToken}`,
        };

        response = await fetch(finalUrl, {
          ...options,
          headers: retryHeaders,
          credentials: 'include',
        });
        
        if (response.status === 401) {
          console.warn('Retry request still returned 401, user may need to re-login');
        } else if (response.ok) {
          console.log('Retry request successful');
        }
      }
    } catch (refreshError) {
      // Refresh failed, clear auth and redirect to login
      console.error('Refresh failed:', refreshError);
      authService.clearAccessToken();
      if (typeof window !== 'undefined' && !skipRedirectOnError) {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please login again.');
    }
  } else if (response.status === 401 && skipAuthRefresh) {
    // If we explicitly skip auth refresh and get 401, redirect to login
    console.warn('Got 401 with skipAuthRefresh=true, redirecting to login');
    authService.clearAccessToken();
    if (typeof window !== 'undefined' && !skipRedirectOnError) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  return response;
}

/**
 * Helper to parse JSON response and handle common error patterns
 */
export async function fetchJsonWithAuth<T>(
  url: string,
  options: RequestInit = {},
  skipAuthRefresh: boolean = false
): Promise<T> {
  const response = await fetchWithAuth(url, options, skipAuthRefresh);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}
