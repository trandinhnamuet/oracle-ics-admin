'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OtpInput } from '@/components/auth/otp-input';
import { OtpStatus } from '@/components/auth/otp-status';
import { ArrowLeft } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { getClientIp } from '@/lib/ip-service';
import { useTranslation } from 'react-i18next';

interface VerifyOtpPageProps {
  email: string;
  customMessage?: string;
  onBack?: () => void;
  onSuccess?: (user: any) => void;
}

type OtpStatus = 'idle' | 'sending' | 'sent' | 'verifying' | 'success' | 'error';

export function VerifyOtpPage({ email, customMessage, onBack, onSuccess }: VerifyOtpPageProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [otpCode, setOtpCode] = useState('');
  const [status, setStatus] = useState<OtpStatus>('idle');
  const [error, setError] = useState<string>('');
  const [resendTimeLeft, setResendTimeLeft] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimeLeft > 0) {
      const timer = setTimeout(() => {
        setResendTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimeLeft]);

  const verifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError(t('verifyOtp.errorIncomplete'));
      setStatus('error');
      return;
    }

    setStatus('verifying');
    setError('');

    try {
      // Get client IP (same as Vietguard)
      const ipData = await getClientIp();
      console.log('Client IP data in OTP verify:', ipData);

      const response = await authApi.verifyOtp({
        email,
        otp: otpCode,
        ipv4: ipData.ipv4,
        ipv6: ipData.ipv6,
      });

      setStatus('success');
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response);
      } else {
        // Default redirect to login page after verification
        setTimeout(() => {
          router.push('/login?verified=true');
        }, 1500);
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      setError(t('verifyOtp.errorInvalidOtp'));
      setStatus('error');
      
      // Clear OTP on error
      setOtpCode('');
    }
  };

  const resendOtp = async () => {
    if (resendTimeLeft > 0) return;

    setStatus('sending');
    setError('');

    try {
      await authApi.resendOtp({ email });

      setStatus('sent');
      setResendTimeLeft(30); // 30 second cooldown
      setOtpCode(''); // Clear current input
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      setError(t('verifyOtp.errorInvalidOtp'));
      setStatus('error');
    }
  };

  const handleOtpChange = (value: string) => {
    setOtpCode(value);
    setError('');
    if (status === 'error') {
      setStatus('idle');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyOtp();
  };

  const canResend = resendTimeLeft <= 0 && status !== 'sending' && status !== 'verifying';
  const isLoading = status === 'verifying' || status === 'sending';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="flex items-center justify-between">
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold">{t('verifyOtp.title')}</CardTitle>
              </div>
            </div>
            <CardDescription className="text-center">
              {customMessage ? (
                <>
                  <span className="text-orange-600 font-medium block mb-2">
                    {t('verifyOtp.unverifiedWarning')}
                  </span>
                  <span className="text-sm text-muted-foreground block mb-2">
                    {t('verifyOtp.otpSentToEmail')}
                  </span>
                  <span className="font-medium text-foreground">{email}</span>
                  <span className="text-sm text-muted-foreground block mt-2">
                    {t('verifyOtp.pleaseEnterOtp')}
                  </span>
                </>
              ) : (
                <>
                  {t('verifyOtp.enterCodeSentTo')}
                  <br />
                  <span className="font-medium text-foreground">{email}</span>
                </>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* OTP Input */}
              <div className="space-y-4">
                <OtpInput
                  value={otpCode}
                  onChange={handleOtpChange}
                  disabled={isLoading}
                  className="justify-center"
                />
                
                {/* Instructions */}
                <p className="text-sm text-muted-foreground text-center">
                  {t('verifyOtp.codeInstruction')}
                </p>
              </div>

              {/* Status Messages */}
              <OtpStatus
                status={status}
                error={error}
                email={email}
                resendTimeLeft={resendTimeLeft}
              />

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={otpCode.length !== 6 || isLoading}
                >
                  {status === 'verifying' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('verifyOtp.verifying')}
                    </>
                  ) : (
                    t('verifyOtp.verifyButton')
                  )}
                </Button>

                <div className="text-center">
                  <span className="text-sm text-muted-foreground">
                    {t('verifyOtp.didntReceiveCode')}{' '}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    onClick={resendOtp}
                    disabled={!canResend}
                    className="p-0 h-auto font-medium"
                  >
                    {status === 'sending'
                      ? t('verifyOtp.sending')
                      : resendTimeLeft > 0
                      ? t('verifyOtp.resendIn', { time: resendTimeLeft })
                      : t('verifyOtp.resendCode')}
                  </Button>
                </div>
              </div>
            </form>

            {/* Security Note */}
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300 text-center">
                {t('verifyOtp.securityNote')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}