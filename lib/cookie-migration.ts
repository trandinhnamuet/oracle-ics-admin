// Script để migration cookies từ auth-token sang access_token
// Chạy script này một lần để cleanup cookies cũ

export function migrateCookies() {
  if (typeof window === 'undefined') return
  
  // Nếu có auth-token cũ, chuyển sang access_token
  const oldToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
  
  if (oldToken) {
    // Set cookie mới với tên đúng
    document.cookie = `access_token=${oldToken}; path=/; max-age=${24 * 60 * 60}; SameSite=strict${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
    
    // Xóa cookie cũ
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    
    console.log('✅ Đã migration cookie từ auth-token sang access_token')
  }
  
  // Cleanup các localStorage entries nếu cần
  try {
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      // Reset isAuthenticated để force re-check với server
      if (parsed.state) {
        parsed.state.isAuthenticated = false
        localStorage.setItem('auth-storage', JSON.stringify(parsed))
        console.log('✅ Đã reset auth storage state')
      }
    }
  } catch (error) {
    console.error('Lỗi khi cleanup localStorage:', error)
  }
}

// Auto run migration khi import
if (typeof window !== 'undefined') {
  migrateCookies()
}