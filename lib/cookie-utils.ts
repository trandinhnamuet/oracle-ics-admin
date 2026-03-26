/**
 * Utility functions for cookie management on client-side
 * Used as a fallback to ensure cookies are cleared even if backend fails
 */

export function deleteCookie(name: string, options?: { path?: string; domain?: string }) {
  if (typeof window === 'undefined') return;

  const path = options?.path || '/';
  const domain = options?.domain;

  // Create multiple delete attempts with different configurations
  // to handle various cookie scenarios
  const deleteStrings = [
    // Basic delete
    `${name}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    
    // Delete with current domain
    domain ? `${name}=; path=${path}; domain=${domain}; expires=Thu, 01 Jan 1970 00:00:00 GMT` : '',
    
    // Delete with SameSite=Lax (matching our backend setting)
    `${name}=; path=${path}; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    
    // Delete with Secure flag for production
    process.env.NODE_ENV === 'production'
      ? `${name}=; path=${path}; SameSite=Lax; Secure; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      : '',
    
    // Delete with domain + Secure + SameSite for production
    domain && process.env.NODE_ENV === 'production'
      ? `${name}=; path=${path}; domain=${domain}; SameSite=Lax; Secure; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      : '',
  ].filter(Boolean);

  // Apply all delete attempts
  deleteStrings.forEach(deleteString => {
    document.cookie = deleteString;
  });

  console.log(`🍪 Attempted to delete cookie: ${name}`);
}

export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;

  const value = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1];

  return value || null;
}

export function clearAllAuthCookies() {
  if (typeof window === 'undefined') return;

  // List of all auth-related cookies to clear
  const authCookies = ['refreshToken', 'access_token', 'auth-token'];
  
  // Try to extract domain from current location
  const hostname = window.location.hostname;
  const domain = hostname.includes('.') ? hostname.split('.').slice(-2).join('.') : hostname;

  authCookies.forEach(cookieName => {
    deleteCookie(cookieName, { path: '/' });
    if (domain !== hostname) {
      deleteCookie(cookieName, { path: '/', domain });
    }
  });

  console.log('🧹 Cleared all auth cookies');
}
