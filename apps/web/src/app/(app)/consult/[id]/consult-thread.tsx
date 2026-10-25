'use client';

import { ApiError, CONSULT_CATEGORY_LABELS, CONSULT_STATUS_LABELS, detectConsultEmergency, EXPECTED_REPLY_TIME, INDIA_HELPLINES, SPECIALTY_LABELS, type ConsultEmergency } from '@cherri/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BadgeCheck, Clock, Send } from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { SnapshotView } from '@/components/consult/snapshot';
import { EmergencyAlert, MessageList, STATUS_STYLES } from '@/components/consult/thread';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/field';
import { ErrorNote, PageLoader } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { keys } from '@/lib/queries';

const PAUSED: ConsultEmergency = {
  kind: 'MEDICAL',
  title: 'CRITICAL SYMPTOMS DETECTED',
  message: 'This requires immediate physical emergency care. Do not wait for a chat reply. Call 112 / 108 or go to the nearest emergency room immediately.',
  helplines: INDIA_HELPLINES.filter((h) => ['112', '108'].includes(h.number)),
};

export function ConsultThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const toast = useToast();
  const consult = useQuery({ queryKey: keys.consult(id), queryFn: () => api.consults.get(id), refetchInterval: 20_000 });
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [alert, setAlert] = useState<ConsultEmergency | null>(null);
  const [showSnapshot, setShowSnapshot] = useState(false);

  if (consult.isPending) return <PageLoader />;
  if (consult.error) return <ErrorNote error={consult.error} />;
  const c = consult.data;
  const typed = detectConsultEmergency(body);
  const shownAlert = alert ?? typed ?? (c.frozen ? PAUSED : null);

  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: keys.consult(id) }), queryClient.invalidateQueries({ queryKey: keys.consults })]);

  async function send() {
    setSending(true);
    try {
      await api.consults.send(id, { body: body.trim() });
      setBody('');
      await refresh();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMERGENCY_SYMPTOMS') {
        setAlert((e.details as { emergency: ConsultEmergency }).emergency);
        setBody('');
        await refresh();
      } else toast(e instanceof Error ? e.message : 'Could not send.');
    } finally {
      setSending(false);
    }
  }

  async function acknowledge() {
    await api.consults.acknowledgeEmergency(id);
    setAlert(null);
    await refresh();
  }

  const closed = c.status === 'RESOLVED';
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/consult" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> All consultations
      </Link>
      <Card sticker className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium">
              {CONSULT_CATEGORY_LABELS[c.category].label}
            </h1>
            {c.doctor ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm">
                <BadgeCheck className="size-4 text-olive-deep" /> <strong>{c.doctor.name}</strong> · {SPECIALTY_LABELS[c.doctor.specialty]} · Reg. {c.doctor.registrationNo}
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                <Clock className="size-4" /> {EXPECTED_REPLY_TIME}
              </p>
            )}
          </div>
          <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', STATUS_STYLES[c.status])}>{CONSULT_STATUS_LABELS[c.status]}</span>
        </div>
        <button type="button" onClick={() => setShowSnapshot((v) => !v)} className="mt-3 text-sm font-semibold text-olive-deep underline underline-offset-4">
          {showSnapshot ? 'Hide' : 'View'} the clinical snapshot you shared
        </button>
        {showSnapshot && (
          <div className="mt-3">
            <SnapshotView snapshot={c.snapshot} />
          </div>
        )}
      </Card>

      <MessageList messages={c.messages} viewer="PATIENT" doctor={c.doctor} />

      <div className="sticky bottom-24 mt-6 space-y-3 lg:bottom-6">
        {shownAlert && <EmergencyAlert emergency={shownAlert} onAcknowledge={c.frozen ? () => void acknowledge() : undefined} />}
        {closed ? (
          <Card tone="olive" className="text-sm">
            This consultation is resolved and saved here. Have a new question?{' '}
            <Link href="/consult" className="font-semibold underline">
              Start a new consultation
            </Link>
            .
          </Card>
        ) : (
          !c.frozen && (
            <Card className="flex items-end gap-2 p-3 sm:p-3">
              <Textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setAlert(null);
                }}
                rows={2}
                maxLength={2000}
                placeholder="Add a follow-up for the doctor…"
                aria-label="Message"
                className="min-h-12"
              />
              <Button variant="olive" aria-label="Send" disabled={!body.trim() || sending || Boolean(typed)} onClick={() => void send()}>
                <Send className="size-4" />
              </Button>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
