import { severityStyles, SCREENINGS, type PatternInsight, type PatternWindow, type RedFlag } from '@cherri/shared';
import Link from 'next/link';
import { cn } from '@/lib/cn';

const WINDOW_LABELS: Record<PatternWindow, { label: string; emoji: string; color: string }> = {
  MENSTRUAL: { label: 'During period', emoji: '🩸', color: '#F1DFC8' },
  FOLLICULAR: { label: 'After period', emoji: '🌱', color: '#E6E9D3' },
  OVULATORY: { label: 'Around ovulation', emoji: '✨', color: '#F3E6C6' },
  LUTEAL: { label: 'Second half', emoji: '🌙', color: '#DFE7E3' },
  PREMENSTRUAL: { label: 'Week before period', emoji: '⏳', color: '#DFE7E3' },
};

export function PatternCard({ pattern, compact = false }: { pattern: PatternInsight; compact?: boolean }) {
  const window = WINDOW_LABELS[pattern.window];
  return (
    <article className="flex h-full flex-col gap-3 rounded-card border border-line bg-paper p-5 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: window.color }}>
          {window.emoji} {window.label}
        </span>
        <span className={cn('text-xs font-bold', pattern.strength === 'STRONG' ? 'text-olive-deep' : 'text-ink-soft')}>
          {pattern.strength === 'STRONG' ? '● Strong pattern' : '○ Emerging'}
        </span>
      </div>
      <h3 className="text-lg leading-snug font-semibold">{pattern.label}</h3>
      <p className="text-sm text-ink-soft">{pattern.message}</p>
      {!compact && (
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          {pattern.lift !== null && <span className="rounded-full bg-cream-deep px-2.5 py-1">{pattern.lift}× more likely</span>}
          <span className="rounded-full bg-cream-deep px-2.5 py-1">
            {pattern.cyclesWithPattern}/{pattern.cyclesObserved} cycles
          </span>
          <span className="rounded-full bg-cream-deep px-2.5 py-1">p {pattern.pValue < 0.001 ? '< 0.001' : `= ${pattern.pValue}`}</span>
        </div>
      )}
      {pattern.hint && (
        <div className="mt-auto rounded-2xl bg-ochre-soft p-3 text-sm">
          <p>{pattern.hint.note}</p>
          {pattern.hint.screening && (
            <Link href={`/checks/${pattern.hint.screening}`} className="mt-2 inline-block font-bold underline decoration-2 underline-offset-4">
              Take the {SCREENINGS[pattern.hint.screening].title} →
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

export function FlagCard({ flag }: { flag: RedFlag }) {
  const style = severityStyles[flag.severity];
  return (
    <article className="rounded-card p-5" style={{ background: style.bg, color: style.ink }}>
      <p className="mb-1 text-[11px] font-semibold tracking-[0.16em] uppercase">
        {style.emoji} {style.label}
      </p>
      <h3 className="text-lg font-semibold">{flag.title}</h3>
      <p className="mt-1 text-sm opacity-90">{flag.detail}</p>
      <p className="mt-3 text-sm font-bold">{flag.action}</p>
    </article>
  );
}

export function StatTile({ label, value, hint, tone = '#FBF7EF' }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-card border border-line p-4" style={{ background: tone }}>
      <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}
