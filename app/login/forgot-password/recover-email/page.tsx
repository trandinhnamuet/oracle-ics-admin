'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { authApi } from '@/api/auth.api'
import { useTranslation } from 'react-i18next'

export default function RecoverEmailPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const emailSchema = z.object({
    email: z
      .string()
      .min(1, t('forgotPassword.recoverEmail.validation.emailRequired'))
      .email(t('forgotPassword.recoverEmail.validation.emailInvalid')),
  })

  type EmailFormData = z.infer<typeof emailSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
    }
  })

  const onSubmit = async (data: EmailFormData) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await authApi.forgotPassword(data.email)
      
      // Mark that a genuine OTP was sent — guards downstream pages
      localStorage.setItem('pendingForgotPasswordEmail', data.email)
      // Navigate to OTP confirmation page
      router.push(`/login/forgot-password/otp-confirm?email=${encodeURIComponent(data.email)}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('forgotPassword.recoverEmail.title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('forgotPassword.recoverEmail.subtitle')}
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
              <Label htmlFor="email">{t('forgotPassword.recoverEmail.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('forgotPassword.recoverEmail.emailPlaceholder')}
                autoComplete="email"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? t('forgotPassword.recoverEmail.sending') : t('forgotPassword.recoverEmail.submitButton')}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center">
          {t('forgotPassword.recoverEmail.rememberPassword')}{' '}
            <Link
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              {t('forgotPassword.recoverEmail.loginLink')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
