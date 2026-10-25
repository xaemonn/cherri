'use client';

import {
  ApiError,
  CONSULT_CATEGORIES,
  CONSULT_CATEGORY_LABELS,
  CONSULT_STATUS_LABELS,
  detectConsultEmergency,
  EXPECTED_REPLY_TIME,
  SAFETY_GATE_TEXT,
  type ConsultCategory,
  type ConsultEmergency,
} from '@cherri/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Clock, Mic, ShieldCheck, Square } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CATEGORY_ICONS } from '@/components/consult/category-icon';
import { SnapshotView } from '@/components/consult/snapshot';
import { EmergencyAlert, STATUS_STYLES } from '@/components/consult/thread';
import { Button } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { FieldError, Textarea } from '@/components/ui/field';
import { EmptyState, ErrorNote, PageHeader, Skeleton, Spinner } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { keys } from '@/lib/queries';
import { useVoiceNote, voiceLanguageFor } from '@/lib/use-voice-note';

type Step = 'start' | 'describe' | 'review';

function NewConsult() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const voice = useVoiceNote();
  const [step, setStep] = useState<Step>('start');
  const [safe, setSafe] = useState(false);
  const [category, setCategory] = useState<ConsultCategory | null>(null);
  const [message, setMessage] = useState('');
  const [source, setSource] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [consent, setConsent] = useState(false);
  const [serverEmergency, setServerEmergency] = useState<ConsultEmergency | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const preview = useQuery({ queryKey: keys.consultPreview, queryFn: api.consults.preview, enabled: step === 'review' });

  // The trap runs as she types, so an emergency is never queued for hours.
  const emergency = detectConsultEmergency(message) ?? serverEmergency;

  async function recordToggle() {
    try {
      if (voice.state === 'recording') {
        const text = await voice.stop(voiceLanguageFor(user?.language));
        if (text) {
          setMessage((m) => (m ? `${m} ${text}` : text));
          setSource('VOICE');
        }
      } else {
        await voice.start();
      }
    } catch (e) {
      toast(e instanceof ApiError && e.status === 503 ? 'Voice notes need the AI service. Please type instead.' : 'Could not record. Please type instead.');
    }
  }

  async function send() {
    if (!category) return;
    setSending(true);
    setError(null);
    try {
      const created = await api.consults.create({ category, message: message.trim(), source, consent: true, safetyConfirmed: true });
      await queryClient.invalidateQueries({ queryKey: keys.consults });
      toast('Sent. A doctor will reply here.');
      router.push(`/consult/${created.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMERGENCY_SYMPTOMS') {
        setServerEmergency((e.details as { emergency: ConsultEmergency }).emergency);
        setStep('describe');
      } else setError(e instanceof Error ? e.message : 'Could not send.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Card sticker className="space-y-5">
      <ol className="flex gap-2 text-xs font-semibold text-ink-faint" aria-label="Steps">
        {(['start', 'describe', 'review'] as const).map((s, i) => (
          <li key={s} className={cn('flex-1 rounded-full py-1.5 text-center', step === s ? 'bg-olive-deep text-cream' : 'bg-cream-deep')}>
            {i + 1}. {s === 'start' ? 'Topic' : s === 'describe' ? 'Your question' : 'Share & send'}
          </li>
        ))}
      </ol>

      {step === 'start' && (
        <>
          <label className={cn('flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition-colors', safe ? 'border-olive-deep bg-olive-soft' : 'border-cherry/40 bg-cherry-soft')}>
            <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} className="mt-1 size-5 shrink-0 accent-olive-deep" />
            <span>
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="size-4" /> Safety check (required)
              </span>
              <span className="text-sm">{SAFETY_GATE_TEXT}</span>
              <span className="mt-1 block text-xs text-ink-soft">If you are, call 112 / 108 now. This chat is for non-urgent questions.</span>
            </span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {CONSULT_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                disabled={!safe}
                onClick={() => {
                  setCategory(c);
                  setStep('describe');
                }}
                className="group rounded-2xl border border-line bg-paper p-4 text-left transition-all hover:-translate-y-0.5 hover:border-olive-deep hover:shadow-lift disabled:pointer-events-none disabled:opacity-45"
              >
                {(() => {
                  const Icon = CATEGORY_ICONS[c];
                  return (
                    <span className="grid size-10 place-items-center rounded-xl bg-dusk-soft text-dusk-deep" aria-hidden="true">
                      <Icon className="size-5" strokeWidth={1.8} />
                    </span>
                  );
                })()}
                <p className="mt-1 font-semibold">{CONSULT_CATEGORY_LABELS[c].label}</p>
                <p className="text-sm text-ink-soft">{CONSULT_CATEGORY_LABELS[c].hint}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'describe' && category && (
        <>
          <p className="font-semibold">
            {CONSULT_CATEGORY_LABELS[category].label}
          </p>
          <div>
            <Textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setServerEmergency(null);
              }}
              maxLength={2000}
              rows={5}
              placeholder="Type in English or Hinglish, e.g. “Period 12 din late hai, test negative aaya. Kya karun?”"
              aria-label="Your question for the doctor"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {voice.supported && (
                <Button variant={voice.state === 'recording' ? 'primary' : 'outline'} size="sm" onClick={() => void recordToggle()} disabled={voice.state === 'transcribing'}>
                  {voice.state === 'recording' ? <Square className="size-4" /> : <Mic className="size-4" />}
                  {voice.state === 'recording' ? 'Stop & transcribe' : voice.state === 'transcribing' ? 'Transcribing…' : 'Record a voice note'}
                </Button>
              )}
              <span className="text-xs text-ink-faint">{message.length}/2000</span>
            </div>
          </div>
          {emergency && <EmergencyAlert emergency={emergency} />}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('start')}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button variant="olive" disabled={!message.trim() || Boolean(emergency)} onClick={() => setStep('review')}>
              Review & share <ArrowRight className="size-4" />
            </Button>
          </div>
        </>
      )}

      {step === 'review' && category && (
        <>
          <div>
            <h3 className="text-xl font-medium">Your clinical snapshot</h3>
            <p className="text-sm text-ink-soft">
              This is exactly what the doctor will see next to your question, built from the last 90 days in Cherri. Your private notes are not included.
            </p>
          </div>
          {preview.isPending ? <Skeleton className="h-64" /> : preview.error ? <ErrorNote error={preview.error} /> : <SnapshotView snapshot={preview.data} />}
          <label className="flex cursor-pointer gap-3 rounded-2xl bg-cream p-4">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5 shrink-0 accent-olive-deep" />
            <span className="text-sm">
              <strong>I agree to share this snapshot</strong> with a verified Cherri doctor for this consultation. I can export or delete it any time from Settings.
            </span>
          </label>
          <p className="flex items-center gap-2 rounded-2xl bg-dusk-soft px-4 py-3 text-sm font-medium text-dusk-deep">
            <Clock className="size-4 shrink-0" /> {EXPECTED_REPLY_TIME} You’ll find the reply here.
          </p>
          <FieldError>{error}</FieldError>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('describe')}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button variant="olive" disabled={!consent || sending || !preview.data} onClick={() => void send()}>
              {sending ? <Spinner /> : null} Send to a doctor
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

export default function ConsultPage() {
  const consults = useQuery({ queryKey: keys.consults, queryFn: api.consults.list, refetchInterval: 30_000 });
  return (
    <div>
      <PageHeader eyebrow="Consult a doctor" title="Ask a gynaecologist, no waiting room">
        For non-urgent questions. A verified doctor reads it with your Cherri history.
      </PageHeader>
      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <NewConsult />
        <section>
          <SectionTitle eyebrow="History" title="Your consultations" />
          {consults.isPending ? (
            <Skeleton className="h-32" />
          ) : consults.error ? (
            <ErrorNote error={consults.error} />
          ) : consults.data.length === 0 ? (
            <EmptyState title="No consultations yet">
              Your questions and the doctor’s replies will be kept here.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {consults.data.map((c) => (
                <li key={c.id}>
                  <Link href={`/consult/${c.id}`} className="block rounded-card border border-line bg-paper p-4 shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-lift-lg">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">
                        {CONSULT_CATEGORY_LABELS[c.category].label}
                      </p>
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[c.status])}>{CONSULT_STATUS_LABELS[c.status]}</span>
                    </div>
                    {c.lastMessage && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{c.lastMessage.preview}</p>}
                    <p className="mt-2 text-xs text-ink-faint">
                      {c.doctor ? c.doctor.name : 'Waiting for a doctor'} · {new Date(c.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
