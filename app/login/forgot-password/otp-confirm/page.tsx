
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { authApi } from '@/api/auth.api'
import { useTranslation } from 'react-i18next'

export default function OtpConfirmPage() {
  const { t } = useTranslation()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Guard: only allow if a genuine forgot-password request was made from this session
  useEffect(() => {
    const stored = localStorage.getItem('pendingForgotPasswordEmail')
    if (!stored) {
      router.replace('/login/forgot-password/recover-email')
      return
    }
    setEmail(stored)
    setPageLoading(false)
  }, [router])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return
    const newOtp = [...otp]
    pastedData.split('').forEach((char, index) => {
      if (index < 6) newOtp[index] = char
    })
    setOtp(newOtp)
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpString = otp.join('')
    if (otpString.length !== 6) {
      setError(t('forgotPassword.otpConfirm.validation.otpRequired'))
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      await authApi.verifyResetOtp(email, otpString)
      // Mark OTP as verified and clear the pending email key
      localStorage.setItem('pendingForgotOtpVerified', '1')
      localStorage.removeItem('pendingForgotPasswordEmail')
      router.push(`/login/forgot-password/new-password?email=${encodeURIComponent(email)}&otp=${otpString}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await authApi.forgotPassword(email)
      setCountdown(60)
      setCanResend(false)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const isOtpComplete = otp.every(digit => digit !== '')

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('forgotPassword.otpConfirm.title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('forgotPassword.otpConfirm.subtitle')}<br />
            <span className="font-semibold text-primary">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-12 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  disabled={isLoading}
                />
              ))}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !isOtpComplete}>
              {isLoading ? t('forgotPassword.otpConfirm.verifying') : t('forgotPassword.otpConfirm.submitButton')}
            </Button>

            <div className="text-center">
              {canResend ? (
                <Button type="button" variant="link" onClick={handleResend} disabled={isLoading} className="text-primary">
                  {t('forgotPassword.otpConfirm.resend')}
                </Button>
              ) : (
                <p className="text-sm text-gray-500">{t('forgotPassword.otpConfirm.resendCountdown', { countdown })}</p>
              )}
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center">
            <Link href="/login" className="text-primary hover:underline font-medium">
              {t('forgotPassword.otpConfirm.backToLogin')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
