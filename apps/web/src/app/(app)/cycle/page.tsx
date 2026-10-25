'use client';

import { CYCLE_PHASES, diffDays, formatDay, phaseColors, PHASE_GUIDES, relativeDay } from '@cherri/shared';
import { MonthCalendar } from '@/components/cycle/month-calendar';
import { CycleWheel } from '@/components/cycle/cycle-wheel';
import { ButtonLink } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
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

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Cycle" title="Your rhythm">
        {prediction
          ? 'Predictions update every time you log a period. The more you log, the more confident Cherri gets.'
          : 'Period predictions are paused for your current life stage.'}
      </PageHeader>

      {!prediction?.hasData ? (
        <EmptyState emoji="🗓️" title="No periods logged yet">
          Log your period flow on the Log page and Cherri will start predicting.
          <div className="mt-4">
            <ButtonLink href="/log" size="sm">
              Log a period
            </ButtonLink>
          </div>
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card sticker>
            <MonthCalendar today={data.today} periods={data.periods} prediction={prediction} periodLength={periodLength} />
          </Card>
          <div className="space-y-4">
            {current && (
              <Card className="grid grid-cols-[120px_1fr] items-center gap-4">
                <CycleWheel day={current.day} cycleLength={current.expectedLength} periodLength={periodLength} className="w-full" />
                <div>
                  <p className="text-xs font-bold tracking-widest text-ink-soft uppercase">Day {current.day}</p>
                  <p className="font-display text-2xl font-semibold">{PHASE_GUIDES[current.phase].vibe}</p>
                  {prediction.nextPeriod && (
                    <p className="mt-1 text-sm text-ink-soft">
                      Next period {prediction.nextPeriod.isLate ? `was due ${formatDay(prediction.nextPeriod.date)}` : relativeDay(prediction.nextPeriod.date, data.today)}
                    </p>
                  )}
                </div>
              </Card>
            )}
            {prediction.nextPeriod && (
              <Card tone="cream">
                <p className="text-xs font-bold tracking-widest text-ink-soft uppercase">How sure is Cherri?</p>
                <div className="mt-3 h-4 overflow-hidden rounded-full bg-paper">
                  <div className="h-full rounded-full bg-olive" style={{ width: `${Math.round(prediction.nextPeriod.confidence * 100)}%` }} />
                </div>
                <p className="mt-2 text-sm">
                  <strong>{Math.round(prediction.nextPeriod.confidence * 100)}%</strong> chance it starts between {formatDay(prediction.nextPeriod.windowStart)} and{' '}
                  {formatDay(prediction.nextPeriod.windowEnd)}. Likely range: {formatDay(prediction.nextPeriod.likelyStart)} – {formatDay(prediction.nextPeriod.likelyEnd)}.
                </p>
                <p className="mt-2 text-xs text-ink-soft">Learned from {prediction.model.basedOnCycles} of your cycles.</p>
              </Card>
            )}
            <Card>
              <p className="mb-3 text-xs font-bold tracking-widest text-ink-soft uppercase">The four eras</p>
              <ul className="space-y-2.5">
                {CYCLE_PHASES.map((phase) => (
                  <li key={phase} className="flex items-center gap-3">
                    <span className="size-4 shrink-0 rounded-full" style={{ background: phaseColors[phase].fill }} />
                    <span className="text-sm">
                      <strong>
                        {PHASE_GUIDES[phase].emoji} {PHASE_GUIDES[phase].vibe}
                      </strong>{' '}
                      <span className="text-ink-soft">· {PHASE_GUIDES[phase].name}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <section>
          <SectionTitle eyebrow="History" title="Past cycles" />
          <Card>
            <ul className="space-y-3">
              {history.map((p, i) => {
                const next = history[i - 1];
                const length = next ? diffDays(next.startDate, p.startDate) : null;
                return (
                  <li key={p.startDate} className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-sm">
                    <span className="font-bold">{formatDay(p.startDate, { year: false })}</span>
                    <span className="h-3 overflow-hidden rounded-full bg-cream-deep">
                      {length && <span className="block h-full rounded-full bg-dusk" style={{ width: `${Math.min(100, (length / longest) * 100)}%` }} />}
                    </span>
                    <span className="text-right font-semibold text-ink-soft">{length ? `${length} days` : 'current'}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
