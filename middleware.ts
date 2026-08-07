import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes không cần đăng nhập (public)
const publicRoutes = ['/login', '/unauthorized']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // The admin refresh token is scoped to /api/auth and is not sent to page
  // routes, so routing decisions read the companion session-hint cookie: a
  // site-wide marker holding only the role, never a token. Admin keeps its own
  // cookie name to stay isolated from oraclecloud.vn.
  const sessionHint = request.cookies.get('adminSessionHint')?.value

  // Debug logging
  const allCookies = request.cookies.getAll();
  console.log('🔍 [MIDDLEWARE] Path:', pathname);
  console.log('🔍 [MIDDLEWARE] All cookies:', allCookies.map(c => c.name));
  console.log('🔍 [MIDDLEWARE] adminSessionHint:', sessionHint ? '✅ Found' : '❌ Not found');

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

  // SECURITY NOTE:
  // `userRole` comes from the session-hint cookie and is NOT authenticated. It is
  // used only as a UI ROUTING HINT (redirect non-admins to /unauthorized) and is
  // NEVER the source of authorization. Every real authorization decision is
  // enforced server-side on each API call (JwtAuthGuard + AdminGuard verify the
  // JWT signature). Forging this cookie yields an empty admin shell and nothing
  // more — the same exposure as the previous unverified JWT decode.
  // DO NOT use this value for any authorization or trust decision.
  const userRole: string | null = sessionHint || null

  // Chưa đăng nhập + không phải public route → về /login
  if (!sessionHint && !isPublicRoute) {
    console.log('🔍 [MIDDLEWARE] No session hint and not public route, redirecting to /login');
    const loginUrl = new URL('/login', request.url)
    // Never set /unauthorized as returnUrl — it causes confusion when admin logs in
    if (pathname !== '/unauthorized') {
      loginUrl.searchParams.set('returnUrl', pathname)
    }
    const loginResponse = NextResponse.redirect(loginUrl)
    loginResponse.cookies.delete('adminSessionHint')
    if (currentLanguage) {
      loginResponse.cookies.set('language', currentLanguage, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    }
    return loginResponse
  }

  // Đã đăng nhập nhưng không phải admin → /unauthorized
  if (sessionHint && !isPublicRoute && userRole !== 'admin') {
    console.log('🔍 [MIDDLEWARE] User is not admin, redirecting to /unauthorized');
    const unauthorizedResponse = NextResponse.redirect(new URL('/unauthorized', request.url))
    if (currentLanguage) {
      unauthorizedResponse.cookies.set('language', currentLanguage, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    }
    return unauthorizedResponse
  }

  // Đã đăng nhập + là admin + đang ở /login → redirect về /admin
  if (sessionHint && userRole === 'admin' && pathname.startsWith('/login')) {
    console.log('🔍 [MIDDLEWARE] Authenticated admin at /login, redirecting to /admin');
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}
