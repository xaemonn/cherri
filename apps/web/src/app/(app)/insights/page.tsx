'use client';

import { formatDay, phaseColors, PHASE_GUIDES } from '@cherri/shared';
import { Gift, QrCode } from 'lucide-react';
import { FlagCard, PatternCard, StatTile } from '@/components/insights/cards';
import { ButtonLink } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { EmptyState, ErrorNote, PageHeader, PageLoader } from '@/components/ui/misc';
import { useInsights } from '@/lib/queries';

export default function InsightsPage() {
  const { data, isLoading, error } = useInsights();
  if (isLoading) return <PageLoader label="Running Pattern Radar…" />;
  if (error || !data) return <ErrorNote error={error} />;

  const { stats, patterns, redFlags, symptoms, moodShifts } = data;
  const maxDays = Math.max(1, ...symptoms.map((s) => s.days));

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Insights" title="Your patterns, decoded">
        Real statistics on your own logs, not guesses. Patterns need at least two cycles to show up.
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Avg cycle" value={stats?.avgCycleLength ? `${Math.round(stats.avgCycleLength)}d` : '—'} hint={stats?.completedCycles ? `${stats.completedCycles} cycles logged` : 'Log 2+ periods'} tone="#F1DFC8" />
        <StatTile label="Regularity" value={stats?.regularity === 'UNKNOWN' || !stats ? '—' : stats.regularity === 'REGULAR' ? 'Regular' : 'Irregular'} hint={stats?.variability != null ? `varies by ${stats.variability} days` : undefined} tone="#E6E9D3" />
        <StatTile label="Avg period" value={stats?.avgPeriodLength ? `${stats.avgPeriodLength}d` : '—'} hint="from logged periods" tone="#F3E6C6" />
        <StatTile label="Shortest · longest" value={stats?.shortestCycle ? `${stats.shortestCycle}·${stats.longestCycle}` : '—'} hint="days, last 6 cycles" tone="#DFE7E3" />
      </div>

      <section>
        <SectionTitle eyebrow="📡 Pattern Radar" title="Symptoms that follow your cycle" />
        {!patterns.ready ? (
          <EmptyState emoji="📡" title="Pattern Radar is warming up">
            {patterns.needs?.cycles ? `Log ${patterns.needs.cycles} more cycle${patterns.needs.cycles > 1 ? 's' : ''}` : 'Keep logging'}
            {patterns.needs?.loggedDays ? ` and about ${patterns.needs.loggedDays} more days` : ''} and Cherri will start spotting patterns.
          </EmptyState>
        ) : patterns.patterns.length === 0 ? (
          <EmptyState emoji="🌈" title="No clear cycle patterns yet">
            Your symptoms don’t cluster in one phase right now. That’s good news. Cherri keeps checking every cycle.
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {patterns.patterns.map((p) => (
              <PatternCard key={`${p.feature}-${p.window}`} pattern={p} />
            ))}
          </div>
        )}
      </section>

      {moodShifts.length > 0 && (
        <section>
          <SectionTitle eyebrow="Mood & medicines" title="Your mood since a new medicine" />
          <div className="grid gap-4 md:grid-cols-2">
            {moodShifts.map((shift) => (
              <Card key={shift.medication} tone="dusk">
                <p className="text-xs font-bold tracking-wide text-dusk-deep uppercase">Since {formatDay(shift.startedOn, { year: true })}</p>
                <h3 className="mt-1 text-lg font-semibold">Lower mood since starting {shift.medication}</h3>
                <p className="mt-1 text-sm">
                  Your average mood went from <strong>{shift.before}</strong> to <strong>{shift.after}</strong> out of 5 ({shift.daysBefore} days logged before, {shift.daysAfter} after).
                </p>
                <p className="mt-3 text-sm font-bold">This doesn’t prove the medicine is the cause. Please don’t stop it on your own: tell your doctor, there may be other options.</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {redFlags.length > 0 && (
        <section>
          <SectionTitle eyebrow="Worth a look" title="Flags for your doctor" />
          <div className="grid gap-4 md:grid-cols-2">
            {redFlags.map((flag) => (
              <FlagCard key={flag.code} flag={flag} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle eyebrow="Last 90 days" title="What you logged most" />
        {symptoms.length === 0 ? (
          <EmptyState emoji="📝" title="Nothing logged yet">
            Log symptoms for a few days and your top ones show up here.
          </EmptyState>
        ) : (
          <Card>
            <ul className="space-y-3">
              {symptoms.slice(0, 10).map((s) => (
                <li key={s.code} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3">
                  <span className="truncate text-sm font-bold">{s.label}</span>
                  <span className="h-3.5 overflow-hidden rounded-full bg-cream-deep">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(s.days / maxDays) * 100}%`, background: s.peakPhase ? phaseColors[s.peakPhase].fill : '#A3927F' }}
                    />
                  </span>
                  <span className="w-28 text-right text-xs font-semibold text-ink-soft">
                    {s.days} days{s.peakPhase ? ` · ${PHASE_GUIDES[s.peakPhase].emoji}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink-soft">Bar colour shows the phase where each symptom peaks.</p>
          </Card>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card tone="ink" className="flex flex-col items-start gap-3">
          <Gift className="size-8 text-olive" />
          <h3 className="text-2xl font-semibold text-cream">Your Cycle Wrapped</h3>
          <p className="text-sm text-cream/75">Your last 3 months as a story: power phase, top symptoms, streaks.</p>
          <ButtonLink href="/wrapped" variant="olive" size="sm">
            Play it
          </ButtonLink>
        </Card>
        <Card tone="ochre" className="flex flex-col items-start gap-3">
          <QrCode className="size-8" />
          <h3 className="text-2xl font-semibold">Take this to your doctor</h3>
          <p className="text-sm text-ink-soft">One clinical page with patterns, flags and labs, shared by QR code.</p>
          <ButtonLink href="/report" size="sm">
            Make my report
          </ButtonLink>
        </Card>
      </div>
    </div>
  );
}
