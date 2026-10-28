import type { Metadata, Viewport } from 'next'
import './globals.css'
import { UserProvider } from '@/lib/userContext'
import { AppWrapper } from '@/components/app-wrapper'
import { AuthProvider } from '@/lib/authContext'
import { AuthGuard } from '@/components/auth-guard'
import { LanguageProvider } from '@/lib/languageContext'
import { ClientLangWrapper } from '@/components/client-lang-wrapper'
import { BackendPrewarmer } from '@/components/BackendPrewarmer'
import { ThemeProvider } from '@/components/theme-provider'
import { AppThemeSync } from '@/components/theme-toggle'
import { TopBar } from '@/components/TopBar'
import { ReportButton } from '@/components/report/report-button'
import { Manrope, Noto_Sans_Devanagari } from 'next/font/google'
import localFont from 'next/font/local'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })
const devanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-devanagari', display: 'swap' })

// Self-hosted rather than loaded from Fontshare's CDN: the UI is packaged
// inside both apps and has to render with no network at a monument.
const clash = localFont({
  src: '../public/fonts/ClashDisplay-Variable.woff2',
  variable: '--font-display',
  display: 'swap',
  weight: '200 700',
})

export const metadata: Metadata = {
  title: 'Sanskriti AI | Discover India\'s Living Heritage',
  description: 'A mobile-first heritage app for scanning monuments, exploring maps, solving hunts, and tracking XP.',
  keywords: 'Indian heritage, monuments, AI guide, Taj Mahal, cultural tourism, UNESCO sites',
}

export const viewport: Viewport = {
  themeColor: '#F9F9FA',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Pinch-zoom is the clearest tell that a packaged app is a web view, and a
  // zoomed layout breaks the fixed bottom navigation. Android already refuses
  // it at the shell (`setSupportZoom(false)`); WKWebView honours these limits
  // unless `ignoresViewportScaleLimits` is set, which the iOS shell does not.
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${clash.variable} ${devanagari.variable}`} suppressHydrationWarning>
      <body className="overflow-x-hidden bg-background font-sans text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <AppThemeSync />
          <BackendPrewarmer />
          <AuthProvider>
            <ReportButton />
            <AuthGuard>
              <LanguageProvider>
                <ClientLangWrapper />
                <UserProvider>
                  <TopBar />
                  <AppWrapper>
                    {children}
                  </AppWrapper>
                </UserProvider>
              </LanguageProvider>
            </AuthGuard>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
