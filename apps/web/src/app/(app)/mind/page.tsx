'use client';

import { formatDay, FREQUENCY_OPTIONS, MIND_CHECK_TYPES, MIND_CHECKS, type MindCheckRecord, type MindCheckType } from '@cherri/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { PageHeader } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

const MIND_KEY = ['mindChecks'] as const;

function Result({ record }: { record: MindCheckRecord }) {
  const urgent = record.selfHarm || record.band === 'SEVERE' || record.band === 'MODERATELY_SEVERE';
  return (
    <div role={record.selfHarm ? 'alert' : 'status'} className={cn('rounded-card p-5 shadow-lift', urgent ? 'bg-cherry-soft text-cherry-deep' : 'bg-olive-soft text-olive-deep')}>
      <p className="font-display text-3xl font-semibold">
        {record.score}
        <span className="text-lg"> / {record.maxScore}</span> · {record.label}
      </p>
      <p className="mt-2 text-[15px]">{record.advice}</p>
      {record.helplines.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {record.helplines.map((h) => (
            <a key={h.number} href={`tel:${h.number}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-cherry px-4 font-bold text-cream">
              <Phone className="size-4" /> {h.name} {h.number}
            </a>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs opacity-80">A screening score, not a diagnosis. It goes in your doctor report so you don’t have to find the words in the room.</p>
    </div>
  );
}

/** PHQ-9 and GAD-7 check-ins (as in Kahani): fixed questions, fixed scoring, crisis support whenever needed. */
export default function MindPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const checks = useQuery({ queryKey: MIND_KEY, queryFn: api.mind.list });
  const [type, setType] = useState<MindCheckType>('PHQ9');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<MindCheckRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const definition = MIND_CHECKS[type];
  const complete = definition.questions.every((q) => answers[q.id] !== undefined);

  async function submit() {
    setSaving(true);
    try {
      setResult(await api.mind.submit(type, answers));
      setAnswers({});
      await Promise.all([queryClient.invalidateQueries({ queryKey: MIND_KEY }), queryClient.invalidateQueries({ queryKey: ['report'] })]);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save.', '😕');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Mind check-in" title="How has your mind been lately?">
        Two short questionnaires used by doctors everywhere. Answer for the last two weeks. Your answers are encrypted; only the score appears in your doctor report.
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {MIND_CHECK_TYPES.map((t) => (
          <Chip
            key={t}
            selected={type === t}
            onClick={() => {
              setType(t);
              setAnswers({});
              setResult(null);
            }}
          >
            {MIND_CHECKS[t].title}
          </Chip>
        ))}
      </div>

      {result ? (
        <div className="space-y-3">
          <Result record={result} />
          <Button variant="ghost" onClick={() => setResult(null)}>
            Take it again
          </Button>
        </div>
      ) : (
        <Card>
          <p className="font-semibold">{definition.intro}</p>
          <ol className="mt-4 space-y-4">
            {definition.questions.map((q, i) => (
              <li key={q.id}>
                <p className="text-[15px] font-medium">
                  <span className="mr-2 text-ink-faint">{i + 1}.</span>
                  {q.text}
                </p>
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={q.text}>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={answers[q.id] === option.value}
                      onClick={() => setAnswers({ ...answers, [q.id]: option.value })}
                      className={cn(
                        'rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors',
                        answers[q.id] === option.value ? 'border-ink bg-ink text-cream' : 'border-line bg-paper hover:border-ink',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <Button className="mt-6" variant="olive" disabled={!complete || saving} onClick={() => void submit()}>
            {saving ? 'Scoring…' : 'See my score'}
          </Button>
          <p className="mt-3 text-xs text-ink-soft">{definition.source}. Free to use.</p>
        </Card>
      )}

      {checks.data && checks.data.history.length > 0 && (
        <section>
          <SectionTitle eyebrow="Your history" title="Past check-ins" />
          <ul className="space-y-2">
            {checks.data.history.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 text-sm shadow-soft">
                <span className="font-semibold">{MIND_CHECKS[r.type].title}</span>
                <span className="text-ink-soft">
                  {r.score}/{r.maxScore} · {r.label} · {formatDay(r.createdAt.slice(0, 10), { year: true })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
