
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { authApi } from '@/api/auth.api'

export default function NewPasswordPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const otp = searchParams.get('otp') || ''
  
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const verified = localStorage.getItem('pendingForgotOtpVerified')
    if (!verified || !email || !otp) {
      router.replace('/login')
      return
    }
    setPageLoading(false)
  }, [router, email, otp])

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/

  const passwordSchema = z.object({
    newPassword: z
      .string()
      .min(8, t('forgotPassword.newPassword.validation.passwordMinLength'))
      .regex(passwordRegex, t('forgotPassword.newPassword.validation.passwordStrong')),
    confirmPassword: z
      .string()
      .min(1, t('forgotPassword.newPassword.validation.confirmPasswordMinLength')),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t('forgotPassword.newPassword.validation.passwordMismatch'),
    path: ['confirmPassword'],
  })

  type PasswordFormData = z.infer<typeof passwordSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    }
  })

  const onSubmit = async (data: PasswordFormData) => {
    try {
      setIsLoading(true)
      setError(null)
      
      await authApi.resetPassword(email, otp, data.newPassword)
      
      // Clear OTP guard flags
      localStorage.removeItem('pendingForgotOtpVerified')
      localStorage.removeItem('pendingForgotPasswordEmail')

      // Navigate to login with success message
      router.push('/login?passwordReset=true')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('forgotPassword.newPassword.title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('forgotPassword.newPassword.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('forgotPassword.newPassword.passwordLabel')}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('forgotPassword.newPassword.passwordPlaceholder')}
                  {...register('newPassword')}
                  className={errors.newPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </Button>
              </div>
              {errors.newPassword && (
                <div className="space-y-1">
                  <p className="text-sm text-red-500">{errors.newPassword.message}</p>
                  <div className="text-xs text-red-400 mt-1">
                    <p>{t('forgotPassword.passwordRules.title')}</p>
                    <ul className="list-disc list-inside space-y-0.5 mt-1">
                      <li>{t('forgotPassword.passwordRules.minLength')}</li>
                      <li>{t('forgotPassword.passwordRules.lowercase')}</li>
                      <li>{t('forgotPassword.passwordRules.uppercase')}</li>
                      <li>{t('forgotPassword.passwordRules.digit')}</li>
                      <li>{t('forgotPassword.passwordRules.special')}</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('forgotPassword.newPassword.confirmPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={t('forgotPassword.newPassword.confirmPasswordPlaceholder')}
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? t('forgotPassword.newPassword.resetting') : t('forgotPassword.newPassword.submitButton')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
