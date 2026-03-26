import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''

    // Forward adminRefreshToken cookie to backend so it can rotate the token
    const backendRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Origin': request.headers.get('origin') || 'https://admin.oraclecloud.vn',
      },
    })

    const data = await backendRes.json().catch(() => ({}))
    const nextResponse = NextResponse.json(data, { status: backendRes.status })

    // Forward rotated adminRefreshToken cookie from backend back to browser
    forwardSetCookies(backendRes, nextResponse)

    return nextResponse
  } catch (error) {
    console.error('[admin] Refresh proxy error:', error)
    return NextResponse.json({ message: 'Refresh proxy failed' }, { status: 500 })
  }
}

function forwardSetCookies(backendRes: Response, nextResponse: NextResponse) {
  const setCookies: string[] =
    typeof (backendRes.headers as any).getSetCookie === 'function'
      ? (backendRes.headers as any).getSetCookie()
      : backendRes.headers.get('set-cookie')?.split(', ') ?? []

  setCookies.forEach((c) => nextResponse.headers.append('Set-Cookie', c))
}
