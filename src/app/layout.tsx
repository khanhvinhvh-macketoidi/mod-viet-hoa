import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Noto_Serif } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicFooterLinks from '@/components/public/PublicFooterLinks';
import PublicStructuredData from '@/components/public/PublicStructuredData';
import ThemeScript from '@/lib/theme/ThemeScript';
import LiveNotificationToaster from '@/components/notifications/LiveNotificationToaster';
import WelcomeGate from '@/components/beta/WelcomeGate';
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo';

const bodyFont = Be_Vietnam_Pro({
  variable: '--font-body',
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const displayFont = Noto_Serif({
  variable: '--font-display',
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  weight: ['500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} – Mod và bản Việt hóa game`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'games',
  keywords: [
    'mod game',
    'Việt hóa game',
    'thư viện mod',
    'mod Việt Nam',
    'Quỷ Cốc Bát Hoang',
    'tu tiên',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: '/',
    siteName: SITE_NAME,
    title: `${SITE_NAME} – Mod và bản Việt hóa game`,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} – Mod và bản Việt hóa game`,
    description: DEFAULT_DESCRIPTION,
    images: ['/twitter-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  manifest: '/manifest.webmanifest',
  referrer: 'strict-origin-when-cross-origin',
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#06101d',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={`${bodyFont.variable} ${displayFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        <PublicStructuredData />
      </head>

      <body>
        <div className="iv2-shell">
          <div className="iv2-stars" aria-hidden="true" />
          <div className="iv2-mist" aria-hidden="true" />
          <LiveNotificationToaster />
          <WelcomeGate />
          <Header />
          <main className="relative z-10">{children}</main>
          <Footer />
          <PublicFooterLinks />
        </div>
      </body>
    </html>
  );
}
