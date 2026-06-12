import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const viewport = {
  themeColor: '#0F172A',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://pointstrack.in'),
  title: {
    default: 'PointsTrack — AICTE Activity Points, Digitized',
    template: '%s | PointsTrack',
  },
  description: 'PointsTrack helps engineering students automatically track their 100 AICTE Activity Points. Organizers publish events, students scan QR codes — points are awarded instantly.',
  keywords: ['AICTE points', 'engineering college', 'activity tracker', 'event management', 'student app'],
  authors: [{ name: 'PointsTrack' }],
  creator: 'PointsTrack',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://pointstrack.in',
    siteName: 'PointsTrack',
    title: 'PointsTrack — AICTE Activity Points, Digitized',
    description: 'Say goodbye to lost certificates and messy Excel sheets. Discover events, scan QR codes, and track your AICTE points from your smartphone.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PointsTrack',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PointsTrack — AICTE Activity Points, Digitized',
    description: 'Track your AICTE Activity Points with PointsTrack.',
  },
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased bg-slate-950 text-slate-50">
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
