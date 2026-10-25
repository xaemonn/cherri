'use client';

import {
  addDays,
  classifyBloodPressure,
  energyScale,
  FLOW_LEVELS,
  flowStyles,
  formatDay,
  isEmptyPbac,
  pbacDayScore,
  moodScale,
  symptomCategoriesFor,
  SYMPTOMS,
  todayIn,
  type BloodPressureLevel,
  type FlowLevel,
  type PbacEntry,
  type SymptomCategory,
  type SymptomCode,
} from '@cherri/shared';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { Droplets, HeartPulse, ListChecks, Sun } from 'lucide-react';
import { PbacCard } from '@/components/log/pbac-card';
import { Tabs } from '@/components/ui/tabs';
import { ScaleIcon } from '@/components/ui/scale-icon';
import { TalkToLog } from '@/components/log/talk-to-log';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Input, Textarea } from '@/components/ui/field';
import { PageHeader, Spinner } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { useLog, useSaveLog } from '@/lib/queries';

const CATEGORY_LABELS: Record<SymptomCategory, string> = {
  PAIN: 'Pain',
  BLEEDING: 'Bleeding & discharge',
  DIGESTION: 'Tummy',
  SKIN_HAIR: 'Skin & hair',
  MOOD: 'Mind & mood',
  ENERGY_SLEEP: 'Energy & sleep',
  BODY: 'Body',
  PREGNANCY: 'Pregnancy signs',
};

const PAIN_FACES = ['', '', '', '', '', '', '', '', '', '', ''];

const BP_LABELS: Record<BloodPressureLevel, { label: string; className: string }> = {
  NORMAL: { label: 'In the healthy range', className: 'bg-olive-soft text-olive-deep' },
  ELEVATED: { label: 'A little high', className: 'bg-ochre-soft text-ochre-deep' },
  HIGH: { label: 'High: 140/90 or more', className: 'bg-clay-soft text-clay-deep' },
  SEVERE: { label: 'Very high: get help now', className: 'bg-cherry text-cream' },
};

interface FormState {
  flow: FlowLevel | null;
  painLevel: number | null;
  mood: number | null;
  energy: number | null;
  sleepHours: number | null;
  /** Kept as typed text so half-entered numbers aren't rewritten. */
  systolic: string;
  diastolic: string;
  weightKg: string;
  symptoms: Map<SymptomCode, number>;
  notes: string;
  pbac: PbacEntry;
}

const EMPTY: FormState = {
  flow: null,
  painLevel: null,
  mood: null,
  energy: null,
  sleepHours: null,
  systolic: '',
  diastolic: '',
  weightKg: '',
  symptoms: new Map(),
  notes: '',
  pbac: {},
};

const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

function celebrate() {
  void confetti({ particleCount: 70, spread: 70, origin: { y: 0.8 }, colors: ['#D69AB5', '#D9AA55', '#8FAAA3', '#C48A5A', '#A8432C'] });
}

export default function LogPage() {
  const { user } = useAuth();
  const today = useMemo(() => todayIn(user?.timezone ?? 'Asia/Kolkata'), [user?.timezone]);
  const [date, setDate] = useState(today);
  const { data, isLoading, dataUpdatedAt } = useLog(date);
  const save = useSaveLog(date);
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [tab, setTab] = useState<'today' | 'bleeding' | 'symptoms' | 'vitals'>('today');

  useEffect(() => {
    const log = data?.log;
    setForm(
      log
        ? {
            flow: log.flow,
            painLevel: log.painLevel,
            mood: log.mood,
            energy: log.energy,
            sleepHours: log.sleepHours,
            systolic: log.systolic?.toString() ?? '',
            diastolic: log.diastolic?.toString() ?? '',
            weightKg: log.weightKg?.toString() ?? '',
            symptoms: new Map(log.symptoms.map((s) => [s.code as SymptomCode, s.severity])),
            notes: log.notes ?? '',
            pbac: log.pbac ?? {},
          }
        : EMPTY,
    );
  }, [data, date]);

  const categories = symptomCategoriesFor(user?.lifeStage ?? 'CYCLE');
  const systolic = numberOrNull(form.systolic);
  const diastolic = numberOrNull(form.diastolic);
  const bpLevel = systolic && diastolic && systolic > diastolic ? classifyBloodPressure(systolic, diastolic) : null;
  const caresAboutVitals = user?.lifeStage === 'PREGNANCY' || user?.lifeStage === 'POSTPARTUM';

  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -i));

  function toggleSymptom(code: SymptomCode) {
    setForm((f) => {
      const symptoms = new Map(f.symptoms);
      if (symptoms.has(code)) symptoms.delete(code);
      else symptoms.set(code, 2);
      return { ...f, symptoms };
    });
  }

  function setSeverity(code: SymptomCode, severity: number) {
    setForm((f) => ({ ...f, symptoms: new Map(f.symptoms).set(code, severity) }));
  }

  function submit() {
    if ((systolic === null) !== (diastolic === null)) {
      toast('Add both blood pressure numbers, like 120 / 80.');
      return;
    }
    save.mutate(
      {
        flow: form.flow,
        painLevel: form.painLevel,
        mood: form.mood,
        energy: form.energy,
        sleepHours: form.sleepHours,
        systolic,
        diastolic,
        weightKg: numberOrNull(form.weightKg),
        notes: form.notes.trim() || null,
        pbac: isEmptyPbac(form.pbac) ? null : form.pbac,
        symptoms: [...form.symptoms.entries()].map(([code, severity]) => ({ code, severity })),
      },
      {
        onSuccess: () => {
          celebrate();
          toast(date === today ? 'Today is logged. Proud of you!' : `Saved ${formatDay(date)}`);
        },
        onError: (error) => toast(error.message),
      },
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Daily log" title="How’s your body today?">
        Tap what fits, or just tell Cherri in your own words.
      </PageHeader>

      <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {days.map((d, i) => (
          <button
            key={d}
            type="button"
            onClick={() => setDate(d)}
            className={cn(
              'flex min-w-16 shrink-0 flex-col items-center rounded-2xl border px-3 py-2 font-bold transition-all',
              d === date ? 'border-ink bg-ink text-cream shadow-lift' : 'border-line bg-paper hover:border-ink',
            )}
          >
            <span className="text-[11px] tracking-wide uppercase opacity-70">{i === 0 ? 'Today' : i === 1 ? 'Yest.' : formatDay(d, { weekday: true }).split(',')[0]}</span>
            <span className="font-display text-xl">{Number(d.slice(8))}</span>
          </button>
        ))}
      </div>

      <TalkToLog date={date} className="mb-6" />

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
        <Tabs
          className="mb-5"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'today', label: 'Today', icon: Sun },
            { id: 'bleeding', label: 'Blood loss', icon: Droplets, badge: form.pbac && !isEmptyPbac(form.pbac) ? pbacDayScore(form.pbac) : null },
            { id: 'symptoms', label: 'Symptoms', icon: ListChecks, badge: form.symptoms.size || null },
            { id: 'vitals', label: 'Vitals', icon: HeartPulse },
          ]}
        />
        <div className="grid gap-5 lg:grid-cols-2">
          {tab === 'today' && (
          <>
          <Card tone="cherry">
            <h2 className="text-xl font-semibold">Period flow</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {FLOW_LEVELS.map((flow) => (
                <Chip key={flow} selected={form.flow === flow} onClick={() => setForm({ ...form, flow: form.flow === flow ? null : flow })}>
                  {flow === 'NONE' ? '' : ''.repeat(Math.max(1, flowStyles[flow].drops))} {flowStyles[flow].label}
                </Chip>
              ))}
            </div>
          </Card>

          <Card tone="clay">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Pain</h2>
              <span className="font-display text-2xl font-semibold">
                {form.painLevel === null ? '—' : `${PAIN_FACES[form.painLevel]} ${form.painLevel}/10`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={form.painLevel ?? 0}
              onChange={(e) => setForm({ ...form, painLevel: Number(e.target.value) })}
              className="mt-5 w-full"
              aria-label="Pain level"
            />
            <div className="mt-1 flex justify-between text-xs font-semibold text-clay-deep">
              <span>No pain</span>
              <button type="button" className="underline" onClick={() => setForm({ ...form, painLevel: null })}>
                clear
              </button>
              <span>Worst ever</span>
            </div>
          </Card>
          </>
          )}

          {tab === 'bleeding' && (
          <PbacCard
            key={`${date}-${dataUpdatedAt}`}
            value={form.pbac}
            onChange={(pbac) => setForm((f) => ({ ...f, pbac }))}
            defaultOpen
          />
          )}

          {tab === 'today' && (
          <>
          <Card tone="dusk">
            <h2 className="text-xl font-semibold">Mood</h2>
            <ScaleRow kind="mood" items={moodScale} value={form.mood} onChange={(mood) => setForm({ ...form, mood })} />
            <h2 className="mt-5 text-xl font-semibold">Energy</h2>
            <ScaleRow kind="energy" items={energyScale} value={form.energy} onChange={(energy) => setForm({ ...form, energy })} />
          </Card>

          <Card tone="sage">
            <h2 className="text-xl font-semibold">Sleep</h2>
            <div className="mt-4 flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setForm({ ...form, sleepHours: Math.max(0, (form.sleepHours ?? 7) - 0.5) })}>
                −
              </Button>
              <span className="font-display text-4xl font-semibold">{form.sleepHours ?? '—'}</span>
              <span className="font-bold text-sage-deep">hours</span>
              <Button variant="outline" size="sm" onClick={() => setForm({ ...form, sleepHours: Math.min(16, (form.sleepHours ?? 7) + 0.5) })}>
                +
              </Button>
            </div>
            <h2 className="mt-6 text-xl font-semibold">Notes</h2>
            <Textarea
              className="mt-3"
              placeholder="Anything else? Your doctor report can include these."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              maxLength={2000}
            />
          </Card>
          </>
          )}

          {tab === 'vitals' && (
          <Card tone={caresAboutVitals ? 'ochre' : 'paper'} className="lg:col-span-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold">Vitals</h2>
              <span className="text-sm text-ink-soft">
                {caresAboutVitals ? 'A weekly blood pressure reading helps catch pre-eclampsia early.' : 'Optional. Handy if you check at home.'}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-6">
              <div>
                <p className="mb-1.5 text-sm font-semibold">Blood pressure</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={60}
                    max={260}
                    placeholder="120"
                    aria-label="Systolic (top number)"
                    className="w-24 text-center"
                    value={form.systolic}
                    onChange={(e) => setForm({ ...form, systolic: e.target.value })}
                  />
                  <span className="font-display text-2xl">/</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={30}
                    max={160}
                    placeholder="80"
                    aria-label="Diastolic (bottom number)"
                    className="w-24 text-center"
                    value={form.diastolic}
                    onChange={(e) => setForm({ ...form, diastolic: e.target.value })}
                  />
                  <span className="text-sm font-semibold text-ink-soft">mmHg</span>
                </div>
              </div>
              <label>
                <span className="mb-1.5 block text-sm font-semibold">Weight</span>
                <span className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step={0.1}
                    min={25}
                    max={250}
                    placeholder="60"
                    className="w-28 text-center"
                    value={form.weightKg}
                    onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                  />
                  <span className="text-sm font-semibold text-ink-soft">kg</span>
                </span>
              </label>
              {bpLevel && (
                <span role="status" className={cn('rounded-full px-3 py-1.5 text-sm font-bold', BP_LABELS[bpLevel].className)}>
                  {BP_LABELS[bpLevel].label}
                </span>
              )}
            </div>
          </Card>
          )}

          {tab === 'symptoms' && (
          <Card className="lg:col-span-2">
            <h2 className="text-xl font-semibold">Symptoms</h2>
            <p className="text-sm text-ink-soft">Tap to add. Tap the dots to set how strong it was.</p>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              {categories.map((category) => (
                <div key={category}>
                  <h3 className="mb-2 text-xs font-semibold tracking-[0.16em] text-ink-soft uppercase">{CATEGORY_LABELS[category]}</h3>
                  <div className="flex flex-wrap gap-2">
                    {SYMPTOMS.filter((s) => s.category === category).map((s) => {
                      const severity = form.symptoms.get(s.code);
                      return (
                        <span key={s.code} className="inline-flex items-center gap-1">
                          <Chip selected={severity !== undefined} onClick={() => toggleSymptom(s.code)}>
                            {s.label}
                          </Chip>
                          {severity !== undefined && (
                            <span className="flex gap-0.5" role="radiogroup" aria-label={`${s.label} strength`}>
                              {[1, 2, 3].map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  role="radio"
                                  aria-checked={severity === level}
                                  aria-label={['Mild', 'Moderate', 'Strong'][level - 1]}
                                  onClick={() => setSeverity(s.code, level)}
                                  className={cn('size-3.5 rounded-full border border-ink/10', level <= severity ? 'bg-ink' : 'bg-paper')}
                                />
                              ))}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          )}
        </div>
        </>
      )}

      <div className="sticky bottom-24 z-30 mt-8 flex justify-start lg:bottom-6">
        <Button variant="olive" size="lg" onClick={submit} disabled={save.isPending || isLoading}>
          {save.isPending ? 'Saving…' : `Save ${date === today ? 'today' : formatDay(date)}`}
        </Button>
      </div>
    </div>
  );
}

function ScaleRow({
  items,
  kind,
  value,
  onChange,
}: {
  items: ReadonlyArray<{ value: number; label: string }>;
  kind: 'mood' | 'energy';
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="mt-3 flex justify-between gap-1">
      {items.map((item) => (
        <motion.button
          key={item.value}
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={() => onChange(value === item.value ? null : item.value)}
          aria-pressed={value === item.value}
          className={cn('flex flex-1 flex-col items-center rounded-2xl py-2 text-[11px] font-bold', value === item.value ? 'bg-paper shadow-lift ring-2 ring-ink' : 'hover:bg-paper/60')}
        >
          <ScaleIcon kind={kind} value={item.value} className="size-7" />
          {item.label}
        </motion.button>
      ))}
    </div>
  );
}
