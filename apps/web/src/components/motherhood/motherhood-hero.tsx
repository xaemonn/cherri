import { classifyBloodPressure, formatDay, type CareStepView, type MotherhoodStatus } from '@cherri/shared';
import { ArrowRight, CalendarCheck, ShieldCheck } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

const KIND_EMOJI: Record<CareStepView['kind'], string> = { VISIT: '', TEST: '', VACCINE: '', SUPPLEMENT: '', PLAN: '' };

/** Where she is in pregnancy or the weeks after birth, and what's next. */
export function MotherhoodHero({ status, compact = false }: { status: MotherhoodStatus; compact?: boolean }) {
  const now = status.steps.filter((s) => s.status === 'NOW').slice(0, compact ? 2 : 4);
  const bp = status.latestBp;
  const bpHigh = bp ? ['HIGH', 'SEVERE'].includes(classifyBloodPressure(bp.systolic, bp.diastolic)) : false;

  return (
    <Card sticker tone="olive" className="relative overflow-hidden">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          {status.stage === 'PREGNANCY' ? (
            <>
              <p className="text-xs font-bold tracking-widest text-olive-deep uppercase">Trimester {status.age.trimester}</p>
              <p className="mt-1 font-display text-5xl leading-none font-semibold sm:text-6xl">
                {status.age.weeks}
                <span className="text-2xl"> weeks</span> {status.age.days > 0 && <span className="text-2xl">{status.age.days} days</span>}
              </p>
              {status.baby && (
                <p className="mt-3 text-lg font-semibold">
                  Baby is about the size of {status.baby.name}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
                <span className="rounded-full bg-paper px-3 py-1.5">{status.age.daysToGo} days to go</span>
                <span className="rounded-full bg-paper px-3 py-1.5">Due {formatDay(status.age.dueDate, { year: true })}</span>
              </div>
              {status.age.weeks >= 13 && (
                <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                  <CalendarCheck className="size-4 text-olive-deep" /> Free doctor check-up (PMSMA) on {formatDay(status.nextPmsma, { weekday: true })}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-bold tracking-widest text-olive-deep uppercase">After birth</p>
              <p className="mt-1 font-display text-5xl leading-none font-semibold sm:text-6xl">
                Week {status.age.weeks + 1}
              </p>
              <p className="mt-3 text-lg font-semibold">
                {status.age.postnatal ? `Day ${status.age.days} of your first 42 days` : 'Past the first six weeks'}: look after you, too.
              </p>
            </>
          )}
          {bp && (
            <p className={cn('mt-3 inline-flex rounded-full px-3 py-1.5 text-sm font-bold', bpHigh ? 'bg-cherry text-cream' : 'bg-paper')}>
              BP {bp.systolic}/{bp.diastolic} on {formatDay(bp.date)}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-bold tracking-widest text-olive-deep uppercase">Right now</p>
          <ul className="mt-2 space-y-2">
            {now.map((step) => (
              <li key={step.id} className="rounded-2xl bg-paper/80 p-3">
                <p className="font-semibold">
                  <span aria-hidden="true">{KIND_EMOJI[step.kind]}</span> {step.title}
                </p>
                {!compact && <p className="mt-0.5 text-sm text-ink-soft">{step.detail}</p>}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/pregnancy#check" size="sm">
              <ShieldCheck className="size-4" /> Danger-sign check
            </ButtonLink>
            {compact && (
              <ButtonLink href="/pregnancy" size="sm" variant="outline">
                Full care plan <ArrowRight className="size-4" />
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

const STATUS_STYLE: Record<CareStepView['status'], { label: string; className: string }> = {
  DONE: { label: 'Earlier', className: 'bg-cream-deep text-ink-soft' },
  NOW: { label: 'Now', className: 'bg-olive-deep text-cream' },
  NEXT: { label: 'Coming up', className: 'bg-ochre-soft text-ochre-deep' },
};

/** The care plan as a timeline: what's due now, what's coming, and what has passed. */
export function CarePlan({ steps, unit }: { steps: readonly CareStepView[]; unit: 'week' | 'day' }) {
  const order = { NOW: 0, NEXT: 1, DONE: 2 } as const;
  const sorted = [...steps].sort((a, b) => order[a.status] - order[b.status] || a.from - b.from);
  return (
    <ol className="space-y-2">
      {sorted.map((step) => (
        <li key={step.id} className={cn('flex gap-3 rounded-card border border-line bg-paper p-4', step.status === 'DONE' && 'opacity-70')}>
          <span className="text-2xl" aria-hidden="true">
            {KIND_EMOJI[step.kind]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{step.title}</h3>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', STATUS_STYLE[step.status].className)}>{STATUS_STYLE[step.status].label}</span>
              <span className="text-xs text-ink-soft">
                {unit === 'week' ? `Weeks ${step.from}–${step.to}` : step.to > 60 ? `From day ${step.from}` : `Days ${step.from}–${step.to}`}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
