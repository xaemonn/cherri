'use client';

import {
  AFTER_EMERGENCY_PILL,
  conceptionRisk,
  EC_EVENT_LABELS,
  EC_EVENTS,
  ecOptions,
  pregnancyTestDate,
  type ConceptionRisk,
  type EcEvent,
  type EcOption,
  type ISODate,
} from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { BellRing, CalendarPlus, Clock, Hospital, Info, Lock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Appear } from '@/components/ui/appear';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Input, Label } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { keys, useDashboard } from '@/lib/queries';

const RISK_STYLES: Record<ConceptionRisk, { box: string; label: string }> = {
  HIGH: { box: 'bg-cherry text-cream', label: 'High conception risk' },
  MODERATE: { box: 'bg-ochre text-ink', label: 'Moderate conception risk' },
  LOW: { box: 'bg-olive-deep text-cream', label: 'Lower conception risk' },
};

const QUICK_HOURS = [
  { label: 'Just now', hours: 0 },
  { label: '12 h ago', hours: 12 },
  { label: 'Yesterday', hours: 24 },
  { label: '2 days ago', hours: 48 },
  { label: '3 days ago', hours: 72 },
  { label: '4 days ago', hours: 96 },
];

/** datetime-local wants local time without a zone. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDate(date: Date): ISODate {
  return toLocalInput(date).slice(0, 10) as ISODate;
}

/** A calendar file any phone can import: the reminder lives in her own calendar, not only in Cherri. */
function downloadIcs(due: ISODate) {
  const day = due.replace(/-/g, '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cherri//Reminder//EN',
    'BEGIN:VEVENT',
    `UID:${day}-test@cherri.app`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${day}`,
    'SUMMARY:Personal reminder',
    'DESCRIPTION:Take a home test today (3 weeks since the accident).',
    'BEGIN:VALARM',
    'TRIGGER:PT9H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Personal reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reminder.ics';
  a.click();
  URL.revokeObjectURL(url);
}

function fmtLeft(hours: number): string {
  if (hours <= 0) return 'Window closed';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h left` : `${h} h ${m} min left`;
}

function Countdown({ option, hoursSince }: { option: EcOption; hoursSince: number }) {
  const used = Math.min(100, (hoursSince / option.windowHours) * 100);
  return (
    <Card className={cn('flex flex-col', !option.available && 'opacity-60')}>
      <p className="text-xs font-semibold tracking-[0.18em] text-ink-faint uppercase">{option.windowHours === 72 ? 'Within 72 hours' : 'Within 5 days (120 h)'}</p>
      <h3 className="mt-1 text-xl font-medium">{option.name}</h3>
      <p className={cn('mt-4 font-display text-3xl font-medium tabular-nums', option.available ? 'text-ink' : 'text-cherry-deep')}>{fmtLeft(option.hoursLeft)}</p>
      <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-cream-deep" role="meter" aria-valuemin={0} aria-valuemax={option.windowHours} aria-valuenow={Math.min(hoursSince, option.windowHours)} aria-label="Time used">
        {option.id === 'LNG' && (
          <div className="absolute inset-0 flex">
            <span className="h-full w-1/3 bg-olive/35" />
            <span className="h-full w-1/3 bg-ochre/35" />
            <span className="h-full w-1/3 bg-clay/35" />
          </div>
        )}
        <span className="absolute inset-y-0 left-0 rounded-full bg-ink/70 transition-[width] duration-700" style={{ width: `${used}%` }} />
      </div>
      {option.id === 'LNG' && (
        <div className="mt-1 grid grid-cols-3 text-center text-[11px] font-semibold text-ink-soft">
          <span>0–24 h · ~95%</span>
          <span>24–48 h · ~85%</span>
          <span>48–72 h · ~58%</span>
        </div>
      )}
      <p className={cn('mt-3 rounded-2xl px-3 py-2 text-sm font-medium', option.available ? 'bg-olive-soft text-olive-deep' : 'bg-cherry-soft text-cherry-deep')}>{option.efficacy}</p>
      <details className="group mt-auto pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-olive-deep">
          Where to get it & notes <span className="transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <p className="mt-2 text-sm text-ink-soft">{option.examples}</p>
        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
          {option.notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

export default function EmergencyContraceptionPage() {
  const dashboard = useDashboard();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [when, setWhen] = useState(() => toLocalInput(new Date()));
  const [event, setEvent] = useState<EcEvent>('CONDOM_BROKE');
  const [manualDay, setManualDay] = useState<string>('');
  const [irregular, setIrregular] = useState(false);
  const [reminded, setReminded] = useState<ISODate | null>(null);

  // The countdown ticks every 30 seconds.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const eventAt = new Date(when);
  const hoursSince = Math.max(0, (now - eventAt.getTime()) / 3_600_000);
  const cycle = dashboard.data?.cycle ?? null;
  const daysAgo = Math.floor(hoursSince / 24);
  const autoDay = cycle && cycle.day - daysAgo >= 1 ? cycle.day - daysAgo : null;
  const cycleDay = manualDay ? Number(manualDay) : autoDay;
  const risk = conceptionRisk({ cycleDay, cycleLength: cycle?.expectedLength ?? 28, irregular });
  const options = ecOptions(hoursSince);
  const testOn = pregnancyTestDate(localDate(eventAt));
  const future = eventAt.getTime() > now + 60_000;

  async function remind() {
    try {
      await api.reminders.create({ kind: 'PREGNANCY_TEST', dueOn: testOn });
      await queryClient.invalidateQueries({ queryKey: keys.reminders });
      setReminded(testOn);
      toast('Reminder set. It will show on your home screen.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not set the reminder.');
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Accident triage" title="Condom broke? Missed a pill? Breathe. Here’s your plan.">
        Private and judgement-free. Nothing here is shared.
      </PageHeader>

      <div className="space-y-6">
        <Card sticker className="grid gap-5 md:grid-cols-3">
          <div>
            <Label>What happened?</Label>
            <div className="flex flex-wrap gap-2">
              {EC_EVENTS.map((e) => (
                <Chip key={e} selected={event === e} onClick={() => setEvent(e)}>
                  {EC_EVENT_LABELS[e]}
                </Chip>
              ))}
            </div>
            {event === 'MISSED_PILL' && (
              <p className="mt-2 text-sm text-ink-soft">
                First check whether you actually need it:{' '}
                <Link href="/meds#missed-pill" className="font-semibold text-olive-deep underline underline-offset-4">
                  missed-pill helper
                </Link>
                .
              </p>
            )}
          </div>
          <label className="block">
            <Label>When?</Label>
            <Input type="datetime-local" value={when} max={toLocalInput(new Date(now))} onChange={(e) => setWhen(e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_HOURS.map((q) => (
                <Chip key={q.label} className="px-3 py-1 text-xs" onClick={() => setWhen(toLocalInput(new Date(now - q.hours * 3_600_000)))}>
                  {q.label}
                </Chip>
              ))}
            </div>
          </label>
          <label className="block">
            <Label hint={autoDay ? `Cherri estimates day ${autoDay} from your log` : 'day 1 = first day of your last period'}>Cycle day when it happened</Label>
            <Input type="number" min={1} max={90} placeholder={autoDay ? String(autoDay) : 'e.g. 12'} value={manualDay} onChange={(e) => setManualDay(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-3">
            <input type="checkbox" checked={irregular} onChange={(e) => setIrregular(e.target.checked)} className="size-5 accent-olive-deep" /> My periods are irregular
          </label>
        </Card>

        <div className="space-y-5">
          {future ? (
            <Card tone="ochre">That time is in the future. Pick when it happened.</Card>
          ) : (
            <>
              <Appear key={risk.risk} tone={risk.risk === 'HIGH' ? 'danger' : risk.risk === 'MODERATE' ? 'warning' : 'info'} label="Updated">
              <div className={cn('rounded-card p-5 shadow-lift-lg sm:p-6', RISK_STYLES[risk.risk].box)}>
                <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-80">
                  {Math.floor(hoursSince)} hours since · cycle day {cycleDay ?? 'unknown'}
                </p>
                <p className="mt-1 font-display text-3xl font-medium">{RISK_STYLES[risk.risk].label}</p>
                <p className="mt-2 text-[15px] opacity-90">{risk.explanation}</p>
                <p className="mt-2 text-sm font-semibold">Whatever the risk, emergency contraception is safe to take if you want to be sure.</p>
              </div>
              </Appear>
              <section aria-label="Your options and how long you have">
                <SectionTitle eyebrow="Your options" title="How long you have" action={<Clock className="size-5 text-ink-faint" />} />
                <div className="grid gap-4 md:grid-cols-3">
                  {options.map((o) => (
                    <Countdown key={o.id} option={o} hoursSince={hoursSince} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ButtonLink href="/care" variant="outline" size="sm">
                    <Hospital className="size-4" /> Find a clinic or chemist
                  </ButtonLink>
                </div>
              </section>
            </>
          )}

          <Card tone="dusk">
            <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-lg font-semibold">
              <Info className="size-5" /> After the pill: what to expect
              <span className="ml-auto text-sm font-medium text-dusk-deep group-open:hidden">Show</span>
            </summary>
            <ul className="mt-3 space-y-1.5 text-[15px]">
              {AFTER_EMERGENCY_PILL.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
            </details>
          </Card>

          <Card tone="olive">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <BellRing className="size-5" /> Pregnancy test reminder
            </h3>
            <p className="mt-1 text-[15px]">
              A home urine test is reliable 3 weeks after the accident: on{' '}
              <strong>{new Date(testOn).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="olive" onClick={() => void remind()} disabled={reminded === testOn || future}>
                <BellRing className="size-4" /> {reminded === testOn ? 'Reminder set' : 'Remind me in Cherri'}
              </Button>
              <Button variant="outline" onClick={() => downloadIcs(testOn)} disabled={future}>
                <CalendarPlus className="size-4" /> Add to my calendar
              </Button>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
              <Lock className="size-3.5" /> The calendar entry just says “Personal reminder”.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
