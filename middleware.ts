import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes không cần đăng nhập (public)
const publicRoutes = ['/login', '/unauthorized']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const refreshToken = request.cookies.get('refreshToken')?.value

  // Debug logging
  const allCookies = request.cookies.getAll();
  console.log('🔍 [MIDDLEWARE] Path:', pathname);
  console.log('🔍 [MIDDLEWARE] All cookies:', allCookies.map(c => c.name));
  console.log('🔍 [MIDDLEWARE] RefreshToken:', refreshToken ? '✅ Found' : '❌ Not found');

  // Set language cookie nếu chưa có
  const response = NextResponse.next()
  const currentLanguage = request.cookies.get('language')?.value
  if (!currentLanguage) {
    response.cookies.set('language', 'vi', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Trích xuất role từ refresh token
  let userRole: string | null = null
  if (refreshToken) {
    try {
      const payload = refreshToken.split('.')[1]
      if (payload) {
        // Use base64url encoding (correct for JWT)
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
        userRole = decoded.role
        console.log('🔍 [MIDDLEWARE] User role:', userRole);
      }
    } catch {
      // invalid token
      console.log('🔍 [MIDDLEWARE] Failed to decode token');
    }
  }

  // Chưa đăng nhập + không phải public route → về /login
  if (!refreshToken && !isPublicRoute) {
    console.log('🔍 [MIDDLEWARE] No refreshToken and not public route, redirecting to /login');
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('returnUrl', pathname)
    const loginResponse = NextResponse.redirect(loginUrl)
    loginResponse.cookies.delete('refreshToken')
    if (currentLanguage) {
      loginResponse.cookies.set('language', currentLanguage, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    }
    return loginResponse
  }

  // Đã đăng nhập nhưng không phải admin → /unauthorized
  if (refreshToken && !isPublicRoute && userRole !== 'admin') {
    console.log('🔍 [MIDDLEWARE] User is not admin, redirecting to /unauthorized');
    const unauthorizedResponse = NextResponse.redirect(new URL('/unauthorized', request.url))
    if (currentLanguage) {
      unauthorizedResponse.cookies.set('language', currentLanguage, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    }
    return unauthorizedResponse
  }

  // Đã đăng nhập + là admin + đang ở /login → redirect về /admin
  if (refreshToken && userRole === 'admin' && pathname.startsWith('/login')) {
    console.log('🔍 [MIDDLEWARE] Authenticated admin at /login, redirecting to /admin');
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Đã đăng nhập + là admin + đang ở /unauthorized → redirect về /admin
  if (refreshToken && userRole === 'admin' && pathname.startsWith('/unauthorized')) {
    console.log('🔍 [MIDDLEWARE] Authenticated admin at /unauthorized, redirecting to /admin');
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}
