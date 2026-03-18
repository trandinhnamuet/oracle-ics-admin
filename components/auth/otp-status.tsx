import React from 'react';
import { CheckCircle, AlertCircle, Mail, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OtpStatusProps {
  status: 'idle' | 'sending' | 'sent' | 'verifying' | 'success' | 'error';
  error?: string;
  email?: string;
  resendTimeLeft?: number;
}

export function OtpStatus({ status, error, email, resendTimeLeft }: OtpStatusProps) {
  const { t } = useTranslation();

  const renderStatus = () => {
    switch (status) {
      case 'sending':
        return (
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">{t('verifyOtp.status.sending')}</span>
          </div>
        );

      case 'sent':
        return (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <Mail className="h-4 w-4" />
            <div className="text-sm">
              <p className="font-medium">{t('verifyOtp.status.sentTitle')}</p>
              {email && (
                <p className="text-green-600/80">{t('verifyOtp.status.sentCheckEmail', { email })}</p>
              )}
            </div>
          </div>
        );

      case 'verifying':
        return (
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">{t('verifyOtp.status.verifyingCode')}</span>
          </div>
        );

      case 'success':
        return (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{t('verifyOtp.status.successMessage')}</span>
          </div>
        );

      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <div className="text-sm">
              <p className="font-medium">{t('verifyOtp.status.errorTitle')}</p>
              {error && <p className="text-red-600/80">{error}</p>}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderResendCountdown = () => {
    if (!resendTimeLeft || resendTimeLeft <= 0) return null;

    return (
      <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg mt-3">
        <Clock className="h-4 w-4" />
        <span className="text-sm">
          {t('verifyOtp.status.resendAvailableIn', { time: resendTimeLeft })}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {renderStatus()}
      {renderResendCountdown()}
    </div>
  );
}