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
import { TopBar } from '@/components/TopBar'

export const metadata: Metadata = {
  title: 'Sanskriti AI | Discover India\'s Living Heritage',
  description: 'A mobile-first heritage app for scanning monuments, exploring maps, solving hunts, and tracking XP.',
  keywords: 'Indian heritage, monuments, AI guide, Taj Mahal, cultural tourism, UNESCO sites',
}

export const viewport: Viewport = {
  themeColor: '#08070F',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap" />
      </head>
      <body className="font-sans antialiased overflow-x-hidden bg-[#050816] text-[#F5E6D3]">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <BackendPrewarmer />
          <AuthProvider>
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
