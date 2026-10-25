'use client';

import { motion } from 'motion/react';
import { CircleText, Leaf } from '@/components/brand/decor';
import { DivineWoman } from '@/components/brand/divine-woman';
import { CherryMark } from '@/components/brand/logo';
import { LandingCta } from '@/components/landing/landing-cta';
import { useIntroDelay } from '@/components/motion/intro-loader';
import { BlurWords } from '@/components/motion/reveal';

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const wait = useIntroDelay();
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 24, filter: 'blur(8px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.9, ease: EASE, delay: wait + delay },
  });

  return (
    <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
      <div className="relative z-10">
        <motion.p {...rise(0)} className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-paper/70 px-4 py-1.5 text-sm font-medium backdrop-blur">
          <Leaf className="size-4" /> Women’s health, made for India
        </motion.p>
        <BlurWords as="h1" text="Your body is *divine.* Let’s decode it." delay={wait + 0.1} className="text-[clamp(3.1rem,7.4vw,6.2rem)] leading-[0.98] font-medium tracking-tight" />
        <motion.p {...rise(0.7)} className="mt-7 max-w-xl text-lg text-ink-soft sm:text-xl">
          Track your cycle, log symptoms in Hinglish, decode lab reports and walk into your doctor’s office with real evidence. Free, private and kind.
        </motion.p>
        <motion.div {...rise(0.85)} className="mt-9">
          <LandingCta />
        </motion.div>
        <motion.p {...rise(1)} className="mt-5 text-sm text-ink-soft">
          No email · No ads · Delete everything, anytime
        </motion.p>
      </div>

      <motion.div
        className="relative mx-auto w-full max-w-[460px]"
        initial={{ opacity: 0, scale: 0.94, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1.3, ease: EASE, delay: wait + 0.2 }}
      >
        <DivineWoman className="w-full" />

        <CircleText text="track ✺ decode ✺ glow ✺ repeat ✺ " className="absolute -bottom-4 -left-3 size-28 text-olive-deep sm:-left-8 sm:size-32">
          <span className="grid size-14 place-items-center rounded-full bg-paper shadow-lift">
            <CherryMark className="size-9" />
          </span>
        </CircleText>

        <motion.div {...rise(1.1)} className="absolute top-[34%] -right-4 w-56 rounded-2xl border border-line bg-paper/90 p-3 shadow-lift-lg backdrop-blur sm:-right-16">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-soft uppercase">Today · day 14</p>
          <p className="font-display text-lg leading-tight">Main Character Era ✨</p>
          <p className="mt-1 text-xs text-ink-soft">Next period in 14 days · 82% sure</p>
        </motion.div>

        <motion.div {...rise(1.3)} className="absolute right-4 -bottom-6 w-56 space-y-1.5 sm:-right-6">
          <p className="ml-auto w-fit rounded-2xl rounded-br-md bg-ink px-3 py-2 text-xs text-cream">Aaj bahut cramps hain, 7/10 😩</p>
          <p className="w-fit rounded-2xl rounded-bl-md border border-line bg-paper px-3 py-2 text-xs shadow-lift">Logged it ✅ Hot water bag + ibuprofen early helps most.</p>
        </motion.div>
      </motion.div>
    </section>
  );
}
