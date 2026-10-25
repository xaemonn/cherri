'use client';

import { bandStyles, formatDay } from '@cherri/shared';
import { ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { ErrorNote, PageHeader, PageLoader } from '@/components/ui/misc';
import { useScreenings } from '@/lib/queries';

const CARD_TONES = ['#E6E9D3', '#F3E6C6', '#DFE7E3', '#F0E0CC', '#E6EADD'];
const EMOJIS: Record<string, string> = { PCOS: '🌀', ENDOMETRIOSIS: '⚡', PMDD: '🎢', ANEMIA: '🩸', THYROID: '🦋' };

export default function ChecksPage() {
  const { data, isLoading, error } = useScreenings();
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorNote error={error} />;

  return (
    <div>
      <PageHeader eyebrow="Health checks" title="Is it normal? Let’s check.">
        Short questionnaires built on the criteria doctors use. Cherri pre-fills answers from your logs and labs. These are not diagnoses, but
        they tell you when it’s worth seeing a doctor and what to ask for.
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((check, i) => (
          <Link
            key={check.type}
            href={`/checks/${check.type}`}
            className="group flex flex-col gap-3 rounded-card border border-ink/10 p-6 shadow-lift transition-transform hover:-translate-y-1"
            style={{ background: CARD_TONES[i % CARD_TONES.length] }}
          >
            <div className="flex items-start justify-between">
              <span className="text-4xl">{EMOJIS[check.type]}</span>
              {check.latest && (
                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: bandStyles[check.latest.band].bg, color: bandStyles[check.latest.band].ink }}>
                  {bandStyles[check.latest.band].label} · {formatDay(check.latest.createdAt.slice(0, 10))}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-semibold">{check.title}</h2>
            <p className="text-ink-soft">{check.tagline}</p>
            <div className="mt-auto flex items-center justify-between pt-2 text-sm font-bold">
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <Clock className="size-4" /> {check.minutes} min · {check.questionCount} questions
              </span>
              <span className="inline-flex items-center gap-1">
                {check.latest ? 'Retake' : 'Start'} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
        <Link
          href="/mind"
          className="group flex flex-col gap-3 rounded-card border border-ink/10 bg-dusk-soft p-6 shadow-lift transition-transform hover:-translate-y-1 md:col-span-2"
        >
          <span className="text-4xl">🧠</span>
          <h2 className="text-2xl font-semibold">Mood & anxiety check-in</h2>
          <p className="text-ink-soft">PHQ-9 and GAD-7, the two short questionnaires doctors worldwide use. Your score goes in your doctor report, never your answers.</p>
          <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-bold">
            2 min each <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </div>
    </div>
  );
}
