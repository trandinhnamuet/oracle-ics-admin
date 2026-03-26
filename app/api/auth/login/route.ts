import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const acceptLang = request.headers.get('accept-language') || ''

    const backendRes = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': acceptLang,
        // Pass Origin so backend knows to set adminRefreshToken cookie
        'Origin': request.headers.get('origin') || 'https://admin.oraclecloud.vn',
      },
      body: JSON.stringify(body),
    })

    const data = await backendRes.json().catch(() => ({}))
    const nextResponse = NextResponse.json(data, { status: backendRes.status })

    // Forward all Set-Cookie headers from backend (preserves Domain, HttpOnly, etc.)
    forwardSetCookies(backendRes, nextResponse)

    return nextResponse
  } catch (error) {
    console.error('[admin] Login proxy error:', error)
    return NextResponse.json({ message: 'Login proxy failed' }, { status: 500 })
  }
}

function forwardSetCookies(backendRes: Response, nextResponse: NextResponse) {
  // Node 18+: getSetCookie() returns array (avoids comma-joining issue)
  const setCookies: string[] =
    typeof (backendRes.headers as any).getSetCookie === 'function'
      ? (backendRes.headers as any).getSetCookie()
      : backendRes.headers.get('set-cookie')?.split(', ') ?? []

  setCookies.forEach((c) => nextResponse.headers.append('Set-Cookie', c))
}
