import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import { IntroLoader } from '@/components/motion/intro-loader';
import { INTRO_SCRIPT } from '@/components/motion/intro-script';
import { ScrollProgress } from '@/components/motion/scroll-progress';
import { SHIELD_SCRIPT } from '@/components/safety/shield-script';
import { Providers } from './providers';
import './globals.css';

const display = Plus_Jakarta_Sans({ variable: '--font-jakarta', subsets: ['latin'] });
const body = Inter({ variable: '--font-inter', subsets: ['latin'] });
const devanagari = Noto_Sans_Devanagari({
  variable: '--font-devanagari',
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cherri · your body, decoded',
  description:
    'Ask a gynaecologist, track your cycle, measure heavy periods, decode lab reports and walk into your doctor’s office with real evidence. Free, private, made for India.',
  appleWebApp: { capable: true, title: 'Cherri', statusBarStyle: 'default' },
  icons: { apple: '/brand/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#F0F6FC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} ${devanagari.variable} antialiased`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: SHIELD_SCRIPT + INTRO_SCRIPT }} />
        <IntroLoader />
        <Providers>{children}</Providers>
        <ScrollProgress />
      </body>
    </html>
  );
}
