'use client';

import { CONSULT_CATEGORY_LABELS, CONSULT_STATUS_LABELS, RECOMMENDABLE_TESTS } from '@cherri/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, CheckCircle2, FlaskConical, Send, Siren } from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { SnapshotView } from '@/components/consult/snapshot';
import { MessageList, STATUS_STYLES } from '@/components/consult/thread';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Textarea } from '@/components/ui/field';
import { ErrorNote, PageLoader } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { keys } from '@/lib/queries';

export function DoctorConsult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const toast = useToast();
  const consult = useQuery({ queryKey: keys.doctorConsult(id), queryFn: () => api.doctor.get(id), refetchInterval: 20_000 });
  const [body, setBody] = useState('');
  const [tests, setTests] = useState<string[]>([]);
  const [showTests, setShowTests] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  if (consult.isPending) return <PageLoader />;
  if (consult.error) return <ErrorNote error={consult.error} />;
  const c = consult.data;
  const closed = c.status === 'RESOLVED';

  async function act(name: string, action: () => Promise<unknown>, done: string) {
    setBusy(name);
    try {
      await action();
      await Promise.all([queryClient.invalidateQueries({ queryKey: keys.doctorConsult(id) }), queryClient.invalidateQueries({ queryKey: ['doctorInbox'] })]);
      toast(done);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <Link href="/doctor" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Inbox
      </Link>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-medium">
          {c.snapshot.patient.firstName ?? 'Patient'} · {CONSULT_CATEGORY_LABELS[c.category].label}
        </h1>
        <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', STATUS_STYLES[c.status])}>{CONSULT_STATUS_LABELS[c.status]}</span>
        {c.emergencyAt && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#B42318] px-3 py-1 text-sm font-bold text-white">
            <Siren className="size-4" /> Emergency reported {new Date(c.emergencyAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
        <div className="flex flex-wrap gap-1.5">
          {c.tags.map((t) => (
            <span key={t} className="rounded-full bg-dusk-soft px-2.5 py-0.5 text-xs font-semibold text-dusk-deep">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Split screen: the snapshot on the left, the conversation on the right. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section aria-label="Clinical snapshot" className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-olive-deep uppercase">Clinical snapshot · shared with consent</p>
          <SnapshotView snapshot={c.snapshot} compact />
        </section>

        <section aria-label="Conversation" className="space-y-4">
          <MessageList messages={c.messages} viewer="DOCTOR" doctor={c.doctor} />
          {closed ? (
            <Card tone="olive" className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-5 text-olive-deep" /> Resolved {c.resolvedAt && new Date(c.resolvedAt).toLocaleString('en-IN')}. The thread is read-only.
            </Card>
          ) : (
            <Card className="space-y-3">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={2000} placeholder="Write your advice…" aria-label="Reply" />
              <div>
                <button type="button" onClick={() => setShowTests((v) => !v)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-dusk-deep">
                  <FlaskConical className="size-4" /> Recommend tests {tests.length > 0 && `(${tests.length})`}
                </button>
                {showTests && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RECOMMENDABLE_TESTS.map((t) => (
                      <Chip key={t} selected={tests.includes(t)} onClick={() => setTests((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}>
                        {t}
                      </Chip>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="olive"
                  disabled={(!body.trim() && tests.length === 0) || busy !== null}
                  onClick={() =>
                    void act('reply', () => api.doctor.reply(id, { body: body.trim(), tests }), 'Reply sent').then(() => {
                      setBody('');
                      setTests([]);
                      setShowTests(false);
                    })
                  }
                >
                  <Send className="size-4" /> Send reply
                </Button>
                <Button variant="outline" disabled={busy !== null || Boolean(c.inPersonAdvisedAt)} onClick={() => void act('visit', () => api.doctor.recommendVisit(id), 'In-person visit recommended')}>
                  <Building2 className="size-4" /> {c.inPersonAdvisedAt ? 'Visit recommended' : 'Recommend in-person visit'}
                </Button>
                <Button variant="ghost" disabled={busy !== null} onClick={() => void act('resolve', () => api.doctor.resolve(id), 'Marked as resolved')}>
                  <CheckCircle2 className="size-4" /> Mark as resolved
                </Button>
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
