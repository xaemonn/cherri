'use client';

import { CONSULT_CATEGORY_LABELS, CONSULT_STATUS_LABELS, CONSULT_STATUSES, type ConsultStatus, type DoctorInboxItem } from '@cherri/shared';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Siren } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CATEGORY_ICONS } from '@/components/consult/category-icon';
import { EmptyState, ErrorNote, PageHeader, Skeleton } from '@/components/ui/misc';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { keys } from '@/lib/queries';

function waiting(iso: string): string {
  const hours = (Date.now() - Date.parse(iso)) / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} d`;
}

function Row({ item }: { item: DoctorInboxItem }) {
  const label = CONSULT_CATEGORY_LABELS[item.category];
  const Icon = CATEGORY_ICONS[item.category];
  return (
    <li>
      <Link
        href={`/doctor/${item.id}`}
        className={cn(
          'group flex items-center gap-4 rounded-card border bg-paper p-4 shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-lift-lg',
          item.emergencyAt ? 'border-[#B42318]/50' : 'border-line',
        )}
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-dusk-soft text-dusk-deep" aria-hidden="true">
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <strong>
              {item.patient.firstName ?? 'Patient'}
              {item.patient.age != null && `, ${item.patient.age}`}
            </strong>
            <span className="text-sm text-ink-soft">· {label.label}</span>
            {item.emergencyAt && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#B42318] px-2 py-0.5 text-[11px] font-bold text-white">
                <Siren className="size-3" /> Emergency reported
              </span>
            )}
          </p>
          {item.lastMessage && <p className="mt-0.5 line-clamp-1 text-sm text-ink-soft">{item.lastMessage.preview}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <span key={t} className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', t === 'Urgent flag' ? 'bg-cherry text-cream' : 'bg-dusk-soft text-dusk-deep')}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <span className="hidden text-right text-xs text-ink-faint sm:block">
          {item.status === 'RESOLVED' ? 'closed' : 'waiting'}
          <br />
          <strong className="text-sm text-ink">{waiting(item.status === 'AWAITING_REVIEW' ? item.createdAt : item.updatedAt)}</strong>
        </span>
        <ChevronRight className="size-5 text-ink-faint transition-transform group-hover:translate-x-1" />
      </Link>
    </li>
  );
}

export default function DoctorInboxPage() {
  const [tab, setTab] = useState<ConsultStatus>('AWAITING_REVIEW');
  const inbox = useQuery({ queryKey: keys.doctorInbox('all'), queryFn: () => api.doctor.inbox(), refetchInterval: 20_000 });
  const items = inbox.data?.filter((i) => i.status === tab) ?? [];

  return (
    <div>
      <PageHeader eyebrow="Triage inbox" title="Patients waiting for you">
        Every question arrives with a 90-day clinical snapshot she chose to share. Emergencies are sent to 112 / 108 automatically and shown first.
      </PageHeader>
      <div role="tablist" className="mb-5 flex flex-wrap gap-2">
        {CONSULT_STATUSES.map((s) => {
          const count = inbox.data?.filter((i) => i.status === s).length ?? 0;
          return (
            <button
              key={s}
              role="tab"
              type="button"
              aria-selected={tab === s}
              onClick={() => setTab(s)}
              className={cn('rounded-full border px-4 py-2 text-sm font-semibold transition-colors', tab === s ? 'border-ink bg-ink text-cream' : 'border-line bg-paper hover:bg-cream')}
            >
              {CONSULT_STATUS_LABELS[s]} <span className="ml-1 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>
      {inbox.isPending ? (
        <Skeleton className="h-40" />
      ) : inbox.error ? (
        <ErrorNote error={inbox.error} />
      ) : items.length === 0 ? (
        <EmptyState title={`Nothing ${CONSULT_STATUS_LABELS[tab].toLowerCase()}`}>
          New questions appear here automatically.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
