'use client';

import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const EASE = [0.22, 1, 0.36, 1] as const;

/** "Your body is *divine.*" → words, with *starred* words marked as accents. */
function parseWords(text: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const accent = raw.startsWith('*');
      return { word: raw.replace(/\*/g, ''), accent };
    });
}

/** Headline whose words blur in one after another when scrolled into view (after Neutomni). */
export function BlurWords({
  text,
  className,
  accentClassName = 'accent-italic text-olive-deep',
  delay = 0,
  stagger = 0.07,
  as: Tag = 'h2',
}: {
  text: string;
  className?: string;
  accentClassName?: string;
  delay?: number;
  stagger?: number;
  as?: 'h1' | 'h2' | 'h3' | 'p';
}) {
  const MotionTag = motion[Tag];
  return (
    <MotionTag className={className} initial="hidden" whileInView="shown" viewport={{ once: true, amount: 0.4 }} aria-label={text.replace(/\*/g, '')}>
      {parseWords(text).map(({ word, accent }, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className={cn('inline-block whitespace-pre', accent && accentClassName)}
          variants={{
            hidden: { opacity: 0, y: '0.35em', filter: 'blur(12px)' },
            shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: EASE, delay: delay + i * stagger } },
          }}
        >
          {word}
          {' '}
        </motion.span>
      ))}
    </MotionTag>
  );
}

/** Letters that rise up through an invisible floor, one by one. */
export function RiseLetters({ text, className, delay = 0, stagger = 0.06, once = true }: { text: string; className?: string; delay?: number; stagger?: number; once?: boolean }) {
  return (
    <motion.span className={cn('inline-flex overflow-hidden pb-[0.12em]', className)} initial="hidden" whileInView="shown" viewport={{ once, amount: 0.5 }} aria-label={text}>
      {[...text].map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="inline-block whitespace-pre"
          variants={{
            hidden: { y: '110%', rotate: 6 },
            shown: { y: 0, rotate: 0, transition: { duration: 1, ease: EASE, delay: delay + i * stagger } },
          }}
        >
          {ch}
        </motion.span>
      ))}
    </motion.span>
  );
}

/** Pulls its child gently towards the pointer, then springs back. */
export function Magnetic({ children, strength = 0.35, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  return (
    <motion.span
      ref={ref}
      className={cn('inline-block', className)}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== 'mouse' || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz·';

/** Text that dissolves into noise and re-forms whenever `text` changes (after See What Eye See). */
export function ScrambleText({ text, className, duration = 900 }: { text: string; className?: string; duration?: number }) {
  const [shown, setShown] = useState(text);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const start = performance.now();
    const order = [...text].map(() => Math.random());
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(
        [...text]
          .map((ch, i) => {
            if (ch === ' ' || order[i]! < t) return ch;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join(''),
      );
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, duration, reduce]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{reduce ? text : shown}</span>
    </span>
  );
}

/** Fades and lifts its children in when they enter the viewport. */
export function InView({ children, className, delay = 0, y = 28 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
