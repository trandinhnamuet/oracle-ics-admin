import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware no longer performs any authentication check.
 *
 * It used to read a "session hint" cookie scoped to Path=/ to decide whether to
 * render a page or bounce to /login. A site-wide cookie is exactly the pattern
 * the security review asked us to remove, so the gate moved to the client:
 * app/layout.tsx wraps every page in <AuthGuard>, which asks the server whether
 * the HttpOnly refresh cookie still yields a session and redirects if it does
 * not. /login and /unauthorized stay public there.
 *
 * Nothing security-relevant was lost — the middleware check was only a routing
 * hint, and every API call is authorised server-side.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  if (!request.cookies.get('language')?.value) {
    response.cookies.set('language', 'vi', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\.png$|.*\.jpg$|.*\.jpeg$|.*\.gif$|.*\.svg$).*)',
  ],
}
