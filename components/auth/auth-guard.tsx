'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { authService } from '@/services/auth.service'

/**
 * Client-side gate for pages that require a signed-in user.
 *
 * This replaces the previous Next.js middleware check, which depended on a
 * "session hint" cookie scoped to Path=/ — a site-wide cookie the security
 * review flagged as overly broad. Nothing is stored site-wide any more: the
 * guard simply asks the server whether the HttpOnly refresh cookie still
 * yields a valid session, and sends the visitor to /login if it does not.
 *
 * This was never the security boundary and still isn't — every API call is
 * authorised server-side. It only decides whether to render the page shell,
 * and it renders nothing until the answer is known, so a signed-out visitor
 * never sees protected content.
 */
const PUBLIC_PATHS: string[] = ['/login', '/unauthorized']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const [allowed, setAllowed] = useState(isPublic)

  useEffect(() => {
    if (isPublic) {
      setAllowed(true)
      return
    }

    let cancelled = false
    const check = async () => {
      try {
        // A token already in memory means this tab has an established session.
        if (!authService.getAccessToken()) {
          await authService.refresh()
        }
        // Enforce the admin role at the UI layer too: a valid customer session
        // must never render the admin dashboard (defense-in-depth; the backend
        // still authorises every admin API call).
        const user = await authService.getCurrentUser()
        if (!user) {
          throw new Error('No session')
        }
        if (user.role !== 'admin') {
          if (!cancelled) {
            setAllowed(false)
            router.replace('/unauthorized')
          }
          return
        }
        if (!cancelled) setAllowed(true)
      } catch {
        if (!cancelled) {
          setAllowed(false)
          const returnUrl = encodeURIComponent(pathname)
          router.replace(`/login?returnUrl=${returnUrl}`)
        }
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [pathname, isPublic, router])

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        ...
      </div>
    )
  }

  return <>{children}</>
}
