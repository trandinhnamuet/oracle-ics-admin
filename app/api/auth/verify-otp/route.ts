import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

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

    // Forward request to backend
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (response.ok) {
      // Create response with user data
      const nextResponse = NextResponse.json({
        user: data.user,
        message: data.message || 'Email verified successfully',
      });

      // Forward cookies from backend
      const setCookieHeaders = response.headers.get('set-cookie');
      if (setCookieHeaders) {
        nextResponse.headers.set('set-cookie', setCookieHeaders);
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