'use client';

import { formatDay, phaseColors, PHASE_GUIDES } from '@cherri/shared';
import { Activity, CalendarRange, Droplet, Gift, QrCode, Repeat, Ruler } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { FlagRow, PatternCard, StatTile } from '@/components/insights/cards';
import { EmptyState, ErrorNote, PageHeader, PageLoader } from '@/components/ui/misc';
import { cn } from '@/lib/cn';
import { useInsights } from '@/lib/queries';

type Tab = 'patterns' | 'flags' | 'symptoms';

export default function InsightsPage() {
  const { data, isLoading, error } = useInsights();
  const [tab, setTab] = useState<Tab>('patterns');
  if (isLoading) return <PageLoader label="Running Pattern Radar…" />;
  if (error || !data) return <ErrorNote error={error} />;

  const { stats, patterns, redFlags, symptoms, moodShifts } = data;
  const maxDays = Math.max(1, ...symptoms.map((s) => s.days));
  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: 'patterns', label: 'Patterns', count: patterns.ready ? patterns.patterns.length : 0 },
    { id: 'flags', label: 'Flags', count: redFlags.length + moodShifts.length },
    { id: 'symptoms', label: 'Symptoms', count: Math.min(8, symptoms.length) },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Insights" title="Your patterns" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={Repeat} label="Avg cycle" value={stats?.avgCycleLength ? `${Math.round(stats.avgCycleLength)} d` : '—'} hint={stats?.completedCycles ? `${stats.completedCycles} cycles` : 'Log 2+ periods'} tone="bg-olive-soft" />
        <StatTile icon={Activity} label="Regularity" value={stats?.regularity === 'UNKNOWN' || !stats ? '—' : stats.regularity === 'REGULAR' ? 'Regular' : 'Irregular'} hint={stats?.variability != null ? `± ${stats.variability} days` : undefined} tone="bg-dusk-soft" />
        <StatTile icon={Droplet} label="Avg period" value={stats?.avgPeriodLength ? `${stats.avgPeriodLength} d` : '—'} tone="bg-cherry-soft" />
        <StatTile icon={Ruler} label="Range" value={stats?.shortestCycle ? `${stats.shortestCycle}–${stats.longestCycle}` : '—'} hint="days" tone="bg-ochre-soft" />
      </div>

      <div role="tablist" aria-label="Insights" className="inline-flex rounded-full border border-line bg-paper p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn('rounded-full px-4 py-2 text-sm font-semibold transition-colors', tab === t.id ? 'bg-olive-deep text-cream' : 'text-ink-soft hover:text-ink')}
          >
            {t.label}
            <span className={cn('ml-2 rounded-full px-1.5 text-xs', tab === t.id ? 'bg-white/20' : 'bg-cream-deep')}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'patterns' &&
        (!patterns.ready ? (
          <EmptyState title="Pattern Radar is warming up">
            {patterns.needs?.cycles ? `Log ${patterns.needs.cycles} more cycle${patterns.needs.cycles > 1 ? 's' : ''} to unlock patterns.` : 'Keep logging to unlock patterns.'}
          </EmptyState>
        ) : patterns.patterns.length === 0 ? (
          <EmptyState title="No cycle patterns right now" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {patterns.patterns.map((p) => (
              <PatternCard key={`${p.feature}-${p.window}`} pattern={p} />
            ))}
          </div>
        ))}

      {tab === 'flags' &&
        (redFlags.length + moodShifts.length === 0 ? (
          <EmptyState title="Nothing to flag" />
        ) : (
          <ul className="overflow-hidden rounded-card border border-line bg-paper">
            {redFlags.map((flag, i) => (
              <FlagRow key={flag.code} flag={flag} defaultOpen={i === 0} />
            ))}
            {moodShifts.map((shift) => (
              <FlagRow
                key={shift.medication}
                flag={{
                  code: `MOOD_${shift.medication}`,
                  severity: 'INFO',
                  title: `Lower mood since ${shift.medication}`,
                  detail: `Average mood ${shift.before} → ${shift.after} out of 5 since ${formatDay(shift.startedOn)}.`,
                  action: 'Don’t stop it on your own. Mention it to your doctor.',
                } as (typeof redFlags)[number]}
              />
            ))}
          </ul>
        ))}

      {tab === 'symptoms' &&
        (symptoms.length === 0 ? (
          <EmptyState title="Nothing logged yet" />
        ) : (
          <div className="rounded-card border border-line bg-paper p-5">
            <ul className="space-y-3">
              {symptoms.slice(0, 8).map((s) => (
                <li key={s.code} className="grid grid-cols-[minmax(0,8rem)_1fr_3rem] items-center gap-3">
                  <span className="truncate text-sm font-medium">{s.label}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-cream-deep">
                    <span className="block h-full rounded-full" style={{ width: `${(s.days / maxDays) * 100}%`, background: s.peakPhase ? phaseColors[s.peakPhase].fill : '#A897A6' }} />
                  </span>
                  <span className="text-right text-xs font-semibold text-ink-soft">{s.days} d</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4 text-xs text-ink-soft">
              {(['MENSTRUAL', 'FOLLICULAR', 'OVULATORY', 'LUTEAL'] as const).map((ph) => (
                <span key={ph} className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: phaseColors[ph].fill }} /> Peaks {PHASE_GUIDES[ph].name.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        ))}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/report" className="flex items-center gap-4 rounded-card border border-line bg-paper p-5 transition-colors hover:bg-olive-soft">
          <span className="grid size-11 place-items-center rounded-2xl bg-olive-soft text-olive-deep">
            <QrCode className="size-5" />
          </span>
          <span className="font-semibold">Doctor report</span>
        </Link>
        <Link href="/wrapped" className="flex items-center gap-4 rounded-card border border-line bg-paper p-5 transition-colors hover:bg-dusk-soft">
          <span className="grid size-11 place-items-center rounded-2xl bg-dusk-soft text-dusk-deep">
            <Gift className="size-5" />
          </span>
          <span className="font-semibold">Cycle Wrapped</span>
          <CalendarRange className="ml-auto size-4 text-ink-faint" />
        </Link>
      </div>
    </div>
  );
}
