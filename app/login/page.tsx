'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isLoading, isAuthenticated } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check if user is already logged in — redirect to home client-side
  // (middleware no longer handles this to avoid HttpOnly cookie race condition after logout)
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log('[LOGIN PAGE] User already authenticated, redirecting to admin')
      window.location.replace('/admin')
    }
  }, [isAuthenticated, isLoading])

  // Check if user just verified email
  useEffect(() => {
    const verified = searchParams.get('verified')
    const passwordReset = searchParams.get('passwordReset')
    
    if (verified === 'true') {
      setSuccessMessage(t('login.successEmailVerified'))
    }
    
    if (passwordReset === 'true') {
      setSuccessMessage(t('login.successPasswordReset'))
    }
  }, [searchParams])

  const loginSchema = z.object({
    email: z
      .string()
      .min(1, t('login.validationEmailRequired'))
      .email(t('login.validationEmailInvalid')),
    password: z
      .string()
      .min(1, t('login.validationPasswordRequired'))
      .min(process.env.NODE_ENV === 'development' ? 3 : 6, 
           t('login.validationPasswordMinLength', { length: process.env.NODE_ENV === 'development' ? 3 : 6 })),
  })

  type LoginFormData = z.infer<typeof loginSchema>

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    clearErrors
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null)
      clearErrors()
      console.log('🔐 [LOGIN PAGE] Submitting login form...', { email: data.email })
      await login(data.email, data.password)
      console.log('✅ [LOGIN PAGE] Login successful, should be redirected now')
      reset()
    } catch (error: any) {
      console.error('❌ [LOGIN PAGE] Login error:', error)
      // Don't show error if it's a verification redirect
      if (error.message === 'VERIFICATION_REQUIRED') {
        console.log('🔄 Redirecting to OTP verification...')
        // Don't reset form, don't show error - just let redirect happen
        return
      }
      if (error.message === 'GEOLOCATION_DENIED' || error.message === 'GEOLOCATION_NOT_SUPPORTED') {
        setError('Bạn cần cấp quyền truy cập vị trí để đăng nhập. Vui lòng bật quyền định vị trong cài đặt trình duyệt và thử lại.')
        return
      }
      const msg: string = error.message || ''
      if (msg.includes('mật khẩu không đúng') || msg.includes('Invalid credentials') || msg.includes('Unauthorized') || msg.includes('incorrect') || msg.toLowerCase().includes('invalid password') || msg.toLowerCase().includes('invalid email')) {
        setError(t('login.errorInvalidCredentials'))
      } else if (msg.includes('đã được đăng ký') || msg.includes('already registered') || msg.includes('already exists')) {
        setError(t('login.errorEmailAlreadyExists'))
      } else {
        setError(msg || t('login.errorDefault'))
      }
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setError(null)
      // Redirect to backend Google OAuth endpoint
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'
      window.location.href = `${backendUrl}/auth/google`
    } catch (error: any) {
      setError(error.message)
    }
  }

  return (
    <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('login.title')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('login.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {successMessage && (
            <Alert className="border-green-500 bg-green-50">
              <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert className="border-blue-300 bg-blue-50">
            <AlertDescription className="text-blue-700 text-xs">
              📍 {t('login.geolocationRequired')}
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                Form valid: {isValid ? 'Yes' : 'No'}<br/>
                Errors: {Object.keys(errors).length}<br/>
                Test data: test@gmail.com / 123123
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                autoComplete="email"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                  {...register('password')}
                  className={errors.password ? 'border-red-500' : ''}
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
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? t('login.loggingIn') : t('login.loginButton')}
            </Button>
            
            {process.env.NODE_ENV === 'development' && (
              <Button
                type="button"
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  const event = new Event('input', { bubbles: true })
                  const emailInput = document.getElementById('email') as HTMLInputElement
                  const passwordInput = document.getElementById('password') as HTMLInputElement
                  if (emailInput && passwordInput) {
                    if (emailInput.value == 'tranngocphong@gmail.com') emailInput.value = 'khucthuadu@gmail.com'
                    else emailInput.value = 'tranngocphong@gmail.com'
                    emailInput.dispatchEvent(event)
                    passwordInput.value = '123123'
                    passwordInput.dispatchEvent(event)
                  }
                }}
              >
                {t('login.fillTestData')}
              </Button>
            )}
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('login.or')}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg
              className="mr-2 h-4 w-4"
              aria-hidden="true"
              focusable="false"
              data-prefix="fab"
              data-icon="google"
              role="img"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 488 512"
            >
              <path
                fill="currentColor"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h240z"
              ></path>
            </svg>
            {t('login.loginWithGoogle')}
          </Button>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center">
            <Link
              href="/login/forgot-password/recover-email"
              className="text-primary hover:underline"
            >
              {t('login.forgotPassword')}
            </Link>
          </div>
          <div className="text-sm text-center">
            {t('login.noAccount')}{' '}
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              {t('login.registerNow')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}