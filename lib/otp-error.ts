import type { TFunction } from 'i18next';

/**
 * Parses an OTP-related backend error and returns a translated message.
 *
 * Detected patterns (from otp.service.ts):
 *  - Hourly rate limit : "Hourly OTP limit reached. Please wait N minute(s)..."
 *  - Resend cooldown   : "Please wait N seconds before requesting new OTP"
 *  - Default           : returns the raw message as-is
 */
export function parseOtpError(error: any, t: TFunction): string {
  const msg: string =
    error?.response?.data?.message || // axios-style responses
    error?.message ||                  // fetch-wrapper / Error objects
    '';

  const hourlyMatch = msg.match(/please wait (\d+) minute/i);
  const cooldownMatch = msg.match(/please wait (\d+) second/i);

  if (hourlyMatch || /hourly otp limit/i.test(msg)) {
    return t('verifyOtp.errorHourlyLimit', {
      minutes: hourlyMatch?.[1] ?? '60',
    });
  }

  if (cooldownMatch) {
    return t('verifyOtp.errorResendCooldown', { seconds: cooldownMatch[1] });
  }

  return msg;
}
