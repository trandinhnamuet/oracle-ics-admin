'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth.service';
import useAuthStore from '@/hooks/use-auth-store';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth error:', error);
      router.push('/login?error=Xác thực Google thất bại');
      return;
    }

    // The access token is deliberately NOT passed in the URL any more: a query
    // string ends up in browser history, server and proxy logs, the Referer of
    // anything this page loads, and any screenshot of the address bar. The
    // backend set an HttpOnly refresh cookie before redirecting here, so we
    // exchange that for an access token that only ever lives in memory.
    authService
      .refresh()
      .then(() => authService.getCurrentUser())
      .then((user) => {
        if (!user) {
          router.push('/login?error=Không lấy được thông tin người dùng');
          return;
        }
        useAuthStore.setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          token: authService.getAccessToken() ?? undefined,
        });
        router.push('/');
      })
      .catch((err: any) => {
        console.error('Google sign-in could not be completed:', err);
        router.push('/login?error=Xác thực thất bại');
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        <p className="text-lg">Đang xác thực...</p>
      </div>
    </div>
  );
}
