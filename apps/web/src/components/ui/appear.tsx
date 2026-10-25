'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const RING = {
  danger: 'rgb(180 35 24 / 0.55)',
  warning: 'rgb(217 170 85 / 0.7)',
  info: 'rgb(74 90 43 / 0.5)',
} as const;

/**
 * Wraps a card that appears (or changes) because of something she just did. It slides in, pulses
 * a ring three times and carries a "New" tag for a few seconds, so it never reads as old content.
 * Give it a `key` that changes with the content to replay the effect.
 */
export function Appear({
  children,
  tone = 'info',
  className,
  label = 'New',
}: {
  children: ReactNode;
  tone?: keyof typeof RING;
  className?: string;
  label?: string | null;
}) {
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className={cn('relative rounded-card animate-attention', className)}
      style={{ ['--attention' as string]: RING[tone] }}
    >
      {label && (
        <span
          className={cn(
            'pointer-events-none absolute -top-2.5 right-4 z-10 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase shadow-lift [animation:badge-fade_5s_forwards]',
            tone === 'danger' ? 'bg-[#B42318]' : tone === 'warning' ? 'bg-ochre-deep' : 'bg-olive-deep',
          )}
        >
          {label}
        </span>
      )}
      {children}
    </motion.div>
  );
}
