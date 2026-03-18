import { authService, User, LoginResponse } from '@/services/auth.service';
import { fetchWithAuth, fetchJsonWithAuth } from '@/lib/fetch-wrapper';

// Cấu hình base URL cho API backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

// Types cho API requests
export interface LoginRequest {
  email: string;
  password: string;
  ipv4?: string;
  ipv6?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
  requiresVerification: boolean;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
  ipv4?: string;
  ipv6?: string;
}

export interface VerifyOtpResponse {
  message: string;
  success: boolean;
}

export interface ResendOtpRequest {
  email: string;
}

export interface ResendOtpResponse {
  message: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}

// Auth API functions
export const authApi = {
  // Đăng nhập - uses authService directly
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    try {
      return await authService.login(data.email, data.password);
    } catch (error: any) {
      console.error('Login API error:', error);
      
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối mạng.');
      }
      
      throw new Error(error.message || 'Đăng nhập thất bại');
    }
  },

  // Đăng ký
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
      return await fetchJsonWithAuth<RegisterResponse>(
        `${API_BASE_URL}/auth/register`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        true // skip auth refresh for register
      );
    } catch (error: any) {
      throw new Error(error.message || 'Đăng ký thất bại');
    }
  },

  // Verify OTP
  verifyOtp: async (data: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
    try {
      return await fetchJsonWithAuth<VerifyOtpResponse>(
        `${API_BASE_URL}/auth/verify-otp`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        true
      );
    } catch (error: any) {
      throw new Error(error.message || 'Xác thực OTP thất bại');
    }
  },

  // Resend OTP
  resendOtp: async (data: ResendOtpRequest): Promise<ResendOtpResponse> => {
    try {
      return await fetchJsonWithAuth<ResendOtpResponse>(
        `${API_BASE_URL}/auth/resend-otp`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        true
      );
    } catch (error: any) {
      throw new Error(error.message || 'Gửi lại OTP thất bại');
    }
  },

  // Lấy thông tin user hiện tại - uses authService
  getCurrentUser: async (): Promise<User | null> => {
    try {
      return await authService.getCurrentUser();
    } catch (error: any) {
      throw new Error(error.message || 'Không thể lấy thông tin người dùng');
    }
  },

  // Đăng xuất - uses authService
  logout: async (): Promise<void> => {
    await authService.logout();
  },

  // Refresh token - uses authService
  refreshToken: async (): Promise<{ accessToken: string }> => {
    try {
      const accessToken = await authService.refresh();
      return { accessToken };
    } catch (error: any) {
      console.error('❌ Refresh token error:', error.message);
      throw new Error(error.message || 'Không thể làm mới token');
    }
  },

  // Đăng nhập bằng Google (sẽ implement sau)
  googleLogin: async (googleToken: string): Promise<LoginResponse> => {
    try {
      return await fetchJsonWithAuth<LoginResponse>(
        `${API_BASE_URL}/auth/google`,
        {
          method: 'POST',
          body: JSON.stringify({ token: googleToken }),
        },
        true
      );
    } catch (error: any) {
      throw new Error(error.message || 'Đăng nhập Google thất bại');
    }
  },

  // Quên mật khẩu - Gửi OTP
  forgotPassword: async (email: string): Promise<{ message: string; email: string; success: boolean }> => {
    try {
      return await fetchJsonWithAuth<{ message: string; email: string; success: boolean }>(
        `${API_BASE_URL}/auth/forgot-password`,
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        },
        true
      );
    } catch (error: any) {
      throw new Error(error.message || 'Không thể gửi email reset mật khẩu');
    }
  },

  // Xác thực OTP đặt lại mật khẩu
  verifyResetOtp: async (email: string, otp: string): Promise<{ message: string; success: boolean }> => {
    try {
      return await fetchJsonWithAuth<{ message: string; success: boolean }>(
        `${API_BASE_URL}/auth/verify-reset-otp`,
        {
          method: 'POST',
          body: JSON.stringify({ email, otp }),
        },
        true
      );
    } catch (error: any) {
      throw new Error(error.message || 'Xác thực OTP thất bại');
    }
  },

  // Reset mật khẩu với OTP
  resetPassword: async (email: string, otp: string, newPassword: string): Promise<{ message: string; success: boolean }> => {
    try {
      return await fetchJsonWithAuth<{ message: string; success: boolean }>(
        `${API_BASE_URL}/auth/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify({ email, otp, newPassword }),
        },
        true
      );
    } catch (error: any) {
      throw new Error(error.message || 'Không thể reset mật khẩu');
    }
  },
};