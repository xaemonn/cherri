'use client';

import { motion } from 'motion/react';
import { HeroVisual } from '@/components/landing/hero-visual';
import { LandingCta } from '@/components/landing/landing-cta';
import { useIntroDelay } from '@/components/motion/intro-loader';

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const wait = useIntroDelay();
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: EASE, delay: wait + delay },
  });

  return (
    <section className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pt-12 pb-24 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
      <div className="relative z-10">
        <motion.p {...rise(0)} className="mb-6 inline-flex items-center rounded-full border border-line bg-paper/70 px-4 py-1.5 text-sm font-medium text-ink-soft">
          Women’s health, made for India
        </motion.p>
        <motion.h1 {...rise(0.1)} className="text-[clamp(2.6rem,6vw,4.6rem)] leading-[1.04] font-semibold tracking-tight">
          Understand your body. <span className="text-olive-deep">Get real care.</span>
        </motion.h1>
        <motion.p {...rise(0.25)} className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
          Track your cycle, ask a gynaecologist and walk into the clinic with a report your doctor can use. Private, free and quick to hide.
        </motion.p>
        <motion.div {...rise(0.4)} className="mt-9">
          <LandingCta />
        </motion.div>
      </div>

      <HeroVisual delay={wait + 0.15} />
    </section>
  );
}
