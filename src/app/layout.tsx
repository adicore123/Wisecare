import type { Metadata, Viewport } from 'next';
import './globals.css';
import PWAInstallBanner from '@/components/PWAInstallBanner';

export const metadata: Metadata = {
  title: 'WiseCare | מערכת CRM ופורטל מטופלים חכם',
  description: 'WiseCare - מערכת CRM ופורטל מטופלים חכם לפסיכולוגים ומטפלים רגשיים',
  icons: {
    icon: '/pwa-icon.svg',
    apple: '/pwa-icon.svg',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WiseCare',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-[#f4f9f8] text-[#1d2a30] font-sans antialiased">
        {children}
        <PWAInstallBanner />
      </body>
    </html>
  );
}
