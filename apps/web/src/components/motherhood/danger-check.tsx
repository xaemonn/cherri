'use client';

import {
  assessDangerSigns,
  dangerQuestionsFor,
  todayIn,
  type DangerAnswer,
  type DangerLevel,
  type DangerStage,
  type SymptomCode,
} from '@cherri/shared';
import { Phone, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { useInvalidateHealth } from '@/lib/queries';

/** Word, shape and colour together, so the result reads in greyscale or for colour-blind eyes (as in Maitri). */
const LEVEL_STYLE: Record<DangerLevel, { shape: string; className: string }> = {
  RED: { shape: '🛑', className: 'bg-cherry text-cream' },
  AMBER: { shape: '⚠️', className: 'bg-ochre-soft text-ochre-deep border border-ochre/40' },
  GREEN: { shape: '🟢', className: 'bg-olive-soft text-olive-deep' },
};

const ANSWERS: Array<{ value: DangerAnswer; label: string }> = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'UNSURE', label: 'Not sure' },
];

/** Answers that map onto symptoms she can keep in her log for the doctor report. */
const LOGGABLE: Partial<Record<string, SymptomCode[]>> = {
  headache_vision: ['headache', 'blurred_vision'],
  pp_headache_vision: ['headache', 'blurred_vision'],
  water_leak: ['fluid_leak'],
  movement: ['reduced_fetal_movement'],
  swelling: ['swelling'],
  fever: ['fever'],
  pp_fever: ['fever'],
  vomiting: ['nausea'],
  urine: ['painful_urination'],
  breathing: ['breathlessness'],
  pp_breathing: ['breathlessness'],
  mood: ['low_mood'],
  pp_mood: ['low_mood'],
};

/**
 * The danger-sign check: plain yes / no / not sure questions, a deterministic verdict, and the
 * numbers to call. Answers stay on this screen unless she chooses to add them to her log.
 */
export function DangerCheck({ stage, weeks }: { stage: DangerStage; weeks: number | null }) {
  const [answers, setAnswers] = useState<Record<string, DangerAnswer>>({});
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const toast = useToast();
  const invalidate = useInvalidateHealth();
  const questions = dangerQuestionsFor(stage, weeks);
  const result = assessDangerSigns(stage, answers, weeks);
  const answered = questions.filter((q) => answers[q.id]).length;
  const finished = answered === questions.length || result.level === 'RED';
  const style = LEVEL_STYLE[result.level];
  const loggable = [...new Set(result.signs.flatMap((s) => LOGGABLE[s.id] ?? []))];

  async function addToLog() {
    if (!user) return;
    setSaving(true);
    try {
      const today = todayIn(user.timezone);
      const { log } = await api.logs.get(today);
      const symptoms = new Map((log?.symptoms ?? []).map((s) => [s.code, s.severity]));
      for (const code of loggable) symptoms.set(code, Math.max(2, symptoms.get(code) ?? 0));
      await api.logs.upsert(today, { symptoms: [...symptoms.entries()].map(([code, severity]) => ({ code: code as SymptomCode, severity })) });
      await invalidate();
      toast('Added to today’s log and your doctor report', '📝');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save.', '😕');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {finished && answered > 0 && (
        <div role="alert" className={cn('rounded-card p-5 shadow-lift', style.className)}>
          <p className="flex items-center gap-2 font-display text-2xl font-semibold">
            <span aria-hidden="true">{style.shape}</span> {result.headline}
          </p>
          <p className="mt-2 text-[15px]">{result.action}</p>
          {result.signs.length > 0 && (
            <p className="mt-2 text-sm opacity-90">You said yes to: {result.signs.map((s) => s.text.replace(/\?$/, '').toLowerCase()).join('; ')}.</p>
          )}
          {result.unsure.length > 0 && result.level !== 'RED' && (
            <p className="mt-2 text-sm opacity-90">Not sure counts as worth checking: {result.unsure.map((s) => s.text.replace(/\?$/, '').toLowerCase()).join('; ')}.</p>
          )}
          {result.call.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {result.call.map((number) => (
                <a
                  key={number}
                  href={`tel:${number}`}
                  className={cn(
                    'inline-flex h-12 items-center gap-2 rounded-full px-5 text-lg font-bold',
                    result.level === 'RED' ? 'bg-cream text-cherry-deep' : 'bg-ink text-cream',
                  )}
                >
                  <Phone className="size-5" /> {number}
                </a>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {loggable.length > 0 && (
              <Button size="sm" variant="cream" onClick={() => void addToLog()} disabled={saving}>
                {saving ? 'Saving…' : 'Add these signs to today’s log'}
              </Button>
            )}
            <button
              type="button"
              onClick={() => setAnswers({})}
              className={cn('inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold underline-offset-4 hover:underline', result.level === 'RED' ? 'text-cream' : 'text-ink')}
            >
              <RotateCcw className="size-4" /> Start again
            </button>
          </div>
        </div>
      )}

      <ol className="space-y-2">
        {questions.map((q, i) => (
          <li key={q.id}>
            <Card className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-4">
              <p className="min-w-0 flex-1 text-[15px] font-medium">
                <span className="mr-2 text-ink-faint tabular-nums">{i + 1}.</span>
                {q.text}
              </p>
              <div className="flex gap-1.5" role="radiogroup" aria-label={q.text}>
                {ANSWERS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    role="radio"
                    aria-checked={answers[q.id] === a.value}
                    onClick={() => setAnswers({ ...answers, [q.id]: a.value })}
                    className={cn(
                      'h-10 min-w-14 rounded-full border px-3 text-sm font-bold transition-colors',
                      answers[q.id] === a.value
                        ? a.value === 'YES'
                          ? 'border-cherry bg-cherry text-cream'
                          : 'border-ink bg-ink text-cream'
                        : 'border-line bg-paper hover:border-ink',
                    )}
                  >
                    {a.value === 'YES' ? '✓ ' : a.value === 'NO' ? '✗ ' : '? '}
                    {a.label}
                  </button>
                ))}
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <p className="text-xs text-ink-soft">
        Based on the MoHFW Mother and Child Protection card and WHO guidance. This check is not a diagnosis; if something feels wrong, trust yourself and get checked.
      </p>
    </div>
  );
}
