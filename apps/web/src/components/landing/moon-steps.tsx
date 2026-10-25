'use client';

import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { useRef } from 'react';
import { BlurWords } from '@/components/motion/reveal';
import { moonLitPath } from '@/lib/svg';

const STEPS = [
  { n: '01', title: 'Log', accent: 'in seconds', text: 'Tap a few options, or just tell Cherri how you feel, in Hinglish if you like.', bg: '#4A2340', h: 'md:h-[430px]' },
  { n: '02', title: 'Cherri', accent: 'decodes', text: 'Predictions that learn, Pattern Radar and red flags, built on clinical guidelines.', bg: '#8A3E66', h: 'md:h-[390px]' },
  { n: '03', title: 'Check', accent: 'early', text: 'PCOS, endometriosis, PMDD, anaemia and thyroid checks, pre-filled from your logs.', bg: '#74461F', h: 'md:h-[350px]' },
  { n: '04', title: 'Walk in', accent: 'with evidence', text: 'Share one clinical page by QR. Your doctor sees months of data in a minute.', bg: '#2E2230', h: 'md:h-[310px]' },
];

const R = 20;

function Scallops() {
  return (
    <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="h-5 w-full" aria-hidden="true">
      <path d="M0 18q25-22 50 0t50 0 50 0 50 0" fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Four steps as rising cards, with a moon rolling across them as you scroll (after Neutomni's process). */
export function MoonSteps() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.35'] });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });
  const left = useTransform(p, (v) => `calc(${v * 100}% - ${v * 64}px)`);
  const rotate = useTransform(p, (v) => v * 540);
  const d = useTransform(p, (v) => moonLitPath(Math.min(0.999, Math.max(0.001, v)), R));

  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
      <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-olive-deep uppercase">How it works</p>
      <BlurWords text="From *“I think”* to *“here’s my data”.*" className="max-w-3xl text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[1.02] font-medium" />

      <div ref={ref} className="relative mt-14">
        <div className="grid gap-4 md:grid-cols-4 md:items-end">
          {STEPS.map((s, i) => (
            <motion.article
              key={s.n}
              className={`relative flex min-h-[260px] flex-col rounded-[28px] p-6 text-cream ${s.h}`}
              style={{ background: s.bg }}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
            >
              <span className="font-mono text-xs text-cream/60">{s.n}</span>
              <div className="mt-auto text-cream/25">
                <Scallops />
              </div>
              <h3 className="mt-5 text-3xl leading-tight font-medium">
                {s.title} <span className="accent-italic text-ochre">{s.accent}</span>
              </h3>
              <p className="mt-2 text-sm text-cream/75">{s.text}</p>
            </motion.article>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-[200px] hidden md:block" aria-hidden="true">
          <div className="border-t border-dashed border-cream/40" />
          <motion.div className="absolute top-0 size-16 -translate-y-1/2" style={{ left }}>
            <svg viewBox="-24 -24 48 48" className="size-full drop-shadow-[0_8px_16px_rgb(0_0_0/0.35)]">
              {/* the dashed ring rolls; the moon stays upright so its phase reads clearly */}
              <motion.circle r={R + 3} fill="none" stroke="#F3E6C6" strokeOpacity=".6" strokeWidth="1.2" strokeDasharray="2 3" style={{ rotate }} />
              <circle r={R} fill="#46362A" />
              <motion.path d={d} fill="#F3E6C6" />
            </svg>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
