'use client';

import { addDays, dueDateFromLmp, todayIn, type CompanionTone, type DemoPersona, type Language, type LifeStage } from '@cherri/shared';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Blob } from '@/components/brand/decor';
import { CherryMark, Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { FieldError, Input } from '@/components/ui/field';
import { PageLoader } from '@/components/ui/misc';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';

const STAGES: Array<{ value: LifeStage; label: string; emoji: string }> = [
  { value: 'CYCLE', label: 'Tracking my cycle', emoji: '' },
  { value: 'TTC', label: 'Trying to conceive', emoji: '' },
  { value: 'PREGNANCY', label: 'Pregnant', emoji: '' },
  { value: 'POSTPARTUM', label: 'Postpartum', emoji: '' },
  { value: 'PERIMENOPAUSE', label: 'Perimenopause', emoji: '' },
  { value: 'MENOPAUSE', label: 'Menopause', emoji: '' },
];

const TONES: Array<{ value: CompanionTone; label: string; emoji: string; sample: string }> = [
  { value: 'BESTIE', label: 'Bestie', emoji: '', sample: '“Ugh cramps are the worst. Hot water bag + chai, let’s go.”' },
  { value: 'BIG_SIS', label: 'Big sis', emoji: '', sample: '“That sounds rough. Here’s what usually helps…”' },
  { value: 'CLINICAL', label: 'Straight facts', emoji: '', sample: '“Dysmenorrhoea is common. NSAIDs work best taken early.”' },
];

const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'hinglish', label: 'Hinglish' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'kn', label: 'ಕನ್ನಡ' },
];

function Stepper({ value, onChange, min, max, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; suffix: string }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="grid size-11 place-items-center rounded-full border border-ink/10 text-xl font-bold hover:bg-ink hover:text-cream">
        −
      </button>
      <span className="w-24 text-center font-display text-3xl font-semibold">
        {value}
        <span className="ml-1 text-base text-ink-soft">{suffix}</span>
      </span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="grid size-11 place-items-center rounded-full border border-ink/10 text-xl font-bold hover:bg-ink hover:text-cream">
        +
      </button>
    </div>
  );
}

export default function OnboardingPage() {
  const { status, user, setUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<'save' | 'demo' | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Read the clock after mount: prerendered HTML must not bake in a date.
  const [today, setToday] = useState<string>();
  useEffect(() => setToday(todayIn('Asia/Kolkata')), []);
  const [form, setForm] = useState({
    name: '',
    lifeStage: 'CYCLE' as LifeStage,
    lastPeriodStart: '',
    avgCycleLength: 28,
    avgPeriodLength: 5,
    dueDate: '',
    deliveryDate: '',
    companionTone: 'BESTIE' as CompanionTone,
    language: 'en' as Language,
    consent: false,
  });

  useEffect(() => {
    if (status === 'signedOut') router.replace('/login');
    if (status === 'signedIn' && user?.onboarded && !busy) router.replace('/home');
    if (user?.name) setForm((f) => (f.name ? f : { ...f, name: user.name ?? '' }));
  }, [status, user, busy, router]);

  if (status !== 'signedIn' || !user) return <PageLoader />;

  const tracksPeriods = form.lifeStage === 'CYCLE' || form.lifeStage === 'TTC' || form.lifeStage === 'PERIMENOPAUSE';
  const stageStep = tracksPeriods ? ['cycle'] : form.lifeStage === 'PREGNANCY' ? ['due'] : form.lifeStage === 'POSTPARTUM' ? ['birth'] : [];
  const steps = ['name', 'stage', ...stageStep, 'vibe', 'consent'];
  const current = steps[step];
  const last = step === steps.length - 1;

  async function finish() {
    setBusy('save');
    setError(null);
    try {
      const updated = await api.me.onboard({
        name: form.name.trim() || undefined,
        lifeStage: form.lifeStage,
        language: form.language,
        companionTone: form.companionTone,
        consent: true,
        ...(tracksPeriods && { avgCycleLength: form.avgCycleLength, avgPeriodLength: form.avgPeriodLength }),
        ...(tracksPeriods && form.lastPeriodStart && { lastPeriodStart: form.lastPeriodStart }),
        ...(form.lifeStage === 'PREGNANCY' && form.dueDate && { dueDate: form.dueDate }),
        ...(form.lifeStage === 'POSTPARTUM' && form.deliveryDate && { deliveryDate: form.deliveryDate }),
      });
      setUser(updated);
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
      setBusy(null);
    }
  }

  async function loadDemo(persona: DemoPersona) {
    setBusy('demo');
    setError(null);
    try {
      await api.demo.load(persona);
      setUser(await api.me.get());
      router.replace('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load demo data.');
      setBusy(null);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden px-5 py-8">
      <Blob className="absolute -top-24 -right-24 size-80 opacity-70" color="#D69AB5" />
      <Blob className="absolute -bottom-28 -left-24 size-96 opacity-60" color="#8FAAA3" variant={1} />
      <div className="relative mx-auto flex max-w-xl flex-col">
        <div className="mb-10 flex items-center justify-between">
          <Logo />
          <span className="text-sm font-bold text-ink-soft">
            {step + 1} / {steps.length}
          </span>
        </div>
        <div className="mb-8 h-2 overflow-hidden rounded-full bg-cream-deep">
          <motion.div className="h-full rounded-full bg-ink" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.section key={current} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
            {current === 'name' && (
              <>
                <CherryMark className="mb-4 size-16 animate-float" mood="wink" />
                <h1 className="text-4xl font-semibold sm:text-5xl">Hi! What should Cherri call you?</h1>
                <Input className="mt-6 h-14 text-lg" autoFocus placeholder="Your first name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {user.isGuest && (
                  <div className="mt-8 rounded-card border border-dashed border-ink/30 p-5">
                    <p className="font-bold">Just exploring?</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Load 7 months of cycle data for “Ananya”, or “Meera”, 30 weeks pregnant, and see every feature light up.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void loadDemo('ananya')}>
                        <Sparkles className="size-4" /> {busy === 'demo' ? 'Loading…' : 'Ananya: cycle tracking'}
                      </Button>
                      <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void loadDemo('meera')}>
                        Meera: pregnancy
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {current === 'stage' && (
              <>
                <h1 className="text-4xl font-semibold sm:text-5xl">Where are you in life right now?</h1>
                <p className="mt-2 text-ink-soft">Cherri adapts everything to this. You can change it anytime.</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {STAGES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm({ ...form, lifeStage: s.value })}
                      className={cn(
                        'flex flex-col items-start gap-2 rounded-3xl border p-4 text-left font-bold transition-all',
                        form.lifeStage === s.value ? 'border-ink bg-olive shadow-lift' : 'border-line bg-paper hover:border-ink',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {current === 'cycle' && (
              <>
                <h1 className="text-4xl font-semibold sm:text-5xl">When did your last period start?</h1>
                <p className="mt-2 text-ink-soft">A rough guess is fine. Cherri learns your real rhythm with every cycle.</p>
                <Input type="date" max={today} className="mt-6 h-14 text-lg" value={form.lastPeriodStart} onChange={(e) => setForm({ ...form, lastPeriodStart: e.target.value })} />
                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 font-bold">Cycle usually lasts</p>
                    <Stepper value={form.avgCycleLength} onChange={(v) => setForm({ ...form, avgCycleLength: v })} min={18} max={60} suffix="days" />
                  </div>
                  <div>
                    <p className="mb-2 font-bold">Period usually lasts</p>
                    <Stepper value={form.avgPeriodLength} onChange={(v) => setForm({ ...form, avgPeriodLength: v })} min={1} max={12} suffix="days" />
                  </div>
                </div>
              </>
            )}

            {current === 'due' && (
              <>
                <h1 className="text-4xl font-semibold sm:text-5xl">When is your baby due?</h1>
                <p className="mt-2 text-ink-soft">Your scan or doctor gives you this date. Cherri uses it for your weekly care plan and danger-sign checks.</p>
                <Input
                  type="date"
                  min={today ? addDays(today, -21) : undefined}
                  className="mt-6 h-14 text-lg"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
                <label className="mt-6 block">
                  <span className="text-sm font-semibold">Not sure? Enter the first day of your last period instead</span>
                  <Input
                    type="date"
                    max={today}
                    className="mt-2"
                    onChange={(e) => e.target.value && setForm({ ...form, dueDate: dueDateFromLmp(e.target.value) })}
                  />
                </label>
              </>
            )}

            {current === 'birth' && (
              <>
                <h1 className="text-4xl font-semibold sm:text-5xl">When was your baby born?</h1>
                <p className="mt-2 text-ink-soft">Cherri will walk you through the first six weeks: check-ups, danger signs and taking care of you too.</p>
                <Input type="date" max={today} className="mt-6 h-14 text-lg" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
              </>
            )}

            {current === 'vibe' && (
              <>
                <h1 className="text-4xl font-semibold sm:text-5xl">How should Cherri talk to you?</h1>
                <div className="mt-6 space-y-3">
                  {TONES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, companionTone: t.value })}
                      className={cn('flex w-full items-start gap-4 rounded-3xl border p-4 text-left transition-all', form.companionTone === t.value ? 'border-ink bg-ochre shadow-lift' : 'border-line bg-paper hover:border-ink')}
                    >
                      <span>
                        <span className="block font-display text-lg font-semibold">{t.label}</span>
                        <span className="text-sm text-ink-soft">{t.sample}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-6 mb-2 font-bold">Language</p>
                <div className="flex gap-2">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setForm({ ...form, language: l.value })}
                      className={cn('rounded-full border px-5 py-2.5 font-bold', form.language === l.value ? 'border-ink bg-ink text-cream' : 'border-line bg-paper')}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {current === 'consent' && (
              <>
                <h1 className="text-4xl font-semibold sm:text-5xl">Your data, your rules</h1>
                <ul className="mt-6 space-y-3 text-[15px]">
                  {[
                    'Your notes and chats are encrypted before they are stored.',
                    'Cherri never sells your data or shows you ads.',
                    'AI providers only ever see summaries, never your phone number or email.',
                    'Export or permanently delete everything from Settings, anytime.',
                  ].map((line) => (
                    <li key={line} className="flex gap-3 rounded-2xl bg-paper p-3">
                      <span></span>
                      {line}
                    </li>
                  ))}
                </ul>
                <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-3xl border border-ink/10 bg-olive-soft p-4">
                  <input type="checkbox" className="mt-1 size-5 accent-[#2E2230]" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
                  <span className="text-sm font-semibold">
                    I agree that Cherri can store my health data securely to give me insights. Cherri gives information, not a diagnosis.
                  </span>
                </label>
              </>
            )}
          </motion.section>
        </AnimatePresence>

        <FieldError>{error}</FieldError>

        <div className="mt-10 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || busy !== null} className={step === 0 ? 'invisible' : ''}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          {last ? (
            <Button variant="olive" size="lg" disabled={!form.consent || busy !== null} onClick={() => void finish()}>
              {busy === 'save' ? 'Saving…' : 'Start my Cherri'} <ArrowRight className="size-5" />
            </Button>
          ) : (
            <Button size="lg" onClick={() => setStep((s) => s + 1)} disabled={busy !== null}>
              Next <ArrowRight className="size-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
