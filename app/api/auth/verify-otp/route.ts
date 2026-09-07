import { NextRequest, NextResponse } from 'next/server';
import { resolveClientIp } from '@/lib/server-client-ip';

// Loopback for the server-side hop — see the note in app/api/auth/login/route.ts.
const API_BASE_URL =
  process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    // Validate input
    if (!email || !otp) {
      return NextResponse.json(
        { message: 'Email and OTP code are required' },
        { status: 400 }
      );
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { message: 'OTP code must be exactly 6 digits' },
        { status: 400 }
      );
    }

    // Forward User-Agent so the backend can record accurate info.
    const userAgent = request.headers.get('user-agent') || ''
    // SECURITY: Do NOT forward the inbound browser-supplied X-Forwarded-For /
    // X-Real-IP headers — a client can forge them to spoof the recorded source
    // IP in admin login-history (evading IP alerting / framing another IP).
    // resolveClientIp() takes only what our own nginx wrote (see its doc block);
    // `request.ip` alone is always undefined on self-hosted Next and made every
    // login record the proxy's loopback address.
    const clientIP = resolveClientIp(request)
    const otpHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (userAgent) otpHeaders['User-Agent'] = userAgent
    if (clientIP) {
      otpHeaders['X-Forwarded-For'] = clientIP
      otpHeaders['X-Real-IP'] = clientIP
    }

    // Forward request to backend
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: otpHeaders,
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (response.ok) {
      // Create response with user data
      const nextResponse = NextResponse.json({
        user: data.user,
        message: data.message || 'Email verified successfully',
      });

      // Re-issue only the adminRefreshToken as a HOST-ONLY cookie instead of forwarding
      // the backend's raw (possibly Domain-scoped) Set-Cookie — a Domain-scoped cookie
      // would survive the host-only logout deletion (F3). Mirrors the login route.
      const rawCookies: string[] =
        (response.headers as any).getSetCookie?.() ??
        (response.headers.get('set-cookie') ? [response.headers.get('set-cookie') as string] : []);
      for (const c of rawCookies) {
        const m = /(?:^|;\s*)adminRefreshToken=([^;]+)/.exec(c);
        if (m) {
          nextResponse.cookies.set('adminRefreshToken', decodeURIComponent(m[1]), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/auth',
          });
        }
      }

      return nextResponse;
    } else {
      return NextResponse.json(
        { message: data.message || 'Verification failed' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Verify OTP API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}