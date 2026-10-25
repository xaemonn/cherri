'use client';

import { addDays, formatDay, todayIn } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Baby, ExternalLink, HeartPulse, Landmark, ListChecks, Phone, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FlagCard } from '@/components/insights/cards';
import { Tabs } from '@/components/ui/tabs';
import { BloodPressureChart } from '@/components/motherhood/bp-chart';
import { DangerCheck } from '@/components/motherhood/danger-check';
import { CarePlan, MotherhoodHero } from '@/components/motherhood/motherhood-hero';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { FieldError, Input } from '@/components/ui/field';
import { EmptyState, ErrorNote, PageHeader, PageLoader } from '@/components/ui/misc';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useMotherhood } from '@/lib/queries';

const MATERNAL_FLAGS = new Set([
  'SEVERE_HYPERTENSION',
  'PREECLAMPSIA_WARNING_SIGNS',
  'HIGH_BP_MATERNAL',
  'BP_RISING',
  'REDUCED_FETAL_MOVEMENTS',
  'FLUID_LEAK',
  'FEVER_IN_PREGNANCY',
  'RAPID_WEIGHT_GAIN',
  'PREGNANCY_BLEEDING_OR_PAIN',
  'PREGNANCY_ANAEMIA',
  'SEVERE_ANAEMIA',
  'POSTNATAL_FEVER',
  'POSTNATAL_LOW_MOOD',
]);

/** Asks for the one date the whole care plan hangs on. */
function DateSetup({ stage }: { stage: 'PREGNANCY' | 'POSTPARTUM' }) {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const today = todayIn(user?.timezone ?? 'Asia/Kolkata');

  async function save() {
    setError(null);
    try {
      setUser(await api.me.update(stage === 'PREGNANCY' ? { dueDate: value } : { deliveryDate: value }));
      await queryClient.invalidateQueries();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    }
  }

  return (
    <Card sticker tone="olive">
      <h2 className="text-2xl font-semibold">{stage === 'PREGNANCY' ? 'When is your baby due?' : 'When was your baby born?'}</h2>
      <p className="mt-1 text-sm text-ink-soft">Cherri builds your week-by-week care plan and danger-sign checks from this one date.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Input
          type="date"
          className="max-w-56"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          {...(stage === 'PREGNANCY' ? { min: addDays(today, -21) } : { max: today })}
        />
        <Button onClick={() => void save()} disabled={!value}>
          Save
        </Button>
      </div>
      <FieldError>{error}</FieldError>
    </Card>
  );
}

export default function PregnancyPage() {
  const { user } = useAuth();
  const care = useMotherhood();
  const [tab, setTab] = useState<'overview' | 'check' | 'bp' | 'plan' | 'schemes'>(() =>
    typeof window !== 'undefined' && window.location.hash === '#check' ? 'check' : 'overview',
  );
  // The hero's "Danger-sign check" button links to #check on this same page.
  useEffect(() => {
    const onHash = () => window.location.hash === '#check' && setTab('check');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (user && user.lifeStage !== 'PREGNANCY' && user.lifeStage !== 'POSTPARTUM') {
    return (
      <div>
        <PageHeader eyebrow="Pregnancy & baby" title="For pregnancy and the weeks after birth" />
        <EmptyState title="Pregnant or just had a baby?">
          Switch your life stage in Settings and Cherri turns into your pregnancy companion: weekly care plan, danger-sign checks and blood pressure tracking.
          <div className="mt-4">
            <ButtonLink href="/settings" size="sm">
              Open settings
            </ButtonLink>
          </div>
        </EmptyState>
      </div>
    );
  }
  if (care.isLoading || !user) return <PageLoader label="Getting your care plan…" />;
  if (care.error || !care.data) return <ErrorNote error={care.error} />;

  const { status, bloodPressure, weight, schemes } = care.data;
  const stage = user.lifeStage === 'POSTPARTUM' ? 'POSTPARTUM' : 'PREGNANCY';
  const flags = care.data.flags.filter((f) => MATERNAL_FLAGS.has(f.code));
  const weeks = status?.stage === 'PREGNANCY' ? status.age.weeks : null;
  const firstWeight = weight[0];
  const lastWeight = weight.at(-1);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={stage === 'PREGNANCY' ? 'Pregnancy care' : 'After birth'} title={stage === 'PREGNANCY' ? 'You and your baby, week by week' : 'The first weeks, for both of you'} />

      <Tabs
        value={tab}
        onChange={(t) => {
          setTab(t);
          window.history.replaceState(null, '', t === 'check' ? '#check' : window.location.pathname);
        }}
        tabs={[
          { id: 'overview', label: 'Overview', icon: Baby },
          { id: 'check', label: 'Danger-sign check', icon: TriangleAlert },
          { id: 'bp', label: 'Blood pressure', icon: HeartPulse },
          ...(status ? [{ id: 'plan' as const, label: 'Care plan', icon: ListChecks }] : []),
          { id: 'schemes', label: 'Free schemes', icon: Landmark },
        ]}
      />
      {tab === 'overview' && (
      <>
      {status ? <MotherhoodHero status={status} /> : <DateSetup stage={stage} />}

      {flags.length > 0 && (
        <section>
          <SectionTitle eyebrow="Needs attention" title="What Cherri noticed" />
          <div className="grid gap-4 md:grid-cols-2">
            {flags.map((flag) => (
              <FlagCard key={flag.code} flag={flag} />
            ))}
          </div>
        </section>
      )}
      </>
      )}

      {tab === 'check' && (
      <section id="check" className="scroll-mt-6">
        <SectionTitle eyebrow="1 minute" title="Danger-sign check" />
        <p className="mb-4 max-w-2xl text-sm text-ink-soft">
          Answer for how you feel today. One serious sign is enough to go to hospital, and if you’re not sure, it counts as worth checking.
        </p>
        <DangerCheck stage={stage} weeks={weeks} />
      </section>
      )}

      {tab === 'bp' && (
      <section>
        <SectionTitle eyebrow="Pre-eclampsia watch" title="Blood pressure" action={<ButtonLink href="/log" size="sm" variant="outline">Log a reading</ButtonLink>} />
        <Card>
          {bloodPressure.length > 0 ? (
            <BloodPressureChart readings={bloodPressure} />
          ) : (
            <p className="text-sm text-ink-soft">No readings yet. Measure at a health centre, pharmacy or with a home machine, then log it from the Log page or just tell Cherri “BP 118/76”.</p>
          )}
          {firstWeight && lastWeight && firstWeight !== lastWeight && (
            <p className="mt-4 border-t border-line pt-4 text-sm">
              Weight: <strong>{lastWeight.weightKg} kg</strong> on {formatDay(lastWeight.date)} ({lastWeight.weightKg - firstWeight.weightKg >= 0 ? '+' : ''}
              {Math.round((lastWeight.weightKg - firstWeight.weightKg) * 10) / 10} kg since {formatDay(firstWeight.date)})
            </p>
          )}
        </Card>
      </section>
      )}

      {tab === 'plan' && status && (
        <section>
          <SectionTitle eyebrow={stage === 'PREGNANCY' ? 'India antenatal plan' : 'Postnatal plan'} title="Your care plan" />
          <CarePlan steps={status.steps} unit={stage === 'PREGNANCY' ? 'week' : 'day'} />
        </section>
      )}

      {tab === 'schemes' && (
      <section>
        <SectionTitle eyebrow="Free for you" title="Government schemes and transport" />
        <div className="grid gap-4 md:grid-cols-2">
          {schemes.map((scheme) => (
            <a key={scheme.short} href={scheme.url} target="_blank" rel="noreferrer" className="group rounded-card border border-line bg-paper p-5 shadow-soft transition-transform hover:-translate-y-1">
              <h3 className="flex items-center justify-between gap-2 text-lg font-semibold">
                {scheme.short} <ExternalLink className="size-4 opacity-50 group-hover:opacity-100" />
              </h3>
              <p className="text-xs font-semibold text-ink-soft">{scheme.name}</p>
              <p className="mt-2 text-sm">{scheme.description}</p>
            </a>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { number: '102', label: 'Free pregnancy & baby transport' },
            { number: '108', label: 'Emergency ambulance' },
          ].map((line) => (
            <a key={line.number} href={`tel:${line.number}`} className="flex items-center gap-4 rounded-card bg-ochre p-5 shadow-lift transition-transform hover:-translate-y-1">
              <Phone className="size-6" />
              <span>
                <span className="block font-display text-3xl font-semibold">{line.number}</span>
                <span className="text-sm font-bold">{line.label}</span>
              </span>
            </a>
          ))}
        </div>
      </section>
      )}
    </div>
  );
}
