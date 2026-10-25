'use client';

import { firstName, formatDay, greeting, moodScale, phaseColors, relativeDay, SCREENINGS, type DashboardResponse, type Suggestion } from '@cherri/shared';
import {
  ArrowRight,
  BellRing,
  CalendarHeart,
  ChevronDown,
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
import { Blob } from '@/components/brand/decor';
import { CycleWheel } from '@/components/cycle/cycle-wheel';
import { MotherhoodHero } from '@/components/motherhood/motherhood-hero';
import { Appear } from '@/components/ui/appear';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorNote, PageLoader } from '@/components/ui/misc';
import { ScaleIcon } from '@/components/ui/scale-icon';
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

const ACTIONS: Array<{ href: string; label: string; icon: LucideIcon; tint: string }> = [
  { href: '/log', label: 'Log today', icon: NotebookPen, tint: 'bg-olive-soft text-olive-deep' },
  { href: '/consult', label: 'Ask a doctor', icon: Stethoscope, tint: 'bg-dusk-soft text-dusk-deep' },
  { href: '/meds', label: 'Medicines', icon: Pill, tint: 'bg-sage-soft text-sage-deep' },
  { href: '/ec', label: 'Accident help', icon: ShieldQuestion, tint: 'bg-ochre-soft text-ochre-deep' },
];

/** A small dashboard tile: icon, label, one big value, one quiet line. */
function Tile({ icon: Icon, label, value, hint, tint, className }: { icon: LucideIcon; label: string; value: string; hint?: string; tint: string; className?: string }) {
  return (
    <div className={cn('rounded-card border border-line bg-paper p-5', className)}>
      <span className={cn('grid size-9 place-items-center rounded-xl', tint)}>
        <Icon className="size-[18px]" strokeWidth={1.8} />
      </span>
      <p className="mt-4 text-xs font-semibold tracking-wide text-ink-soft uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl leading-tight font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}

function CycleTile({ data }: { data: DashboardResponse }) {
  const cycle = data.cycle!;
  const colors = phaseColors[cycle.phase];
  return (
    <div className="flex items-center gap-5 rounded-card border border-line bg-paper p-5 sm:col-span-2 lg:row-span-2 lg:flex-col lg:justify-center lg:text-center">
      <CycleWheel day={cycle.day} cycleLength={cycle.expectedLength} periodLength={cycle.periodLength} className="w-32 shrink-0 lg:w-44">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-ink-soft uppercase">Day</p>
          <p className="font-display text-4xl leading-none font-semibold">{cycle.day}</p>
        </div>
      </CycleWheel>
      <div>
        <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ background: colors.soft, color: colors.ink }}>
          {cycle.isPeriod ? 'On your period' : cycle.guide.name}
        </span>
        <p className="mt-2 font-semibold">{cycle.guide.vibe}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft lg:justify-center">
          <Sparkles className="size-3.5" /> {cycle.confidenceNote}
        </p>
      </div>
    </div>
  );
}

function MoodTile({ data }: { data: DashboardResponse }) {
  const save = useSaveLog(data.today);
  const toast = useToast();
  const current = data.todayLog?.mood ?? null;
  return (
    <div className="rounded-card border border-line bg-dusk-soft p-5">
      <p className="text-xs font-semibold tracking-wide text-dusk-deep uppercase">Today’s mood</p>
      <div className="mt-3 flex justify-between gap-1">
        {moodScale.map((m) => (
          <motion.button
            key={m.value}
            type="button"
            whileTap={{ scale: 0.88 }}
            onClick={() => save.mutate({ mood: m.value }, { onSuccess: () => toast(`Mood saved: ${m.label}`) })}
            aria-pressed={current === m.value}
            aria-label={m.label}
            title={m.label}
            className={cn('grid size-11 place-items-center rounded-full transition-colors', current === m.value ? 'bg-dusk-deep text-white' : 'text-dusk-deep hover:bg-paper')}
          >
            <ScaleIcon kind="mood" value={m.value} className="size-6" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Actions() {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-card border border-line bg-paper p-3">
      {ACTIONS.map((a) => (
        <Link key={a.href} href={a.href} className="flex flex-col items-center gap-2 rounded-2xl p-3 text-center text-sm font-semibold transition-colors hover:bg-cream">
          <span className={cn('grid size-11 place-items-center rounded-2xl', a.tint)}>
            <a.icon className="size-5" strokeWidth={1.8} />
          </span>
          {a.label}
        </Link>
      ))}
    </div>
  );
}

interface Alert {
  id: string;
  tone: 'danger' | 'warning' | 'info';
  icon: LucideIcon;
  title: string;
  detail?: string;
  href?: string;
  onDismiss?: () => void;
}

const TONE: Record<Alert['tone'], { dot: string; icon: string }> = {
  danger: { dot: 'bg-cherry', icon: 'bg-cherry-soft text-cherry-deep' },
  warning: { dot: 'bg-ochre', icon: 'bg-ochre-soft text-ochre-deep' },
  info: { dot: 'bg-dusk', icon: 'bg-dusk-soft text-dusk-deep' },
};

/** Everything that needs her attention, in one list. Details open on tap. */
function Alerts({ data }: { data: DashboardResponse }) {
  const queryClient = useQueryClient();
  const reminders = useQuery({ queryKey: keys.reminders, queryFn: api.reminders.list });
  const [open, setOpen] = useState<string | null>(null);

  const alerts: Alert[] = [
    ...(reminders.data ?? []).map<Alert>((r) => ({
      id: r.id,
      tone: r.due ? 'warning' : 'info',
      icon: BellRing,
      title: r.due ? `Today: ${r.title.toLowerCase()}` : r.title,
      detail: r.due ? 'Three weeks have passed, so a home urine test is reliable now.' : `Reminder set for ${formatDay(r.dueOn, { weekday: true })}.`,
      onDismiss: async () => {
        await api.reminders.dismiss(r.id);
        await queryClient.invalidateQueries({ queryKey: keys.reminders });
      },
    })),
    ...data.redFlags.map<Alert>((f) => ({
      id: f.code,
      tone: f.severity === 'URGENT' || f.code === 'PBAC_HEAVY' ? 'danger' : f.severity === 'WARNING' ? 'warning' : 'info',
      icon: f.code === 'PBAC_HEAVY' ? Droplets : TriangleAlert,
      title: f.title,
      detail: f.action,
      href: f.code === 'PBAC_HEAVY' ? '/report' : '/insights',
    })),
  ];

  if (alerts.length === 0) return null;
  const urgent = alerts.some((a) => a.tone === 'danger');

  return (
    <Appear tone={urgent ? 'danger' : 'warning'} label={`${alerts.length} alert${alerts.length > 1 ? 's' : ''}`}>
      <section aria-label="Alerts" className="overflow-hidden rounded-card border border-line bg-paper">
        <ul className="divide-y divide-line">
          {alerts.slice(0, 5).map((a) => {
            const isOpen = open === a.id;
            return (
              <li key={a.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', TONE[a.tone].icon)}>
                    <a.icon className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  <button type="button" onClick={() => setOpen(isOpen ? null : a.id)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <span className="truncate font-medium">{a.title}</span>
                    <ChevronDown className={cn('size-4 shrink-0 text-ink-faint transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {a.href && (
                    <Link href={a.href} className="hidden shrink-0 rounded-full border border-line px-3 py-1 text-xs font-semibold hover:bg-cream sm:inline">
                      Open
                    </Link>
                  )}
                  {a.onDismiss && (
                    <button type="button" aria-label="Dismiss" onClick={a.onDismiss} className="shrink-0 rounded-full p-1.5 text-ink-faint hover:bg-cream">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                {isOpen && a.detail && <p className="px-4 pb-4 pl-16 text-sm text-ink-soft">{a.detail}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </Appear>
  );
}

function MotherhoodDatePrompt({ stage }: { stage: 'PREGNANCY' | 'POSTPARTUM' }) {
  return (
    <Card sticker tone="olive" className="flex flex-wrap items-center justify-between gap-4">
      <div className="max-w-lg">
        <h2 className="text-2xl font-semibold">{stage === 'PREGNANCY' ? 'Add your due date' : 'Add your baby’s birth date'}</h2>
        <p className="mt-1 text-sm text-ink-soft">Unlocks your care plan and blood-pressure watch.</p>
      </div>
      <ButtonLink href="/pregnancy">Set it up</ButtonLink>
    </Card>
  );
}

function EmptyCycle() {
  const invalidate = useInvalidateHealth();
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAuth();
  return (
    <Card sticker tone="olive" className="relative overflow-hidden sm:col-span-2 lg:col-span-4">
      <Blob className="absolute -right-10 -bottom-12 size-48" color="#D9AA55" variant={2} />
      <div className="relative max-w-lg">
        <h2 className="text-2xl font-semibold">Let’s find your rhythm</h2>
        <p className="mt-2 text-ink-soft">Log your period and Cherri starts predicting.</p>
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

export default function HomePage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useDashboard();
  const [hour] = useState(() => new Date().getHours());

  if (isLoading) return <PageLoader label="Reading your cycle…" />;
  if (error || !data) return <ErrorNote error={error} />;

  const name = firstName(data.user.name ?? user?.name);
  const cycle = data.cycle;
  const next = cycle?.nextPeriod;
  const suggestion = data.suggestions[0];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-ink-soft">{formatDay(data.today, { weekday: true })}</p>
        <h1 className="mt-1 text-3xl leading-tight font-semibold sm:text-4xl">
          {greeting(hour)}
          {name ? `, ${name}` : ''}
        </h1>
      </header>

      <Alerts data={data} />

      {cycle ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CycleTile data={data} />
          <Tile
            icon={Droplets}
            label={next?.isLate ? 'Period is late' : 'Next period'}
            value={next ? (next.isLate ? `${next.daysLate} days late` : relativeDay(next.date, data.today)) : '—'}
            hint={next ? `${formatDay(next.windowStart)} – ${formatDay(next.windowEnd)}` : undefined}
            tint="bg-cherry-soft text-cherry-deep"
          />
          <Tile
            icon={CalendarHeart}
            label="Fertile window"
            value={`${formatDay(cycle.fertileWindow.start)} – ${formatDay(cycle.fertileWindow.end)}`}
            hint={`Ovulation ≈ ${formatDay(cycle.fertileWindow.ovulation)}`}
            tint="bg-ochre-soft text-ochre-deep"
          />
          <MoodTile data={data} />
          <Tile icon={Flame} label="Logging streak" value={`${data.streak} day${data.streak === 1 ? '' : 's'}`} hint="Keep it going" tint="bg-clay-soft text-clay-deep" />
        </div>
      ) : data.motherhood ? (
        <MotherhoodHero status={data.motherhood} compact />
      ) : data.user.lifeStage === 'PREGNANCY' || data.user.lifeStage === 'POSTPARTUM' ? (
        <MotherhoodDatePrompt stage={data.user.lifeStage} />
      ) : data.user.lifeStage === 'MENOPAUSE' ? null : (
        <EmptyCycle />
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Actions />
        {suggestion ? (
          <Link
            href={suggestion.type === 'SCREENING' && suggestion.screening ? `/checks/${suggestion.screening}` : SUGGESTION_LINKS[suggestion.type].href}
            className="group flex items-center gap-4 rounded-card border border-line bg-olive-soft p-5 transition-colors hover:bg-olive-soft/70"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-paper text-olive-deep">
              {(() => {
                const Icon = SUGGESTION_LINKS[suggestion.type].icon;
                return <Icon className="size-5" strokeWidth={1.8} />;
              })()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold tracking-wide text-olive-deep uppercase">Suggested next</span>
              <span className="mt-0.5 block font-semibold">
                {suggestion.type === 'SCREENING' && suggestion.screening ? `Take the ${SCREENINGS[suggestion.screening].title}` : suggestion.title}
              </span>
              <span className="line-clamp-1 text-sm text-ink-soft">{suggestion.reason}</span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-olive-deep transition-transform group-hover:translate-x-1" />
          </Link>
        ) : (
          <div className="flex items-center rounded-card border border-line bg-sage-soft p-5 text-sm font-medium text-sage-deep">Nothing needs your attention right now.</div>
        )}
      </div>
    </div>
  );
}
