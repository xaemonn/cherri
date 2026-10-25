import { INDIA_HELPLINES } from '@cherri/shared';
import { FileText, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { FeatureDirectory } from '@/components/landing/feature-directory';
import { Hero } from '@/components/landing/hero';
import { LandingCta, NavCta } from '@/components/landing/landing-cta';
import { MobileShowcase } from '@/components/landing/mobile-showcase';
import { MoonSteps } from '@/components/landing/moon-steps';
import { InView } from '@/components/motion/reveal';
import { SmoothScroll } from '@/components/motion/smooth-scroll';

const PRIVACY = [
  { icon: Lock, title: 'Encrypted', text: 'Notes, chats and shared reports are encrypted before they’re stored.' },
  { icon: ShieldCheck, title: 'No ads, ever', text: 'Your health data is never sold or used for advertising.' },
  { icon: FileText, title: 'AI sees summaries', text: 'Phone numbers and emails are removed before any AI is involved.' },
  { icon: Trash2, title: 'Delete anytime', text: 'Export everything, or erase it for good in one tap.' },
];

export default function LandingPage() {
  return (
    <SmoothScroll>
      <div className="overflow-x-clip">
        <header className="sticky top-3 z-40 px-3 sm:px-6">
          <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-line bg-paper/75 py-2 pr-2 pl-5 shadow-lift backdrop-blur-md">
            <Logo />
            <div className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
              <a href="#features" className="transition-colors hover:text-ink">Features</a>
              <a href="#app" className="transition-colors hover:text-ink">Mobile app</a>
              <a href="#how" className="transition-colors hover:text-ink">How it works</a>
              <a href="#privacy" className="transition-colors hover:text-ink">Privacy</a>
            </div>
            <NavCta />
          </nav>
        </header>

        <Hero />


        <FeatureDirectory />

        <MobileShowcase />

        <MoonSteps />

        {/* Privacy */}
        <section id="privacy" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-olive-deep uppercase">Privacy</p>
              <h2 className="text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.05] font-semibold">
                Your data. <span className="text-olive-deep">Your rules.</span>
              </h2>
              <p className="mt-5 max-w-md text-lg text-ink-soft">Built around India’s DPDP Act.</p>
            </div>
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {PRIVACY.map((item, i) => (
                <InView key={item.title} delay={i * 0.08}>
                  <span className="grid size-12 place-items-center rounded-full bg-olive-soft text-olive-deep">
                    <item.icon className="size-5" strokeWidth={1.7} />
                  </span>
                  <h3 className="mt-4 text-xl font-medium">{item.title}</h3>
                  <p className="mt-1 text-ink-soft">{item.text}</p>
                </InView>
              ))}
            </div>
          </div>
        </section>

        {/* Final call */}
        <section className="relative mx-3 mb-6 overflow-hidden rounded-[36px] bg-forest px-5 py-20 text-center text-cream sm:mx-6">
          <Logo light size="lg" className="justify-center" />
          <h2 className="mt-8 text-[clamp(2rem,4.5vw,3.2rem)] leading-tight font-semibold">Start in under a minute.</h2>
          <div className="relative mt-8 flex justify-center">
            <LandingCta light />
          </div>
        </section>

        <footer className="mx-auto max-w-6xl px-5 pt-6 pb-12 text-sm text-ink-soft sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-8 border-t border-line pt-8">
            <div>
              <Logo />
              <p className="mt-3 max-w-sm">Cherri gives health information, not a diagnosis. Always talk to a qualified doctor about your symptoms.</p>
            </div>
            <div>
              <p className="mb-2 font-semibold text-ink">Need help now?</p>
              <ul className="space-y-1">
                {INDIA_HELPLINES.map((h) => (
                  <li key={h.number}>
                    <a href={`tel:${h.number}`} className="hover:text-ink">
                      <strong>{h.number}</strong> · {h.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-8">
            Made by Team Goodies ·{' '}
            <Link href="/login" className="underline underline-offset-4">
              Log in
            </Link>{' '}
            ·{' '}
            <Link href="/app" className="underline underline-offset-4">
              Get the app
            </Link>
          </p>
        </footer>
      </div>
    </SmoothScroll>
  );
}
