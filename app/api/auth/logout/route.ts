import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''

    // Tell backend this request is from admin so it reads adminRefreshToken cookie
    const backendRes = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Origin': request.headers.get('origin') || 'https://admin.oraclecloud.vn',
      },
    })

    const data = await backendRes.json().catch(() => ({}))
    const nextResponse = NextResponse.json(data, { status: backendRes.status })

    // Forward Set-Cookie from backend — backend sends clearCookie(adminRefreshToken, {domain: .oraclecloud.vn})
    // which generates: Set-Cookie: adminRefreshToken=; Domain=.oraclecloud.vn; Expires=past; Path=/
    // Forwarding this header is the ONLY reliable way to clear a cookie with a Domain attribute
    forwardSetCookies(backendRes, nextResponse)

    return nextResponse
  } catch (error) {
    console.error('[admin] Logout proxy error:', error)
    return NextResponse.json({ message: 'Logout proxy failed' }, { status: 500 })
  }
}

function forwardSetCookies(backendRes: Response, nextResponse: NextResponse) {
  const setCookies: string[] =
    typeof (backendRes.headers as any).getSetCookie === 'function'
      ? (backendRes.headers as any).getSetCookie()
      : backendRes.headers.get('set-cookie')?.split(', ') ?? []

  setCookies.forEach((c) => nextResponse.headers.append('Set-Cookie', c))
}
