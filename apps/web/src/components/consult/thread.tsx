'use client';

import type { ConsultEmergency, ConsultMessageDto, ConsultStatus, DoctorProfileDto } from '@cherri/shared';
import { Building2, CheckCircle2, FlaskConical, Mic, Phone, Siren } from 'lucide-react';
import { Appear } from '@/components/ui/appear';
import { cn } from '@/lib/cn';

export const STATUS_STYLES: Record<ConsultStatus, string> = {
  AWAITING_REVIEW: 'bg-ochre-soft text-ochre-deep',
  IN_CONSULTATION: 'bg-dusk-soft text-dusk-deep',
  RESOLVED: 'bg-olive-soft text-olive-deep',
};

const time = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** The red alert that replaces a routine chat when emergency symptoms are described. */
export function EmergencyAlert({ emergency, onAcknowledge }: { emergency: ConsultEmergency; onAcknowledge?: () => void }) {
  return (
    <Appear tone="danger" label="Alert">
    <div role="alert" className="rounded-card border-2 border-[#B42318] bg-[#FEE4E2] p-5 text-[#7A1D14] shadow-lift-lg">
      <p className="flex items-center gap-2 font-sans text-lg font-extrabold tracking-wide uppercase">
        <Siren className="size-6 animate-pulse" /> {emergency.title}
      </p>
      <p className="mt-2 text-[15px] font-medium">{emergency.message}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {emergency.helplines.map((h) => (
          <a key={h.number} href={`tel:${h.number}`} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#B42318] px-5 font-bold text-white hover:bg-[#912018]">
            <Phone className="size-4" /> Call {h.number} · {h.name}
          </a>
        ))}
      </div>
      {onAcknowledge && (
        <button type="button" onClick={onAcknowledge} className="mt-4 text-sm font-semibold underline underline-offset-4">
          I am safe now / I have had emergency care. Resume the chat
        </button>
      )}
    </div>
    </Appear>
  );
}

export function MessageList({ messages, viewer, doctor }: { messages: ConsultMessageDto[]; viewer: 'PATIENT' | 'DOCTOR'; doctor: DoctorProfileDto | null }) {
  return (
    <ol className="space-y-3">
      {messages.map((m) => {
        if (m.sender === 'SYSTEM') {
          const emergency = m.kind === 'EMERGENCY';
          return (
            <li key={m.id} className={cn('mx-auto max-w-lg rounded-2xl px-4 py-2 text-center text-sm', emergency ? 'bg-[#FEE4E2] font-semibold text-[#7A1D14]' : 'bg-cream-deep text-ink-soft')}>
              {m.kind === 'RESOLVED' && <CheckCircle2 className="mr-1 inline size-4 text-olive-deep" />}
              {emergency && <Siren className="mr-1 inline size-4" />}
              {m.body}
              <span className="mt-0.5 block text-[11px] opacity-70">{time(m.createdAt)}</span>
            </li>
          );
        }
        const mine = m.sender === viewer;
        const fromDoctor = m.sender === 'DOCTOR';
        return (
          <li key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
            <span className="mb-1 px-1 text-[11px] font-semibold text-ink-faint">
              {fromDoctor ? (doctor?.name ?? 'Doctor') : viewer === 'DOCTOR' ? 'Patient' : 'You'} · {time(m.createdAt)}
            </span>
            <div
              className={cn(
                'max-w-[85%] rounded-3xl px-4 py-3 text-[15px] whitespace-pre-wrap shadow-lift',
                mine ? 'rounded-br-lg' : 'rounded-bl-lg',
                m.kind === 'IN_PERSON' ? 'border-2 border-ochre bg-ochre-soft text-ink' : mine ? 'bg-olive-deep text-cream' : 'border border-line bg-paper',
              )}
            >
              {m.kind === 'VOICE' && (
                <span className="mb-1 flex items-center gap-1 text-xs font-semibold opacity-80">
                  <Mic className="size-3.5" /> Voice note (transcribed)
                </span>
              )}
              {m.kind === 'IN_PERSON' && (
                <span className="mb-1 flex items-center gap-1.5 text-sm font-bold text-ochre-deep">
                  <Building2 className="size-4" /> In-person visit recommended
                </span>
              )}
              {m.body}
              {m.tests.length > 0 && (
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {m.tests.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-dusk-soft px-2.5 py-1 text-xs font-semibold text-dusk-deep">
                      <FlaskConical className="size-3" /> {t}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
