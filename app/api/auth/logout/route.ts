import { NextRequest, NextResponse } from 'next/server'

// Loopback for the server-side hop — see the note in app/api/auth/login/route.ts.
const API_BASE_URL =
  process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'
const IS_PROD = process.env.NODE_ENV === 'production'
const COOKIE_NAME = 'adminRefreshToken'

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''

    // Tell backend to invalidate token in DB
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Origin': 'https://admin.oraclecloud.vn',
      },
    }).catch(() => {})

    const nextResponse = NextResponse.json({ message: 'Logged out' }, { status: 200 })

    // Delete cookie directly — no domain needed since it's host-only
    nextResponse.cookies.set({
      name: COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 0,
    })

    return nextResponse
  } catch (error) {
    console.error('[admin] Logout proxy error:', error)
    return NextResponse.json({ message: 'Logout proxy failed' }, { status: 500 })
  }
}
