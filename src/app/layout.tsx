import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { MobileTabBar } from '@/components/MobileTabBar';
import { AiTutor } from '@/components/AiTutor';
import { PwaRegister } from '@/components/PwaRegister';
import { getDb } from '@/db';
import { getSettings } from '@/lib/cms';

export const metadata: Metadata = {
  title: {
    default: 'Solai — The Tamil Learning Garden',
    template: '%s · Solai',
  },
  description:
    'Learn Tamil through structured courses, live workshops, an AI Tamil tutor and a warm community — from your very first அ to confident conversation.',
  applicationName: 'Solai',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Solai' },
  openGraph: {
    title: 'Solai — The Tamil Learning Garden',
    description: 'Structured courses, live workshops, an AI tutor and a community for learning Tamil.',
    type: 'website',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#060913',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Warm the DB (schema + first-boot seed) at build/server start, outside render.
  try {
    getDb();
  } catch (e) {
    console.error('[boot] database init failed', e);
  }
  const settings = getSettings();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Tamil:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg">
          Skip to content
        </a>
        <SiteHeader settings={settings} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <MobileTabBar />
        {settings.ai_tutor_enabled !== false && <AiTutor />}
        <PwaRegister />
      </body>
    </html>
  );
}
