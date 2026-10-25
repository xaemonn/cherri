'use client';

import { bandStyles, type ScreeningRecord, type ScreeningType } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorNote, PageLoader } from '@/components/ui/misc';
import { api } from '@/lib/api';
import { keys, useScreening } from '@/lib/queries';

function Result({ record, onRetake }: { record: ScreeningRecord; onRetake: () => void }) {
  const { result } = record;
  const band = bandStyles[result.band];
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <Card sticker style={{ background: band.bg, color: band.ink }}>
        <p className="text-xs font-semibold tracking-[0.18em] uppercase">Result</p>
        <h2 className="mt-1 font-display text-4xl font-semibold">{band.label}</h2>
        <p className="mt-3 text-[15px] leading-relaxed">{result.summary}</p>
      </Card>
      {result.reasons.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold">Why</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {result.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span>•</span>
                {r}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <Card tone="olive">
          <h3 className="text-lg font-semibold">What to do next</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {result.nextSteps.map((s) => (
              <li key={s} className="flex gap-2">
                <span>→</span>
                {s}
              </li>
            ))}
          </ul>
        </Card>
        {result.suggestedTests.length > 0 && (
          <Card tone="dusk">
            <h3 className="text-lg font-semibold">Tests to ask about</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {result.suggestedTests.map((t) => (
                <li key={t} className="flex gap-2">
                  <span></span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm font-bold">See: {result.specialist}</p>
          </Card>
        )}
      </div>
      <p className="text-xs text-ink-soft">{result.disclaimer}</p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/report" variant="olive">
          Add to my doctor report
        </ButtonLink>
        <ButtonLink href="/care" variant="outline">
          Find a doctor nearby
        </ButtonLink>
        <Button variant="ghost" onClick={onRetake}>
          Retake
        </Button>
      </div>
    </motion.div>
  );
}

export function CheckFlow({ type }: { type: ScreeningType }) {
  const { data, isLoading, error } = useScreening(type);
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<ScreeningRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  useEffect(() => {
    if (data) setAnswers(Object.fromEntries(Object.entries(data.prefill).map(([id, p]) => [id, p.value])));
  }, [data]);

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorNote error={error} />;

  const question = data.questions[index];

  async function answer(value: boolean) {
    if (!question) return;
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    if (index < data!.questions.length - 1) {
      setIndex(index + 1);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      setResult(await api.screenings.submit(type, next));
      void queryClient.invalidateQueries({ queryKey: keys.screenings });
      void queryClient.invalidateQueries({ queryKey: keys.dashboard });
    } catch (e) {
      setSubmitError(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/checks" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> All checks
      </Link>
      <h1 className="text-4xl font-semibold sm:text-5xl">{data.title}</h1>
      <p className="mt-2 text-ink-soft">Based on {data.basis}.</p>

      {result ? (
        <div className="mt-8">
          <Result
            record={result}
            onRetake={() => {
              setResult(null);
              setIndex(0);
            }}
          />
        </div>
      ) : (
        <>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-cream-deep">
            <motion.div className="h-full rounded-full bg-ink" animate={{ width: `${(index / data.questions.length) * 100}%` }} />
          </div>
          <p className="mt-3 text-sm font-bold text-ink-soft">
            Question {index + 1} of {data.questions.length}
          </p>
          <AnimatePresence mode="wait">
            {question && (
              <motion.div key={question.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.18 }}>
                <Card sticker className="mt-4">
                  <h2 className="text-2xl leading-snug font-semibold sm:text-3xl">{question.text}</h2>
                  {question.hint && <p className="mt-2 text-sm text-ink-soft">{question.hint}</p>}
                  {data.prefill[question.id] && (
                    <p className="mt-4 flex gap-2 rounded-2xl bg-ochre-soft p-3 text-sm text-ochre-deep">
                      <Sparkles className="mt-0.5 size-4 shrink-0" /> Cherri noticed: {data.prefill[question.id]!.reason}
                    </p>
                  )}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {[true, false].map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        disabled={submitting}
                        onClick={() => void answer(value)}
                        className={`rounded-3xl border py-4 font-display text-xl font-semibold transition-all active:scale-95 ${
                          answers[question.id] === value ? 'border-ink bg-ink text-cream' : 'border-ink bg-paper hover:bg-cream-deep'
                        }`}
                      >
                        {value ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
          {submitError !== null && (
            <div className="mt-4">
              <ErrorNote error={submitError} />
            </div>
          )}
          <div className="mt-4 flex justify-between">
            <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => setIndex(index - 1)}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            {data.latest && (
              <Button variant="ghost" size="sm" onClick={() => setResult(data.latest)}>
                See last result
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
