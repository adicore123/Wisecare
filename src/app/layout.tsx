import type { Metadata, Viewport } from 'next';
import './globals.css';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import { THEME_PALETTES, paletteToCssVars } from '@/lib/theme';

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

// A static fallback is required: <meta name="theme-color"> cannot resolve var().
// The boot script and applyTheme() overwrite it with the active palette's base color.
export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/**
 * Pre-paint theme application. Embeds the palette→CSS-var table (same source as
 * applyTheme) and re-applies the stored theme before first paint, so pages open
 * already themed instead of flashing the default palette until a component calls
 * applyTheme(). Runs synchronously as the first element of <body>.
 */
const THEME_BOOT_DATA: Record<string, Record<string, string>> = Object.fromEntries(
  THEME_PALETTES.map(p => [p.id, paletteToCssVars(p)])
);
const themeBootScript = `(function(){try{var T=${JSON.stringify(THEME_BOOT_DATA)};var v=T[localStorage.getItem('wisecare_theme')]||T.sage;for(var k in v)document.documentElement.style.setProperty(k,v[k]);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',v['--primary']);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        {children}
        <PWAInstallBanner />
      </body>
    </html>
  );
}
