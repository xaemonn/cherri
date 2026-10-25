'use client';

import { CalendarHeart, Droplets, Stethoscope } from 'lucide-react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

const CHIPS = [
  { icon: CalendarHeart, title: 'Day 14', text: 'Fertile window', className: 'top-[12%] -left-2 sm:-left-10', delay: 0.5 },
  { icon: Droplets, title: 'PBAC 62', text: 'Within normal range', className: 'top-[46%] -right-2 sm:-right-12', delay: 0.7 },
  { icon: Stethoscope, title: 'Dr. Rao replied', text: 'Start iron, recheck in 8 weeks', className: 'bottom-[8%] left-0 sm:-left-6', delay: 0.9 },
];

/**
 * The hero image: the brand's gold line-art emblem inside an arch, on a soft gradient glow,
 * with three glass cards showing what Cherri actually does.
 */
export function HeroVisual({ className, delay = 0, chips = true }: { className?: string; delay?: number; chips?: boolean }) {
  // The watercolour portrait lives at public/brand/hero-woman.png; until it's there, show the emblem.
  const [painting, setPainting] = useState(true);
  return (
    <div className={cn('relative mx-auto aspect-[4/5] w-full max-w-[440px]', className)}>
      {/* Gradient glow */}
      <div
        aria-hidden="true"
        className="absolute inset-[-8%] rounded-full opacity-90 blur-2xl"
        style={{
          background:
            'radial-gradient(40% 40% at 30% 30%, #EFEBFA 0%, transparent 70%), radial-gradient(45% 45% at 75% 40%, #F8E6EE 0%, transparent 70%), radial-gradient(50% 45% at 50% 85%, #F8EED8 0%, transparent 70%)',
        }}
      />
      {/* Orbit ring */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-[2%] rounded-full border border-ochre/40"
        initial={{ opacity: 0, rotate: -20 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 1.4, ease: EASE, delay }}
      >
        <span className="absolute top-[6%] left-[22%] size-2.5 rounded-full bg-olive" />
        <span className="absolute right-[4%] bottom-[30%] size-2 rounded-full bg-clay" />
      </motion.div>

      {/* Arch with the emblem */}
      <motion.div
        className="absolute inset-x-[12%] top-[8%] bottom-[6%] overflow-hidden rounded-t-full rounded-b-[36px] border border-white/60 shadow-lift-lg"
        style={{ background: 'linear-gradient(180deg, #FFFCFB 0%, #F8E6EE 65%, #EFEBFA 100%)' }}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.1, ease: EASE, delay }}
      >
        {painting ? (
          <Image
            src="/brand/hero-woman.png"
            alt="Painted portrait of a woman with flowers and leaves in her hair"
            fill
            priority
            sizes="(min-width: 1024px) 440px, 90vw"
            onError={() => setPainting(false)}
            className="object-cover object-top"
          />
        ) : (
          <Image
            src="/brand/cherri-emblem.png"
            alt="Two women in gold line art, the Cherri emblem"
            width={307}
            height={240}
            priority
            className="absolute top-1/2 left-1/2 w-[86%] max-w-none -translate-x-1/2 -translate-y-[46%]"
          />
        )}
      </motion.div>

      {chips &&
        CHIPS.map((chip) => (
          <motion.div
            key={chip.title}
            className={cn('absolute z-10 flex items-center gap-3 rounded-2xl border border-white/70 bg-paper/80 py-2.5 pr-4 pl-2.5 shadow-lift-lg backdrop-blur-md', chip.className)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{ opacity: { duration: 0.6, delay: delay + chip.delay }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: delay + chip.delay } }}
          >
            <span className="grid size-9 place-items-center rounded-xl bg-olive-soft text-olive-deep">
              <chip.icon className="size-[18px]" strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm leading-tight font-semibold">{chip.title}</span>
              <span className="block text-xs text-ink-soft">{chip.text}</span>
            </span>
          </motion.div>
        ))}
    </div>
  );
}
