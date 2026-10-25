'use client';

import { firstName, formatDay, greeting, moodScale, phaseColors, relativeDay, SCREENINGS, type DashboardResponse, type Suggestion } from '@cherri/shared';
import {
  ArrowRight,
  BellRing,
  ClipboardCheck,
  ClipboardList,
  Droplets,
  Flame,
  FlaskConical,
  HeartPulse,
  NotebookPen,
  Pill,
  ShieldQuestion,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { Blob, Sticker } from '@/components/brand/decor';
import { CycleWheel } from '@/components/cycle/cycle-wheel';
import { TalkToLog } from '@/components/log/talk-to-log';
import { Appear } from '@/components/ui/appear';
import { ScaleIcon } from '@/components/ui/scale-icon';
import { MotherhoodHero } from '@/components/motherhood/motherhood-hero';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { ErrorNote, PageLoader } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { keys, useDashboard, useInvalidateHealth, useSaveLog } from '@/lib/queries';


const SUGGESTION_LINKS: Record<Suggestion['type'], { href: string; icon: LucideIcon }> = {
  LOG_TODAY: { href: '/log', icon: NotebookPen },
  SCREENING: { href: '/checks', icon: ClipboardCheck },
  UPLOAD_LABS: { href: '/labs', icon: FlaskConical },
  LOG_BP: { href: '/log', icon: HeartPulse },
  DANGER_CHECK: { href: '/pregnancy#check', icon: TriangleAlert },
  VISIT_PREP: { href: '/prep', icon: ClipboardList },
};

function MotherhoodDatePrompt({ stage }: { stage: 'PREGNANCY' | 'POSTPARTUM' }) {
  return (
    <Card sticker tone="olive" className="flex flex-wrap items-center justify-between gap-4">
      <div className="max-w-lg">
        <h2 className="text-2xl font-semibold">{stage === 'PREGNANCY' ? 'Add your due date' : 'Add your baby’s birth date'}</h2>
        <p className="mt-1 text-sm text-ink-soft">Unlock your week-by-week care plan, danger-sign checks and blood pressure watch.</p>
      </div>
      <ButtonLink href="/pregnancy">Set it up</ButtonLink>
    </Card>
  );
}

function CycleHero({ data }: { data: DashboardResponse }) {
  const cycle = data.cycle!;
  const colors = phaseColors[cycle.phase];
  const next = cycle.nextPeriod;

  return (
    <Card sticker className="relative overflow-hidden p-0 sm:p-0">
      <div className="grid items-center gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,200px)_1fr]">
        <CycleWheel day={cycle.day} cycleLength={cycle.expectedLength} periodLength={cycle.periodLength} className="mx-auto w-full max-w-[200px]">
          <div>
            <p className="text-xs font-bold tracking-widest text-ink-soft uppercase">Day</p>
            <p className="font-display text-5xl leading-none font-semibold">{cycle.day}</p>
            <p className="mt-1 text-sm font-bold" style={{ color: colors.ink }}>
              {cycle.guide.vibe}
            </p>
          </div>
        </CycleWheel>
        <div>
          <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase" style={{ background: colors.soft, color: colors.ink }}>
            {cycle.isPeriod ? 'On your period' : cycle.guide.name}
          </span>
          <h2 className="mt-3 text-lg leading-snug font-semibold">{cycle.guide.vibe}</h2>
          {next && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-cherry-soft p-4">
                <p className="text-xs font-bold tracking-wide text-cherry-deep uppercase">{next.isLate ? 'Period is late' : 'Next period'}</p>
                <p className="font-display text-2xl font-semibold text-cherry-deep">
                  {next.isLate ? `${next.daysLate} days late` : relativeDay(next.date, data.today)}
                </p>
                <p className="text-sm text-cherry-deep/80">
                  {formatDay(next.windowStart)} – {formatDay(next.windowEnd)}
                </p>
              </div>
              <div className="rounded-3xl bg-ochre-soft p-4">
                <p className="text-xs font-bold tracking-wide text-ochre-deep uppercase">Fertile window</p>
                <p className="font-display text-2xl font-semibold text-ochre-deep">
                  {formatDay(cycle.fertileWindow.start)} – {formatDay(cycle.fertileWindow.end)}
                </p>
                <p className="text-sm text-ochre-deep/80">Ovulation ≈ {formatDay(cycle.fertileWindow.ovulation)}</p>
              </div>
            </div>
          )}
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
            <Sparkles className="size-4 text-olive-deep" /> {cycle.confidenceNote}
          </p>
        </div>
      </div>
    </Card>
  );
}

function MoodCheckIn({ data }: { data: DashboardResponse }) {
  const save = useSaveLog(data.today);
  const toast = useToast();
  const current = data.todayLog?.mood ?? null;
  return (
    <Card tone="dusk">
      <p className="text-xs font-bold tracking-widest text-dusk-deep uppercase">Daily check-in</p>
      <h3 className="mt-1 text-2xl font-semibold">How are you feeling today?</h3>
      <div className="mt-4 flex justify-between gap-2">
        {moodScale.map((m) => (
          <motion.button
            key={m.value}
            type="button"
            whileTap={{ scale: 0.85 }}
            whileHover={{ y: -4 }}
            onClick={() => save.mutate({ mood: m.value }, { onSuccess: () => toast(`Mood saved: ${m.label}`) })}
            className={cn('flex flex-1 flex-col items-center gap-1 rounded-2xl py-2.5 text-xs font-bold transition-colors', current === m.value ? 'bg-paper shadow-lift ring-2 ring-ink' : 'hover:bg-paper/60')}
            aria-pressed={current === m.value}
          >
            <ScaleIcon kind="mood" value={m.value} className="size-8" />
            {m.label}
          </motion.button>
        ))}
      </div>
      <TalkToLog className="mt-5" />
    </Card>
  );
}

function EmptyCycle() {
  const invalidate = useInvalidateHealth();
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAuth();
  return (
    <Card sticker tone="olive" className="relative overflow-hidden">
      <Blob className="absolute -right-10 -bottom-12 size-48" color="#D9AA55" variant={2} />
      <div className="relative max-w-lg">
        <h2 className="text-3xl font-semibold">Let’s find your rhythm</h2>
        <p className="mt-2 text-ink-soft">Log your period when it starts and Cherri will start predicting, then get smarter with every cycle.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/log" size="md">
            Log today
          </ButtonLink>
          {user?.isGuest && (
            <Button
              variant="outline"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await api.demo.load();
                  setUser(await api.me.get());
                  await invalidate();
                } finally {
                  setLoading(false);
                }
              }}
            >
              {loading ? 'Loading…' : 'Try with demo data'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function Reminders() {
  const queryClient = useQueryClient();
  const reminders = useQuery({ queryKey: keys.reminders, queryFn: api.reminders.list });
  if (!reminders.data?.length) return null;
  return (
    <div className="space-y-3">
      {reminders.data.map((r) => (
        <div key={r.id} className={cn('flex items-center gap-3 rounded-card border p-4 shadow-lift', r.due ? 'border-ochre bg-ochre-soft' : 'border-line bg-paper')}>
          <BellRing className={cn('size-6 shrink-0', r.due ? 'text-ochre-deep' : 'text-ink-faint')} />
          <p className="flex-1 text-[15px]">
            <strong>{r.due ? `Today: ${r.title.toLowerCase()}` : r.title}</strong>
            <span className="block text-sm text-ink-soft">
              {r.due ? 'It has been 3 weeks since the accident, so a home urine test is reliable now.' : `Reminder set for ${formatDay(r.dueOn, { weekday: true })}.`}
            </span>
          </p>
          <button
            type="button"
            aria-label="Dismiss reminder"
            onClick={async () => {
              await api.reminders.dismiss(r.id);
              await queryClient.invalidateQueries({ queryKey: keys.reminders });
            }}
            className="rounded-full p-2 hover:bg-cream-deep"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function HeavyBleedingCard({ title }: { title: string }) {
  return (
    <Card sticker tone="cherry" className="flex flex-wrap items-center gap-4 border-cherry/40">
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-cherry text-cream">
        <Droplets className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-[0.18em] text-cherry-deep uppercase">Blood loss warning</p>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-ink-soft">
          A score over 100 (about 80 mL) is heavy menstrual bleeding. It can cause anaemia and has treatable causes such as fibroids or polyps. It now leads your doctor report.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/report" size="sm">
          Doctor report
        </ButtonLink>
        <ButtonLink href="/consult" variant="outline" size="sm">
          Ask a doctor
        </ButtonLink>
      </div>
    </Card>
  );
}

const TOOLS = [
  { href: '/consult', icon: Stethoscope, title: 'Consult a doctor', text: 'Async chat · reply in 4–12 h', tint: 'bg-dusk-soft text-dusk-deep' },
  { href: '/meds', icon: Pill, title: 'Medicine guardian', text: 'Timing, clashes, missed pill', tint: 'bg-olive-soft text-olive-deep' },
  { href: '/ec', icon: ShieldQuestion, title: 'Had an accident?', text: 'Emergency contraception plan', tint: 'bg-ochre-soft text-ochre-deep' },
] as const;

function Tools() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {TOOLS.map((t) => (
        <Link key={t.href} href={t.href} className="group flex items-center gap-3 rounded-card border border-line bg-paper p-4 shadow-lift transition-transform hover:-translate-y-0.5">
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', t.tint)}>
            <t.icon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{t.title}</span>
            <span className="block text-sm text-ink-soft">{t.text}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-1" />
        </Link>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useDashboard();
  const [hour] = useState(() => new Date().getHours());

  if (isLoading) return <PageLoader label="Reading your cycle…" />;
  if (error || !data) return <ErrorNote error={error} />;

  const name = firstName(data.user.name ?? user?.name);
  const heavy = data.redFlags.find((f) => f.code === 'PBAC_HEAVY');

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-ink-soft">{formatDay(data.today, { weekday: true })}</p>
          <h1 className="text-4xl leading-none font-semibold sm:text-5xl">
            {greeting(hour)}
            {name ? `, ${name}` : ''} {hour < 17 ? '' : ''}
          </h1>
        </div>
        {data.streak > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-clay px-4 py-2 font-display font-semibold shadow-lift">
            <Flame className="size-5" /> {data.streak}-day streak
          </span>
        )}
      </header>

      <Reminders />

      {heavy && (
        <Appear tone="danger" label="Warning">
          <HeavyBleedingCard title={heavy.title} />
        </Appear>
      )}

      {data.cycle ? (
        <CycleHero data={data} />
      ) : data.motherhood ? (
        <MotherhoodHero status={data.motherhood} compact />
      ) : data.user.lifeStage === 'PREGNANCY' || data.user.lifeStage === 'POSTPARTUM' ? (
        <MotherhoodDatePrompt stage={data.user.lifeStage} />
      ) : data.user.lifeStage === 'MENOPAUSE' ? null : (
        <EmptyCycle />
      )}

      <Tools />

      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
        <MoodCheckIn data={data} />
        <div className="space-y-4">
          {data.suggestions.slice(0, 2).map((s) => (
            <Link
              key={`${s.type}-${s.screening ?? ''}`}
              href={s.type === 'SCREENING' && s.screening ? `/checks/${s.screening}` : SUGGESTION_LINKS[s.type].href}
              className={cn(
                'group flex items-center gap-4 rounded-card border border-ink/10 p-4 shadow-lift transition-transform hover:-translate-y-0.5',
                s.type === 'DANGER_CHECK' ? 'bg-cherry-soft' : 'bg-paper',
              )}
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ochre-soft text-ochre-deep">
                {(() => {
                  const Icon = SUGGESTION_LINKS[s.type].icon;
                  return <Icon className="size-5" strokeWidth={1.8} />;
                })()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  {s.type === 'SCREENING' && s.screening ? `Take the ${SCREENINGS[s.screening].title}` : s.title}
                </span>
                <span className="line-clamp-1 text-sm text-ink-soft">{s.reason}</span>
              </span>
              <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
          {data.suggestions.length === 0 && (
            <Card tone="sage" className="flex items-center gap-4">
              <Sticker className="relative size-20 shrink-0" textClassName="px-2 text-[11px]" color="#D9AA55" tilt={-8}>
                All good
              </Sticker>
              <p className="text-sm">Nothing needs your attention right now. Keep logging and Cherri will keep watching for patterns.</p>
            </Card>
          )}
        </div>
      </div>

      {data.redFlags.filter((f) => f.code !== 'PBAC_HEAVY').length > 0 && (
        <section>
          <SectionTitle eyebrow="Worth a look" title="To raise with a doctor" action={<ButtonLink href="/insights" variant="ghost" size="sm">Details <ArrowRight className="size-4" /></ButtonLink>} />
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
            {data.redFlags
              .filter((f) => f.code !== 'PBAC_HEAVY')
              .slice(0, 4)
              .map((flag) => (
                <li key={flag.code}>
                  <Link href="/insights" className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-cream">
                    <span className={cn('size-2.5 shrink-0 rounded-full', flag.severity === 'URGENT' ? 'bg-cherry' : flag.severity === 'WARNING' ? 'bg-ochre' : 'bg-dusk')} />
                    <span className="flex-1 font-medium">{flag.title}</span>
                    <ArrowRight className="size-4 text-ink-faint" />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
