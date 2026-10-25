'use client';

import { ArrowLeft, Check, Download, MonitorSmartphone, Share, Smartphone, SquarePlus, Terminal } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Logo } from '@/components/brand/logo';
import { ChatScreen, PhoneFrame, TodayScreen } from '@/components/landing/phone-mockups';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const noop = () => () => {};
const useOrigin = () => useSyncExternalStore(noop, () => window.location.origin, () => '');
const usePlatform = () =>
  useSyncExternalStore(
    noop,
    () => (/iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : 'desktop'),
    () => 'desktop',
  );

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-olive-deep font-display text-lg text-cream">{n}</span>
      <div className="pt-1">
        <p className="font-semibold">{title}</p>
        <div className="mt-0.5 text-[15px] text-ink-soft">{children}</div>
      </div>
    </li>
  );
}

/** Opens Cherri on a phone: scan, install to the home screen, or try the native preview with Expo Go. */
export default function GetTheAppPage() {
  const origin = useOrigin();
  const platform = usePlatform();
  const [qr, setQr] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [tab, setTab] = useState<'android' | 'ios'>('android');
  const shownTab = platform === 'ios' ? 'ios' : platform === 'android' ? 'android' : tab;

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    void QRCode.toDataURL(`${origin}/login`, { margin: 1, width: 360, color: { dark: '#4A2340', light: '#FFFCFB' } }).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [origin]);

  // Chrome on Android offers a one-tap install once the page qualifies.
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const localhost = /localhost|127\.0\.0\.1/.test(origin);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/">
          <Logo />
        </Link>
        <ButtonLink href="/" variant="ghost" size="sm">
          <ArrowLeft className="size-4" /> Back to home
        </ButtonLink>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section className="grid items-center gap-10 py-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-olive-deep uppercase">Get the app</p>
            <h1 className="text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02] font-medium">
              Cherri on your phone, <span className="accent-italic text-olive-deep">in under a minute.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              Cherri installs straight from your browser, with its own icon on your home screen and no app-store download. Your account, logs and reports are the same on
              the website and the app.
            </p>
            {prompt && !installed && (
              <Button
                variant="olive"
                size="lg"
                className="mt-7"
                onClick={async () => {
                  await prompt.prompt();
                  if ((await prompt.userChoice).outcome === 'accepted') setInstalled(true);
                  setPrompt(null);
                }}
              >
                <Download className="size-5" /> Install Cherri now
              </Button>
            )}
            {installed && (
              <p className="mt-7 inline-flex items-center gap-2 rounded-full bg-olive-soft px-4 py-2 font-semibold text-olive-deep">
                <Check className="size-5" /> Installed. Look for the Cherri icon on your home screen.
              </p>
            )}
          </div>
          <div className="relative mx-auto flex h-[460px] w-full max-w-md items-center justify-center">
            <PhoneFrame label="Cherri home screen" className="absolute left-0 -rotate-6 scale-90 opacity-90">
              <TodayScreen />
            </PhoneFrame>
            <PhoneFrame label="Doctor chat" className="relative z-10 translate-x-10 rotate-3">
              <ChatScreen />
            </PhoneFrame>
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Card sticker className="text-center">
            <p className="flex items-center justify-center gap-2 font-semibold">
              <MonitorSmartphone className="size-5 text-olive-deep" /> Step 1 · Open Cherri on your phone
            </p>
            <p className="mt-1 text-sm text-ink-soft">Point your phone camera at this code.</p>
            <div className="mx-auto mt-4 grid size-60 place-items-center rounded-3xl border border-line bg-paper p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URL, nothing for next/image to optimise */}
              {qr ? <img src={qr} alt={`QR code for ${origin}/login`} className="size-full" /> : <span className="text-sm text-ink-faint">Making your code…</span>}
            </div>
            <p className="mt-3 font-mono text-sm break-all">{origin ? `${origin}/login` : ''}</p>
            {localhost && (
              <p className="mt-3 rounded-2xl bg-ochre-soft px-3 py-2 text-left text-xs text-ochre-deep">
                You’re on <strong>localhost</strong>, which a phone can’t open. Open this page using your computer’s Wi-Fi address instead (for example http://192.168.1.5:3100/app),
                with the phone on the same Wi-Fi.
              </p>
            )}
          </Card>

          <Card sticker>
            <p className="flex items-center gap-2 font-semibold">
              <Smartphone className="size-5 text-olive-deep" /> Step 2 · Add it to your home screen
            </p>
            <div role="tablist" className="mt-4 inline-flex rounded-full bg-cream-deep p-1">
              {(['android', 'ios'] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={shownTab === t}
                  onClick={() => setTab(t)}
                  className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition-colors', shownTab === t ? 'bg-paper shadow-lift' : 'text-ink-soft')}
                >
                  {t === 'android' ? 'Android' : 'iPhone'}
                </button>
              ))}
            </div>
            {shownTab === 'android' ? (
              <ol className="mt-5 space-y-4">
                <Step n={1} title="Open the link in Chrome">
                  Scan the code, or type the address above.
                </Step>
                <Step n={2} title="Tap ⋮ (top-right), then “Install app” or “Add to Home screen”">
                  Some phones show an “Install Cherri” banner at the bottom: tap it.
                </Step>
                <Step n={3} title="Tap Install">The Cherri icon appears on your home screen and opens full-screen, like any app.</Step>
                <Step n={4} title="Log in">Use your Cherri email and password, or the demo account demo@cherri.app / cherri-demo-2026.</Step>
              </ol>
            ) : (
              <ol className="mt-5 space-y-4">
                <Step n={1} title="Open the link in Safari">
                  Scan the code with the Camera app. It has to be Safari for this step.
                </Step>
                <Step n={2} title="Tap the Share button">
                  <span className="inline-flex items-center gap-1">
                    The square with an arrow <Share className="inline size-4" /> at the bottom of the screen.
                  </span>
                </Step>
                <Step n={3} title="Choose “Add to Home Screen”">
                  <span className="inline-flex items-center gap-1">
                    Scroll down the menu to find it <SquarePlus className="inline size-4" />, then tap Add.
                  </span>
                </Step>
                <Step n={4} title="Open Cherri from your home screen and log in">It opens full-screen, without Safari’s address bar.</Step>
              </ol>
            )}
            <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft">
              Tip for shared phones: set a 4-digit PIN in <strong>Settings → Screen shield</strong>, so Quick exit locks Cherri until you return.
            </p>
          </Card>
        </div>

        <Card tone="dusk" className="mt-6">
          <p className="flex items-center gap-2 font-semibold">
            <Terminal className="size-5" /> For developers and judges: the native app preview (Expo Go)
          </p>
          <p className="mt-1 text-sm">
            Cherri also has a React Native app. It isn’t on the Play Store or App Store yet; you can run it from this project with Expo Go:
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
            <li>Install <strong>Expo Go</strong> from the Play Store or App Store.</li>
            <li>
              On the computer running Cherri, start the app: <code className="rounded bg-paper px-1.5 py-0.5">pnpm dev:mobile</code> (with{' '}
              <code className="rounded bg-paper px-1.5 py-0.5">EXPO_PUBLIC_API_URL=http://&lt;your-computer-ip&gt;:4100/api</code>).
            </li>
            <li>Scan the QR code that appears in the terminal with Expo Go (Android) or the Camera app (iPhone).</li>
            <li>Log in with the same account as the website.</li>
          </ol>
        </Card>
      </main>
    </div>
  );
}
