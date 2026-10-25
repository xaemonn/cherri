'use client';

import { SCREENINGS, type PatternInsight, type PatternWindow, type RedFlag } from '@cherri/shared';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/cn';

const WINDOW_LABELS: Record<PatternWindow, { label: string; color: string; ink: string }> = {
  MENSTRUAL: { label: 'During period', color: '#FBE4E7', ink: '#7A1E2E' },
  FOLLICULAR: { label: 'After period', color: '#F8E6EE', ink: '#8A3E66' },
  OVULATORY: { label: 'Around ovulation', color: '#F8EED8', ink: '#7A5A1E' },
  LUTEAL: { label: 'Second half', color: '#EFEBFA', ink: '#4F4486' },
  PREMENSTRUAL: { label: 'Week before', color: '#EFEBFA', ink: '#4F4486' },
};

/** One pattern: the phase it belongs to, how strong it is (as a meter), and one line. */
export function PatternCard({ pattern }: { pattern: PatternInsight; compact?: boolean }) {
  const window = WINDOW_LABELS[pattern.window];
  const share = pattern.cyclesObserved ? pattern.cyclesWithPattern / pattern.cyclesObserved : 0;
  return (
    <article className="flex h-full flex-col rounded-card border border-line bg-paper p-5">
      <span className="w-fit rounded-full px-3 py-1 text-xs font-semibold" style={{ background: window.color, color: window.ink }}>
        {window.label}
      </span>
      <h3 className="mt-3 text-base leading-snug font-semibold">{pattern.label}</h3>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-ink-soft">
          <span>
            In {pattern.cyclesWithPattern} of {pattern.cyclesObserved} cycles
          </span>
          {pattern.lift !== null && <span className="font-semibold text-ink">{pattern.lift}× more likely</span>}
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-deep">
          <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: window.ink }} />
        </div>
      </div>
      {pattern.hint?.screening && (
        <Link href={`/checks/${pattern.hint.screening}`} className="mt-4 text-sm font-semibold text-olive-deep hover:underline">
          Take the {SCREENINGS[pattern.hint.screening].title} →
        </Link>
      )}
    </article>
  );
}

const SEVERITY: Record<RedFlag['severity'], { dot: string; chip: string; label: string }> = {
  URGENT: { dot: 'bg-cherry', chip: 'bg-cherry text-white', label: 'Urgent' },
  WARNING: { dot: 'bg-ochre', chip: 'bg-ochre-soft text-ochre-deep', label: 'Check this' },
  INFO: { dot: 'bg-dusk', chip: 'bg-dusk-soft text-dusk-deep', label: 'Good to know' },
};

/** A flag as a single row; the explanation and next step open on tap. */
export function FlagRow({ flag, defaultOpen = false }: { flag: RedFlag; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const s = SEVERITY[flag.severity];
  return (
    <li className="border-b border-line last:border-0">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-cream/60">
        <span className={cn('size-2.5 shrink-0 rounded-full', s.dot)} />
        <span className="flex-1 font-medium">{flag.title}</span>
        <span className={cn('hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline', s.chip)}>{s.label}</span>
        <ChevronDown className={cn('size-4 text-ink-faint transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="grid gap-3 px-5 pb-5 pl-10 sm:grid-cols-2">
          <div className="rounded-2xl bg-cream p-4">
            <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">Why</p>
            <p className="mt-1 text-sm">{flag.detail}</p>
          </div>
          <div className="rounded-2xl bg-olive-soft p-4">
            <p className="text-xs font-semibold tracking-wide text-olive-deep uppercase">What to do</p>
            <p className="mt-1 text-sm">{flag.action}</p>
          </div>
        </div>
      )}
    </li>
  );
}

/** Kept for older callers: a flag as its own expandable card. */
export function FlagCard({ flag }: { flag: RedFlag }) {
  return (
    <ul className="overflow-hidden rounded-card border border-line bg-paper">
      <FlagRow flag={flag} />
    </ul>
  );
}

export function StatTile({ label, value, hint, icon: Icon, tone = 'bg-paper' }: { label: string; value: string; hint?: string; icon?: LucideIcon; tone?: string }) {
  return (
    <div className={cn('rounded-card border border-line p-4', tone)}>
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {Icon && <Icon className="size-4" strokeWidth={1.8} />}
        {label}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}
