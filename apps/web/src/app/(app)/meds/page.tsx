'use client';

import {
  MEDICINE_CLASS_LABELS,
  medicineGuidance,
  missedPillAdvice,
  PILL_TYPE_LABELS,
  PILL_TYPES,
  type GuardSeverity,
  type MissedPillInput,
  type PillType,
} from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { AlarmClock, Pill as PillIcon, CircleAlert, Info, OctagonAlert, Plus, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { Appear } from '@/components/ui/appear';
import { Tabs } from '@/components/ui/tabs';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Input, Label, Select } from '@/components/ui/field';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { keys, useMedications } from '@/lib/queries';

const SEVERITY: Record<GuardSeverity, { icon: typeof Info; box: string; ink: string; label: string }> = {
  DANGER: { icon: OctagonAlert, box: 'border-cherry/40 bg-cherry-soft', ink: 'text-cherry-deep', label: 'Avoid' },
  WARNING: { icon: CircleAlert, box: 'border-ochre/50 bg-ochre-soft', ink: 'text-ochre-deep', label: 'Space them out' },
  INFO: { icon: Info, box: 'border-line bg-cream', ink: 'text-dusk-deep', label: 'Good to know' },
};

const TRY = ['Thyronorm 50', 'Livogen (iron)', 'Shelcal 500', 'Meftal Spas', 'Pan 40', 'Ovral-L', 'Metformin 500', 'Folvite'];

/** “I missed my pill by 30 hours”, “2 din ho gaye”, “14 hrs” → hours. */
function parseHours(text: string): number | null {
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|ghante?)\b/i);
  if (hours) return Number(hours[1]);
  const days = text.match(/(\d+(?:\.\d+)?)\s*(?:days?|din)\b/i);
  if (days) return Number(days[1]) * 24;
  return null;
}

function Guardian() {
  const { user } = useAuth();
  const meds = useMedications();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [extra, setExtra] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [view, setView] = useState<'timing' | 'clashes'>('timing');

  const saved = (meds.data ?? []).filter((m) => m.active);
  const list = [...saved.map((m) => ({ id: m.id, name: m.name })), ...extra.map((n) => ({ name: n }))];
  const guidance = medicineGuidance(list, { pregnant: user?.lifeStage === 'PREGNANCY' });

  async function save(medName: string) {
    await api.medications.create({ name: medName });
    setExtra((cur) => cur.filter((n) => n !== medName));
    await queryClient.invalidateQueries({ queryKey: keys.medications });
    toast('Saved to your medicines (also goes in your doctor report)');
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle eyebrow="Step 1" title="What do you take?" />
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (n && !list.some((m) => m.name.toLowerCase() === n.toLowerCase())) setExtra((cur) => [...cur, n]);
            setName('');
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Medicine or brand name, e.g. Thyronorm" aria-label="Medicine name" maxLength={80} />
          <Button type="submit" variant="olive" aria-label="Add medicine">
            <Plus className="size-4" /> Add
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-faint">Try:</span>
          {TRY.map((t) => (
            <Chip key={t} className="px-3 py-1 text-xs" onClick={() => !list.some((m) => m.name === t) && setExtra((cur) => [...cur, t])}>
              {t}
            </Chip>
          ))}
        </div>
        {meds.isPending ? (
          <Skeleton className="mt-4 h-12" />
        ) : (
          list.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {saved.map((m) => (
                <li key={m.id} className="inline-flex items-center gap-1.5 rounded-full bg-olive-deep px-3 py-1.5 text-sm font-medium text-cream">
                  {m.name}
                  {m.dose && <span className="opacity-75">{m.dose}</span>}
                </li>
              ))}
              {extra.map((n) => (
                <li key={n} className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink/30 bg-paper py-1 pr-1 pl-3 text-sm">
                  {n}
                  <button type="button" onClick={() => void save(n)} className="rounded-full px-2 py-0.5 text-xs font-semibold text-olive-deep hover:bg-olive-soft">
                    Save
                  </button>
                  <button type="button" aria-label={`Remove ${n}`} onClick={() => setExtra((cur) => cur.filter((x) => x !== n))} className="rounded-full p-1 hover:bg-cream-deep">
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </Card>

      {list.length === 0 ? (
        <EmptyState title="Add a medicine to see its rules">
          Cherri checks timing with food and clashes between your medicines, like iron with calcium or thyroid tablets with breakfast.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={view}
              onChange={setView}
              tabs={[
                { id: 'timing', label: 'When to take', icon: AlarmClock },
                { id: 'clashes', label: 'Clashes', icon: CircleAlert, badge: guidance.conflicts.length },
              ]}
            />
            {guidance.conflicts.length > 0 && view === 'timing' && (
              <Appear key={guidance.conflicts.length} tone="warning" label={null} className="rounded-full">
                <button type="button" onClick={() => setView('clashes')} className="rounded-full bg-ochre-soft px-4 py-2 text-sm font-semibold text-ochre-deep">
                  {guidance.conflicts.length} clash{guidance.conflicts.length > 1 ? 'es' : ''} found · View
                </button>
              </Appear>
            )}
          </div>

          {view === 'clashes' && (guidance.conflicts.length > 0 ? (
            <section aria-label="Clashes">
              <div className="space-y-3">
                {guidance.conflicts.map((c) => {
                  const s = SEVERITY[c.severity];
                  return (
                    <Appear key={`${c.a}-${c.b}`} tone={c.severity === 'DANGER' ? 'danger' : c.severity === 'WARNING' ? 'warning' : 'info'} label="New clash">
                    <div role="alert" className={cn('flex gap-3 rounded-card border p-4', s.box)}>
                      <s.icon className={cn('mt-0.5 size-6 shrink-0', s.ink)} />
                      <div>
                        <p className={cn('font-semibold', s.ink)}>
                          {c.a} + {c.b} · {s.label}
                        </p>
                        <p className="mt-0.5 text-[15px]">{c.message}</p>
                      </div>
                    </div>
                    </Appear>
                  );
                })}
              </div>
            </section>
          ) : (
            <p className="flex items-center gap-2 rounded-card bg-olive-soft px-4 py-3 font-medium text-olive-deep">
              <ShieldCheck className="size-5" /> No clashes between these medicines.
            </p>
          ))}

          {view === 'timing' && (
          <section aria-label="Timing rules">
            <div className="grid gap-4 md:grid-cols-2">
              {guidance.medicines.map((m) => (
                <Card key={m.id ?? m.name}>
                  <p className="text-lg font-semibold">{m.name}</p>
                  {m.classes.length > 0 ? (
                    <>
                      <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">{m.classes.map((c) => MEDICINE_CLASS_LABELS[c]).join(' · ')}</p>
                      {m.when && (
                        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-dusk-soft px-3 py-2 text-sm font-medium text-dusk-deep">
                          <AlarmClock className="mt-0.5 size-4 shrink-0" /> {m.when}
                        </p>
                      )}
                      <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-semibold text-olive-deep">{m.rules.length} tips for this medicine</summary>
                      <ul className="mt-2 space-y-2">
                        {m.rules.map((r) => {
                          const s = SEVERITY[r.severity];
                          return (
                            <li key={r.title} className="flex gap-2 text-sm">
                              <s.icon className={cn('mt-0.5 size-4 shrink-0', s.ink)} />
                              <span>
                                <strong>{r.title}.</strong> {r.detail}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      </details>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-ink-soft">Cherri doesn’t have rules for this medicine yet. Your pharmacist can tell you whether to take it with food.</p>
                  )}
                </Card>
              ))}
            </div>
          </section>
          )}
        </>
      )}
    </div>
  );
}

function MissedPill() {
  const [text, setText] = useState('');
  const [input, setInput] = useState<MissedPillInput>({ pillType: 'COMBINED', hoursLate: 12, packWeek: 2, recentSex: false });
  const advice = missedPillAdvice(input);
  const s = advice.backupDays > 0 ? SEVERITY.WARNING : SEVERITY.INFO;

  return (
    <Card id="missed-pill" tone="sage" sticker>
      <SectionTitle eyebrow="Missed-pill helper" title="“I missed my pill by … hours”" />
      <label className="block">
        <Label hint="type it the way you’d say it">Tell Cherri</Label>
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const h = parseHours(e.target.value);
            if (h !== null) setInput((cur) => ({ ...cur, hoursLate: h }));
          }}
          placeholder="I missed my pill by 30 hours"
        />
      </label>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>
          <Label>Pill type</Label>
          <Select value={input.pillType} onChange={(e) => setInput({ ...input, pillType: e.target.value as PillType })}>
            {PILL_TYPES.map((p) => (
              <option key={p} value={p}>
                {PILL_TYPE_LABELS[p]}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <Label hint="since it was due">Hours late</Label>
          <Input type="number" min={0} max={240} value={input.hoursLate} onChange={(e) => setInput({ ...input, hoursLate: Number(e.target.value) })} />
        </label>
        {input.pillType === 'COMBINED' && (
          <div className="sm:col-span-2">
            <Label>Which week of the pack?</Label>
            <div className="flex flex-wrap gap-2">
              {([1, 2, 3, 'BREAK'] as const).map((w) => (
                <Chip key={w} selected={input.packWeek === w} onClick={() => setInput({ ...input, packWeek: w })}>
                  {w === 'BREAK' ? 'Break / sugar pills' : `Week ${w}`}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={Boolean(input.recentSex)} onChange={(e) => setInput({ ...input, recentSex: e.target.checked })} className="size-5 accent-olive-deep" />
          I had sex without a condom in the last 7 days
        </label>
      </div>

      <Appear key={advice.headline} tone={advice.backupDays ? 'warning' : 'info'} label="Updated" className="mt-5">
      <div className={cn('rounded-card border p-4', s.box)}>
        <p className={cn('text-lg font-semibold', s.ink)}>{advice.headline}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px]">
          {advice.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-paper px-2.5 py-1">{advice.takeTwoToday ? 'Two pills today is OK' : 'One pill now'}</span>
          <span className="rounded-full bg-paper px-2.5 py-1">{advice.backupDays ? `Condoms for ${advice.backupDays} days` : 'No backup needed'}</span>
          {advice.emergencyContraception !== 'NOT_NEEDED' && (
            <span className="rounded-full bg-cherry px-2.5 py-1 text-cream">Emergency pill: {advice.emergencyContraception === 'RECOMMENDED' ? 'recommended' : 'consider'}</span>
          )}
        </div>
        {advice.emergencyContraception === 'RECOMMENDED' && (
          <ButtonLink href="/ec" variant="primary" size="sm" className="mt-3 bg-cherry hover:bg-cherry-deep">
            Open the emergency contraception helper
          </ButtonLink>
        )}
        <p className="mt-3 text-xs text-ink-soft">{advice.note} Based on FSRH (UK) missed-pill guidance; your pill’s leaflet may differ.</p>
      </div>
      </Appear>
    </Card>
  );
}

export default function MedsPage() {
  const [tab, setTab] = useState<'meds' | 'missed'>('meds');
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Medicine guardian" title="Take your medicines the right way" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'meds', label: 'My medicines', icon: PillIcon },
          { id: 'missed', label: 'Missed a pill?', icon: AlarmClock },
        ]}
      />
      <div className="max-w-4xl">{tab === 'meds' ? <Guardian /> : <MissedPill />}</div>
    </div>
  );
}
