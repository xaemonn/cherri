import { INDIA_HELPLINES, MYTHS, verdictStyles } from '@cherri/shared';
import { FileText, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Sprig, SunRays } from '@/components/brand/decor';
import { Logo } from '@/components/brand/logo';
import { Eras } from '@/components/landing/eras';
import { FeatureArches } from '@/components/landing/feature-arches';
import { Hero } from '@/components/landing/hero';
import { LandingCta, NavCta } from '@/components/landing/landing-cta';
import { Lantern } from '@/components/landing/lantern';
import { MoonSteps } from '@/components/landing/moon-steps';
import { BlurWords, InView, RiseLetters } from '@/components/motion/reveal';
import { SmoothScroll } from '@/components/motion/smooth-scroll';

const RIBBON = ['cycle tracking', 'hinglish AI', 'lab decoder', 'pattern radar', 'doctor reports', 'health checks', 'myth busting'];

const PRIVACY = [
  { icon: Lock, title: 'Encrypted', text: 'Notes, chats and shared reports are encrypted before they’re stored.' },
  { icon: ShieldCheck, title: 'No ads, ever', text: 'Your health data is never sold or used for advertising.' },
  { icon: FileText, title: 'AI sees summaries', text: 'Phone numbers and emails are removed before any AI is involved.' },
  { icon: Trash2, title: 'Delete anytime', text: 'Export everything, or erase it for good in one tap.' },
];

function Ribbon({ className, reverse = false }: { className?: string; reverse?: boolean }) {
  const words = [...RIBBON, ...RIBBON];
  return (
    <div className={`overflow-hidden py-4 ${className}`}>
      <div className={`flex w-max gap-8 ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}>
        {words.map((w, i) => (
          <span key={i} className="flex items-center gap-8 font-display text-2xl whitespace-nowrap italic sm:text-3xl">
            {w} <span className="not-italic">✺</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  // Each row repeats its half twice so the marquee loops seamlessly.
  const half = Math.ceil(MYTHS.length / 2);
  const rows = [MYTHS.slice(0, half), MYTHS.slice(half)].map((row) => [...row, ...row]);

  return (
    <SmoothScroll>
      <div className="overflow-x-clip">
        <header className="sticky top-3 z-40 px-3 sm:px-6">
          <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-line bg-paper/75 py-2 pr-2 pl-5 shadow-lift backdrop-blur-md">
            <Logo />
            <div className="hidden items-center gap-8 text-sm font-medium text-ink-soft md:flex">
              <a href="#features" className="transition-colors hover:text-ink">Features</a>
              <a href="#how" className="transition-colors hover:text-ink">How it works</a>
              <a href="#privacy" className="transition-colors hover:text-ink">Privacy</a>
            </div>
            <NavCta />
          </nav>
        </header>

        <Hero />

        {/* Two crossed ribbons */}
        <section className="relative py-14" aria-label="What Cherri does">
          <Ribbon className="relative z-10 -rotate-2 bg-olive-deep text-cream shadow-lift-lg" />
          <Ribbon className="absolute inset-x-0 top-1/2 -translate-y-1/2 rotate-2 bg-ochre-soft text-ink" reverse />
        </section>

        <Lantern />

        <MoonSteps />

        <FeatureArches />

        <Eras />

        {/* Myth rows, drifting in opposite directions */}
        <section className="py-20" aria-label="Period myths Cherri busts">
          <div className="mx-auto mb-10 max-w-6xl px-5 sm:px-8">
            <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-olive-deep uppercase">Myth or fact?</p>
            <BlurWords text="Dadi said it. The internet said it. *Science says…*" className="max-w-3xl text-[clamp(2.2rem,5vw,4rem)] leading-[1.02] font-medium" />
          </div>
          {rows.map((row, r) => (
            <div key={r} className="group overflow-hidden py-2">
              <div className={`flex w-max gap-3 group-hover:[animation-play-state:paused] ${r ? 'animate-marquee-reverse' : 'animate-marquee'}`}>
                {row.map((m, i) => (
                  <div key={`${m.id}-${i}`} className="flex w-80 shrink-0 items-center gap-3 rounded-full border border-line bg-paper px-4 py-3 shadow-lift">
                    <span className="rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" style={{ background: verdictStyles[m.verdict].bg, color: verdictStyles[m.verdict].ink }}>
                      {verdictStyles[m.verdict].emoji} {verdictStyles[m.verdict].label}
                    </span>
                    <span className="line-clamp-2 text-sm">{m.claim}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Privacy */}
        <section id="privacy" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div className="relative">
              <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-olive-deep uppercase">Privacy</p>
              <BlurWords text="Your data. *Your rules.*" className="text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[1.02] font-medium" />
              <p className="mt-5 max-w-md text-lg text-ink-soft">Period data is personal. Cherri is built so it stays that way, and is designed around India’s DPDP Act.</p>
              <Sprig className="mt-8 hidden size-40 animate-sway lg:block" />
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
        <section className="relative mx-3 mb-6 overflow-hidden rounded-[44px] bg-forest px-5 pt-24 pb-16 text-center text-cream sm:mx-6">
          <SunRays className="absolute -top-24 left-1/2 size-120 -translate-x-1/2 animate-spin-slow text-ochre/25" count={24} spread={360} inner={30} outer={48} width={2} />
          <p className="relative text-xs font-semibold tracking-[0.3em] text-cream/60 uppercase">Meet your body’s new best friend</p>
          <h2 className="relative mt-4 font-display text-[clamp(5rem,22vw,17rem)] leading-[0.85] font-medium tracking-tight text-ochre-soft">
            <RiseLetters text="cherri" stagger={0.08} />
          </h2>
          <div className="relative mt-10 flex justify-center">
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
            Made with 🍒 by Team Goodies ·{' '}
            <Link href="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </p>
        </footer>
      </div>
    </SmoothScroll>
  );
}
