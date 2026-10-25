import type { Metadata, Viewport } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import { CursorTrail } from '@/components/motion/cursor-trail';
import { IntroLoader } from '@/components/motion/intro-loader';
import { INTRO_SCRIPT } from '@/components/motion/intro-script';
import { ScrollProgress } from '@/components/motion/scroll-progress';
import { Providers } from './providers';
import './globals.css';

const display = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], axes: ['SOFT', 'WONK', 'opsz'], style: ['normal', 'italic'] });
const body = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cherri · your body, decoded',
  description:
    'Track your cycle, log symptoms in Hinglish, decode lab reports and walk into your doctor’s office with real evidence. Free, private, made for India.',
};

export const viewport: Viewport = {
  themeColor: '#F3EBDD',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} antialiased`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        <IntroLoader />
        <Providers>{children}</Providers>
        <CursorTrail />
        <ScrollProgress />
      </body>
    </html>
  );
}
