'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth.service';
import useAuthStore from '@/hooks/use-auth-store';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      // Handle error
      console.error('Google OAuth error:', error);
      router.push('/login?error=Xác thực Google thất bại');
      return;
    }

    if (token) {
      // Store access token
      authService.setAccessToken(token);

      // Fetch user profile and update auth state
      authService.getCurrentUser()
        .then((user) => {
          if (user) {
            // Update Zustand store
            useAuthStore.setState({
              user,
              isAuthenticated: true,
              isLoading: false,
              token
            });
            console.log('✅ Google login successful:', user);
            router.push('/');
          } else {
            router.push('/login?error=Không lấy được thông tin người dùng');
          }
        })
        .catch((err: any) => {
          console.error('Failed to fetch user profile:', err);
          router.push('/login?error=Xác thực thất bại');
        });
    } else {
      // No token received
      router.push('/login?error=Không nhận được token xác thực');
    }
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
