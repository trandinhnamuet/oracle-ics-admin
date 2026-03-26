import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'
const IS_PROD = process.env.NODE_ENV === 'production'
const COOKIE_NAME = 'adminRefreshToken'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''

    const backendRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Origin': 'https://admin.oraclecloud.vn',
      },
    })

    const data = await backendRes.json().catch(() => ({}))
    const nextResponse = NextResponse.json(data, { status: backendRes.status })

    if (backendRes.ok) {
      const tokenValue = extractCookieValue(backendRes, COOKIE_NAME)
      if (tokenValue) {
        nextResponse.cookies.set({
          name: COOKIE_NAME,
          value: tokenValue,
          httpOnly: true,
          secure: IS_PROD,
          sameSite: 'lax',
          path: '/',
          maxAge: COOKIE_MAX_AGE,
        })
      }
    }

    return nextResponse
  } catch (error) {
    console.error('[admin] Refresh proxy error:', error)
    return NextResponse.json({ message: 'Refresh proxy failed' }, { status: 500 })
  }
}

function extractCookieValue(response: Response, cookieName: string): string | null {
  const headers = response.headers as any
  const setCookies: string[] =
    typeof headers.getSetCookie === 'function'
      ? headers.getSetCookie()
      : (response.headers.get('set-cookie')?.split(/, (?=[^;])/) ?? [])
  for (const cookieStr of setCookies) {
    const [nameValue] = cookieStr.split(';')
    const eqIdx = nameValue.indexOf('=')
    if (eqIdx < 0) continue
    const name = nameValue.slice(0, eqIdx).trim()
    const value = nameValue.slice(eqIdx + 1).trim()
    if (name === cookieName) return value || null
  }
  return null
}
