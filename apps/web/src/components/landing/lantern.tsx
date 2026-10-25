'use client';

import { useMotionValueEvent, useScroll } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { ScrambleText } from '@/components/motion/reveal';
import { cn } from '@/lib/cn';

const LINES = [
  { text: 'You can still go to class.' },
  { text: 'You can still smile through the cramps.' },
  { text: 'You can still say “it’s normal”.' },
  { text: 'Until one day, you can’t.', accent: true },
  { text: '1 in 10 women live with endometriosis.', note: 'Most wait years for a diagnosis. · WHO' },
  { text: '57% of Indian women are anaemic.', note: 'Women aged 15–49 · NFHS-5' },
  { text: 'Cherri helps you notice early.', note: 'And walk into your doctor’s office with evidence.', accent: true },
];

const HIDDEN = [
  { w: 'cramps', x: 8, y: 14 },
  { w: '“it’s normal”', x: 64, y: 10 },
  { w: 'fatigue', x: 82, y: 32 },
  { w: 'heavy flow', x: 12, y: 40 },
  { w: 'PCOS', x: 44, y: 22 },
  { w: 'brain fog', x: 70, y: 56 },
  { w: 'skipped periods', x: 6, y: 70 },
  { w: '“just stress”', x: 52, y: 80 },
  { w: 'anaemia', x: 28, y: 86 },
  { w: 'hair fall', x: 86, y: 78 },
  { w: 'thyroid', x: 30, y: 58 },
  { w: 'back pain', x: 78, y: 18 },
  { w: 'bloating', x: 20, y: 26 },
  { w: 'mood swings', x: 58, y: 66 },
];

/**
 * Scroll-pinned story (after See What Eye See): lines dissolve into each other as you scroll,
 * while your cursor is a lantern that reveals the symptoms women are told to ignore.
 */
export function Lantern() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setIndex(Math.min(LINES.length - 1, Math.max(0, Math.floor(p * LINES.length))));
  });

  useEffect(() => {
    const el = stage.current!;
    let lastMove = 0;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--lx', `${e.clientX - r.left}px`);
      el.style.setProperty('--ly', `${e.clientY - r.top}px`);
      lastMove = performance.now();
    };
    // No pointer (phones) or an idle one: the lantern drifts on its own.
    const drift = (now: number) => {
      if (now - lastMove > 2500) {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--lx', `${r.width * (0.5 + 0.34 * Math.sin(now / 2400))}px`);
        el.style.setProperty('--ly', `${r.height * (0.5 + 0.3 * Math.sin(now / 1700))}px`);
      }
      frame = requestAnimationFrame(drift);
    };
    frame = requestAnimationFrame(drift);
    el.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
    };
  }, []);

  const line = LINES[index]!;
  return (
    <section ref={section} className="relative h-[420vh]" aria-label="Why Cherri exists">
      <div ref={stage} className="sticky top-0 h-svh overflow-hidden bg-ink text-cream" style={{ ['--lx' as string]: '50%', ['--ly' as string]: '50%' }}>
        {/* warm lantern glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle 320px at var(--lx) var(--ly), rgba(217,170,85,0.22), rgba(217,170,85,0.06) 45%, transparent 70%)' }}
        />
        {/* words only the lantern can reveal */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            maskImage: 'radial-gradient(circle 220px at var(--lx) var(--ly), #000 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(circle 220px at var(--lx) var(--ly), #000 30%, transparent 100%)',
          }}
        >
          {HIDDEN.map((h) => (
            <span key={h.w} className="absolute font-display text-2xl text-ochre/80 italic sm:text-4xl" style={{ left: `${h.x}%`, top: `${h.y}%` }}>
              {h.w}
            </span>
          ))}
        </div>

        <div className="relative grid h-full place-items-center px-6 text-center">
          <div className="max-w-4xl">
            <p className="mb-6 text-xs font-semibold tracking-[0.3em] text-cream/50 uppercase">
              <span className="pointer-coarse:hidden">Move your light around · </span>keep scrolling
            </p>
            <h2 className={cn('font-display text-[clamp(2.2rem,6vw,5rem)] leading-[1.02] font-medium', line.accent && 'accent-italic text-ochre')}>
              <ScrambleText text={line.text} />
            </h2>
            <p className="mt-6 min-h-7 text-lg text-cream/70">{line.note && <ScrambleText text={line.note} duration={700} />}</p>
          </div>
        </div>

        <div className="absolute top-1/2 left-4 flex -translate-y-1/2 flex-col gap-2 sm:left-8" aria-hidden="true">
          {LINES.map((l, i) => (
            <span key={l.text} className={cn('h-6 w-0.75 rounded-full transition-colors duration-500', i <= index ? 'bg-ochre' : 'bg-cream/15')} />
          ))}
        </div>
      </div>
    </section>
  );
}
