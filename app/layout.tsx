import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/lib/auth-context'
import { AuthStoreInitializer } from '@/components/providers/auth-store-initializer'
import { I18nProvider } from '@/components/providers/i18n-provider'
import { AnalyticsProvider } from '@/components/providers/analytics-provider'
import { Toaster } from '@/components/ui/toaster'
import { cookies } from 'next/headers'
import { DomPatchProvider } from '@/components/providers/dom-patch-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Oracle ICS Admin',
  description: 'Oracle ICS Admin Dashboard',
  generator: 'Next.js',
  icons: {
    icon: [
      {
        url: '/logo_oracle.png',
        type: 'image/png',
      },
    ],
    apple: '/logo_oracle.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Đọc ngôn ngữ từ cookie để đồng bộ với server-side
  const cookieStore = cookies()
  const language = cookieStore.get('language')?.value || 'vi'
  
  return (
    <html lang={language} suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <DomPatchProvider />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <I18nProvider initialLanguage={language}>
            <AuthProvider>
              <AuthStoreInitializer />
              <AnalyticsProvider>
                <div className="min-h-screen flex flex-col">
                  <main className="flex-1">
                    {children}
                  </main>
                  <Toaster />
                </div>
              </AnalyticsProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
