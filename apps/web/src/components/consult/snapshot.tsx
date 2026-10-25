'use client';

import type { ClinicalSnapshot } from '@cherri/shared';
import { Activity, CalendarDays, Droplet, FlaskConical, HeartPulse, Pill, Stethoscope, TriangleAlert, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function Block({ icon: Icon, title, children, className }: { icon: LucideIcon; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-line bg-paper p-4', className)}>
      <h3 className="mb-2 flex items-center gap-2 font-sans text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">
        <Icon className="size-4" strokeWidth={1.8} /> {title}
      </h3>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-ink-faint">{children}</p>;

/** The clinical snapshot attached to a consult: what she previews before consenting, and what the doctor reads first. */
export function SnapshotView({ snapshot, compact = false }: { snapshot: ClinicalSnapshot; compact?: boolean }) {
  const { cycle, patient } = snapshot;
  const outOfRange = snapshot.labs.filter((l) => l.flag === 'LOW' || l.flag === 'HIGH');
  return (
    <div className={cn('grid gap-3', !compact && 'sm:grid-cols-2')}>
      <Block icon={Stethoscope} title="Patient" className={cn(!compact && 'sm:col-span-2')}>
        <p className="text-[15px]">
          <strong>{patient.firstName ?? 'Patient'}</strong>
          {patient.age != null && `, ${patient.age}`} · {patient.lifeStage.toLowerCase()}
          {patient.knownConditions.length > 0 && <> · known: {patient.knownConditions.join(', ')}</>}
        </p>
        {snapshot.allergies && <p className="mt-1 text-sm font-semibold text-cherry-deep">Allergies: {snapshot.allergies}</p>}
        {snapshot.pregnancy?.stage === 'PREGNANCY' && (
          <p className="mt-1 text-sm">
            Pregnant · {snapshot.pregnancy.weeks} wk {snapshot.pregnancy.days} d · due {fmt(snapshot.pregnancy.dueDate)}
          </p>
        )}
        {snapshot.latestBloodPressure && (
          <p className="mt-1 text-sm">
            Latest BP {snapshot.latestBloodPressure.systolic}/{snapshot.latestBloodPressure.diastolic} mmHg ({fmt(snapshot.latestBloodPressure.date)})
          </p>
        )}
        <p className="mt-1 text-xs text-ink-faint">Last {snapshot.rangeDays} days · built from her own Cherri records</p>
      </Block>

      {snapshot.redFlags.length > 0 && (
        <Block icon={TriangleAlert} title="Flagged" className={cn('border-cherry/30 bg-cherry-soft/60', !compact && 'sm:col-span-2')}>
          <ul className="space-y-1.5">
            {snapshot.redFlags.map((f) => (
              <li key={f.title} className="text-sm">
                <span className={cn('mr-2 rounded-full px-2 py-0.5 text-[11px] font-bold', f.severity === 'URGENT' ? 'bg-cherry text-cream' : 'bg-ochre-soft text-ochre-deep')}>
                  {f.severity}
                </span>
                <strong>{f.title}</strong>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block icon={CalendarDays} title="Cycle (90 days)">
        {cycle ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-ink-soft">Average</dt>
            <dd>{cycle.averageCycleLength ? `${cycle.averageCycleLength} days (${cycle.shortestCycle}–${cycle.longestCycle})` : '—'}</dd>
            <dt className="text-ink-soft">Pattern</dt>
            <dd>{cycle.regularity.toLowerCase()}</dd>
            <dt className="text-ink-soft">Periods logged</dt>
            <dd>
              {cycle.periodsLogged}
              {cycle.missedPeriods > 0 && <span className="ml-1 font-semibold text-cherry-deep">· {cycle.missedPeriods} possibly missed</span>}
            </dd>
            <dt className="text-ink-soft">Last period</dt>
            <dd>{cycle.lastPeriodStart ? fmt(cycle.lastPeriodStart) : '—'}</dd>
          </dl>
        ) : (
          <Empty>No periods logged yet.</Empty>
        )}
      </Block>

      <Block icon={Droplet} title="Blood loss (PBAC)">
        {snapshot.bloodLoss ? (
          <p className="text-sm">
            <span className={cn('text-2xl font-semibold', snapshot.bloodLoss.heavy ? 'text-cherry' : 'text-olive-deep')}>{snapshot.bloodLoss.score}</span> points · ≈
            {snapshot.bloodLoss.estimatedMl} mL
            <br />
            <span className={snapshot.bloodLoss.heavy ? 'font-semibold text-cherry-deep' : 'text-ink-soft'}>
              {snapshot.bloodLoss.heavy ? 'Heavy menstrual bleeding (over 100 / 80 mL)' : 'Within normal range'}
            </span>
            {snapshot.bloodLoss.clotsLarge > 0 && <> · {snapshot.bloodLoss.clotsLarge} large clots</>}
          </p>
        ) : (
          <Empty>Not measured.</Empty>
        )}
      </Block>

      <Block icon={Activity} title="Symptoms & severity">
        {snapshot.symptoms.length ? (
          <ul className="space-y-1 text-sm">
            {snapshot.symptoms.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span className="flex-1">
                  {s.label}
                  {s.clinicalTerm && <span className="text-ink-faint"> · {s.clinicalTerm}</span>}
                </span>
                <span className="text-ink-soft">{s.days} d</span>
                <span className="flex gap-0.5" aria-label={`Severity ${s.avgSeverity.toFixed(1)} of 3`}>
                  {[1, 2, 3].map((i) => (
                    <span key={i} className={cn('h-2 w-3 rounded-full', i <= Math.round(s.avgSeverity) ? 'bg-clay' : 'bg-line')} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No symptoms logged.</Empty>
        )}
      </Block>

      <Block icon={FlaskConical} title={`Latest labs${outOfRange.length ? ` · ${outOfRange.length} out of range` : ''}`}>
        {snapshot.labs.length ? (
          <ul className="space-y-1 text-sm">
            {snapshot.labs.slice(0, 10).map((l) => {
              const off = l.flag === 'LOW' || l.flag === 'HIGH';
              return (
                <li key={`${l.name}-${l.takenAt}`} className={cn('flex justify-between gap-2 rounded-lg px-2 py-0.5', off && 'bg-cherry-soft font-semibold text-cherry-deep')}>
                  <span>{l.name}</span>
                  <span>
                    {l.value} {l.unit} {off && (l.flag === 'LOW' ? '↓' : '↑')}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>No lab reports uploaded.</Empty>
        )}
      </Block>

      <Block icon={Pill} title="Active medicines">
        {snapshot.medications.length ? (
          <ul className="space-y-1 text-sm">
            {snapshot.medications.map((m) => (
              <li key={m.name}>
                <strong>{m.name}</strong> {[m.dose, m.schedule].filter(Boolean).join(', ')}
                {m.reason && <span className="text-ink-faint"> · for {m.reason}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>None recorded.</Empty>
        )}
      </Block>

      <Block icon={HeartPulse} title="Screening results">
        {snapshot.screenings.length || snapshot.mindChecks.length ? (
          <ul className="space-y-1 text-sm">
            {snapshot.screenings.map((s) => (
              <li key={s.title} className="flex justify-between gap-2">
                <span>{s.title}</span>
                <span className={cn('font-semibold', s.band === 'HIGH' ? 'text-cherry-deep' : s.band === 'MODERATE' ? 'text-ochre-deep' : 'text-olive-deep')}>{s.band.toLowerCase()}</span>
              </li>
            ))}
            {snapshot.mindChecks.map((m) => (
              <li key={m.type} className="flex justify-between gap-2">
                <span>{m.title}</span>
                <span className="font-semibold">
                  {m.score}/{m.maxScore} · {m.label}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No screenings taken.</Empty>
        )}
      </Block>
    </div>
  );
}
