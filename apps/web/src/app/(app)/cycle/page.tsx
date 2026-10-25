'use client';

import { CYCLE_PHASES, diffDays, formatDay, phaseColors, PHASE_GUIDES, relativeDay } from '@cherri/shared';
import { MonthCalendar } from '@/components/cycle/month-calendar';
import { CycleWheel } from '@/components/cycle/cycle-wheel';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorNote, PageHeader, PageLoader } from '@/components/ui/misc';
import { useAuth } from '@/lib/auth';
import { useCycle } from '@/lib/queries';

export default function CyclePage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useCycle();
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorNote error={error} />;

  const prediction = data.prediction;
  const current = prediction?.current;
  const periodLength = Math.round(prediction?.stats.avgPeriodLength ?? user?.avgPeriodLength ?? 5);
  const history = [...data.periods].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  const longest = Math.max(40, ...(prediction?.stats.cycleLengths ?? []));

  const confidence = prediction?.nextPeriod ? Math.round(prediction.nextPeriod.confidence * 100) : null;
  const cycleLen = current?.expectedLength ?? 28;
  // Rough phase spans for the timeline bar: period, follicular, ovulation (3 days around), luteal.
  const ov = cycleLen - 14;
  const spans: Array<{ phase: (typeof CYCLE_PHASES)[number]; days: number }> = [
    { phase: 'MENSTRUAL', days: periodLength },
    { phase: 'FOLLICULAR', days: Math.max(1, ov - 1 - periodLength) },
    { phase: 'OVULATORY', days: 3 },
    { phase: 'LUTEAL', days: Math.max(1, cycleLen - ov - 2) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Cycle" title="Your rhythm" />

      {!prediction?.hasData ? (
        <EmptyState title="No periods logged yet">
          <div className="mt-2">
            <ButtonLink href="/log" size="sm">
              Log a period
            </ButtonLink>
          </div>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {current && (
              <div className="flex items-center gap-4 rounded-card border border-line bg-paper p-4">
                <CycleWheel day={current.day} cycleLength={current.expectedLength} periodLength={periodLength} className="w-16 shrink-0" />
                <div>
                  <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Day {current.day}</p>
                  <p className="font-semibold">{PHASE_GUIDES[current.phase].vibe}</p>
                </div>
              </div>
            )}
            {prediction.nextPeriod && (
              <div className="rounded-card border border-line bg-cherry-soft p-4">
                <p className="text-xs font-semibold tracking-wide text-cherry-deep uppercase">Next period</p>
                <p className="mt-1 font-display text-2xl font-semibold text-cherry-deep">
                  {prediction.nextPeriod.isLate ? 'Late' : relativeDay(prediction.nextPeriod.date, data.today)}
                </p>
                <p className="text-sm text-cherry-deep/80">
                  {formatDay(prediction.nextPeriod.windowStart)} – {formatDay(prediction.nextPeriod.windowEnd)}
                </p>
              </div>
            )}
            {confidence !== null && (
              <div className="flex items-center gap-4 rounded-card border border-line bg-paper p-4">
                <svg viewBox="0 0 36 36" className="size-14 shrink-0 -rotate-90" aria-hidden="true">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-cream-deep)" strokeWidth="4" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-olive-deep)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(confidence / 100) * 97.4} 97.4`} />
                </svg>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Confidence</p>
                  <p className="font-display text-2xl font-semibold">{confidence}%</p>
                  <p className="text-xs text-ink-soft">from {prediction.model.basedOnCycles} cycles</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card>
              <MonthCalendar today={data.today} periods={data.periods} prediction={prediction} periodLength={periodLength} />
            </Card>

            <div className="space-y-6">
              <Card>
                <p className="mb-3 text-xs font-semibold tracking-wide text-ink-soft uppercase">This cycle</p>
                <div className="relative flex h-3 overflow-hidden rounded-full">
                  {spans.map((s) => (
                    <span key={s.phase} style={{ flex: s.days, background: phaseColors[s.phase].fill }} />
                  ))}
                </div>
                {current && (
                  <div className="relative h-4">
                    <span className="absolute top-0.5 size-3 -translate-x-1/2 rotate-45 rounded-sm bg-ink" style={{ left: `${Math.min(100, (current.day / cycleLen) * 100)}%` }} aria-label={`You are on day ${current.day}`} />
                  </div>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {CYCLE_PHASES.map((phase) => (
                    <span key={phase} className="inline-flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: phaseColors[phase].fill }} />
                      {PHASE_GUIDES[phase].vibe}
                    </span>
                  ))}
                </div>
              </Card>

              {history.length > 0 && (
                <Card>
                  <p className="mb-3 text-xs font-semibold tracking-wide text-ink-soft uppercase">Past cycles</p>
                  <ul className="space-y-2.5">
                    {history.slice(0, 6).map((p, i) => {
                      const next = history[i - 1];
                      const length = next ? diffDays(next.startDate, p.startDate) : null;
                      return (
                        <li key={p.startDate} className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-3 text-sm">
                          <span className="font-medium">{formatDay(p.startDate, { year: false })}</span>
                          <span className="h-2 overflow-hidden rounded-full bg-cream-deep">
                            {length && <span className="block h-full rounded-full bg-dusk" style={{ width: `${Math.min(100, (length / longest) * 100)}%` }} />}
                          </span>
                          <span className="text-right text-ink-soft">{length ? `${length} d` : 'now'}</span>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
