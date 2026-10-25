'use client';

import { firstName, formatDay, greeting, moodScale, phaseColors, relativeDay, SCREENINGS, type DashboardResponse, type Suggestion } from '@cherri/shared';
import { ArrowRight, Flame, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { Blob, Sticker } from '@/components/brand/decor';
import { CycleWheel } from '@/components/cycle/cycle-wheel';
import { FlagCard, PatternCard } from '@/components/insights/cards';
import { TalkToLog } from '@/components/log/talk-to-log';
import { MotherhoodHero } from '@/components/motherhood/motherhood-hero';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { EvidenceMeter, ErrorNote, PageLoader } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { useDashboard, useInvalidateHealth, useSaveLog } from '@/lib/queries';

const TIP_ICONS = { NOURISH: '🥣', MOVE: '🧘‍♀️', CARE: '🫶', KNOW: '💡' } as const;

const SUGGESTION_LINKS: Record<Suggestion['type'], { href: string; emoji: string }> = {
  LOG_TODAY: { href: '/log', emoji: '✍️' },
  SCREENING: { href: '/checks', emoji: '🩺' },
  UPLOAD_LABS: { href: '/labs', emoji: '🧪' },
  LOG_BP: { href: '/log', emoji: '💓' },
  DANGER_CHECK: { href: '/pregnancy#check', emoji: '🚨' },
  VISIT_PREP: { href: '/prep', emoji: '📋' },
};

function MotherhoodDatePrompt({ stage }: { stage: 'PREGNANCY' | 'POSTPARTUM' }) {
  return (
    <Card sticker tone="olive" className="flex flex-wrap items-center justify-between gap-4">
      <div className="max-w-lg">
        <h2 className="text-2xl font-semibold">{stage === 'PREGNANCY' ? 'Add your due date 🤰' : 'Add your baby’s birth date 👶'}</h2>
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
      <div className="grid items-center gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,280px)_1fr]">
        <CycleWheel day={cycle.day} cycleLength={cycle.expectedLength} periodLength={cycle.periodLength} className="mx-auto w-full max-w-[280px]">
          <div>
            <p className="text-xs font-bold tracking-widest text-ink-soft uppercase">Day</p>
            <p className="font-display text-6xl leading-none font-semibold">{cycle.day}</p>
            <p className="mt-1 text-sm font-bold" style={{ color: colors.ink }}>
              {cycle.guide.emoji} {cycle.guide.vibe}
            </p>
          </div>
        </CycleWheel>
        <div>
          <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase" style={{ background: colors.soft, color: colors.ink }}>
            {cycle.isPeriod ? 'On your period' : cycle.guide.name}
          </span>
          <h2 className="mt-3 text-2xl leading-tight font-semibold sm:text-3xl lg:text-4xl">{cycle.guide.description}</h2>
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
            onClick={() => save.mutate({ mood: m.value }, { onSuccess: () => toast(`Mood saved: ${m.label}`, m.emoji) })}
            className={cn('flex flex-1 flex-col items-center gap-1 rounded-2xl py-2.5 text-xs font-bold transition-colors', current === m.value ? 'bg-paper shadow-lift ring-2 ring-ink' : 'hover:bg-paper/60')}
            aria-pressed={current === m.value}
          >
            <span className="text-3xl">{m.emoji}</span>
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
        <h2 className="text-3xl font-semibold">Let’s find your rhythm 🌙</h2>
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

export default function HomePage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useDashboard();
  const [hour] = useState(() => new Date().getHours());

  if (isLoading) return <PageLoader label="Reading your cycle…" />;
  if (error || !data) return <ErrorNote error={error} />;

  const name = firstName(data.user.name ?? user?.name);
  const tips = data.cycle?.guide.tips ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-ink-soft">{formatDay(data.today, { weekday: true })}</p>
          <h1 className="text-4xl leading-none font-semibold sm:text-5xl">
            {greeting(hour)}
            {name ? `, ${name}` : ''} {hour < 17 ? '☀️' : '🌙'}
          </h1>
        </div>
        {data.streak > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-clay px-4 py-2 font-display font-semibold shadow-lift">
            <Flame className="size-5" /> {data.streak}-day streak
          </span>
        )}
      </header>

      {data.cycle ? (
        <CycleHero data={data} />
      ) : data.motherhood ? (
        <MotherhoodHero status={data.motherhood} compact />
      ) : data.user.lifeStage === 'PREGNANCY' || data.user.lifeStage === 'POSTPARTUM' ? (
        <MotherhoodDatePrompt stage={data.user.lifeStage} />
      ) : data.user.lifeStage === 'MENOPAUSE' ? null : (
        <EmptyCycle />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
        <MoodCheckIn data={data} />
        <div className="space-y-4">
          {data.suggestions.map((s) => (
            <Link
              key={`${s.type}-${s.screening ?? ''}`}
              href={s.type === 'SCREENING' && s.screening ? `/checks/${s.screening}` : SUGGESTION_LINKS[s.type].href}
              className={cn(
                'group flex items-center gap-4 rounded-card border border-ink/10 p-4 shadow-lift transition-transform hover:-translate-y-0.5',
                s.type === 'DANGER_CHECK' ? 'bg-cherry-soft' : 'bg-paper',
              )}
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ochre text-2xl">{SUGGESTION_LINKS[s.type].emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-semibold">
                  {s.type === 'SCREENING' && s.screening ? `Take the ${SCREENINGS[s.screening].title}` : s.title}
                </span>
                <span className="line-clamp-2 text-sm text-ink-soft">{s.reason}</span>
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

      {data.redFlags.length > 0 && (
        <section>
          <SectionTitle eyebrow="Worth a look" title="Things to raise with a doctor" action={<ButtonLink href="/report" variant="outline" size="sm">Doctor report</ButtonLink>} />
          <div className="grid gap-4 md:grid-cols-3">
            {data.redFlags.map((flag) => (
              <FlagCard key={flag.code} flag={flag} />
            ))}
          </div>
        </section>
      )}

      {data.user.lifeStage !== 'PREGNANCY' && data.user.lifeStage !== 'POSTPARTUM' && (
        <section>
          <SectionTitle eyebrow="Pattern Radar" title="What your body keeps telling you" action={<ButtonLink href="/insights" variant="ghost" size="sm">See all <ArrowRight className="size-4" /></ButtonLink>} />
          {data.patternsReady && data.patterns.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {data.patterns.map((p) => (
                <PatternCard key={`${p.feature}-${p.window}`} pattern={p} compact />
              ))}
            </div>
          ) : (
            <Card tone="cream" className="text-sm text-ink-soft">
              📡 Pattern Radar switches on after about two cycles of logs. Every day you log makes it sharper.
            </Card>
          )}
        </section>
      )}

      {tips.length > 0 && data.cycle && (
        <section>
          <SectionTitle eyebrow={`${data.cycle.guide.emoji} ${data.cycle.guide.vibe}`} title="Little things for this phase" />
          <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
            {tips.map((tip) => (
              <Card key={tip.text} className="w-72 shrink-0 snap-start">
                <span className="text-3xl">{TIP_ICONS[tip.kind]}</span>
                <p className="mt-3 text-[15px] font-semibold">{tip.text}</p>
                <EvidenceMeter level={tip.evidence} className="mt-4" />
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
