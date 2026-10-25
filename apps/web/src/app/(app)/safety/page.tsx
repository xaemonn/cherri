'use client';

import type { TrustedContactDto } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, MessageCircle, Phone, Plus, Send, Share2, ShieldAlert, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { QuickExitButton } from '@/components/safety/quick-exit';
import { Button } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { FieldError, Input } from '@/components/ui/field';
import { PageHeader, Spinner } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { keys, useContacts, useHelp } from '@/lib/queries';

type SosState = { stage: 'idle' } | { stage: 'confirm' } | { stage: 'locating' } | { stage: 'ready'; message: string };

function locate(): Promise<GeolocationCoordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

const digits = (phone: string) => phone.replace(/\D/g, '');
/** WhatsApp wants the number with country code and no "+"; assume India for 10-digit numbers. */
const whatsappNumber = (phone: string) => (digits(phone).length === 10 ? `91${digits(phone)}` : digits(phone));

/**
 * SOS that never pretends: Cherri writes the message and attaches her location, then her own SMS or
 * WhatsApp sends it. Nothing goes out without her tap, and nothing is claimed to be "dispatched".
 */
function SosCard({ contacts }: { contacts: TrustedContactDto[] }) {
  const { user } = useAuth();
  const toast = useToast();
  const [sos, setSos] = useState<SosState>({ stage: 'idle' });

  async function prepare() {
    setSos({ stage: 'locating' });
    const coords = await locate();
    const where = coords ? `My location: https://maps.google.com/?q=${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}` : 'I could not share my location.';
    const name = user?.name?.split(/\s+/)[0] ?? 'me';
    setSos({ stage: 'ready', message: `SOS from ${name}: I need help, please call me or come now. ${where}` });
  }

  const message = sos.stage === 'ready' ? sos.message : '';
  const smsAll = `sms:${contacts.map((c) => c.phone).join(',')}?&body=${encodeURIComponent(message)}`;

  return (
    <Card sticker tone="cherry" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <ShieldAlert className="size-6" /> SOS to your trusted people
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Writes a help message with your live location, then opens your own SMS or WhatsApp so you can send it in one tap. If you are in danger right now, call 112 first.
          </p>
        </div>
        <a href="tel:112" className="inline-flex h-14 items-center gap-2 rounded-full bg-cherry px-6 text-lg font-bold text-cream shadow-lift">
          <Phone className="size-5" /> Call 112
        </a>
      </div>

      {sos.stage === 'idle' && (
        <Button size="lg" onClick={() => setSos({ stage: 'confirm' })} disabled={contacts.length === 0}>
          <Send className="size-5" /> Prepare SOS message
        </Button>
      )}
      {contacts.length === 0 && <p className="text-sm font-semibold">Add a trusted contact below to use SOS.</p>}

      {sos.stage === 'confirm' && (
        <div role="alertdialog" aria-label="Confirm SOS" className="rounded-2xl bg-paper p-4">
          <p className="font-semibold">Share your location with {contacts.map((c) => c.name).join(', ')}?</p>
          <p className="text-sm text-ink-soft">Your phone may ask for location permission. Nothing is sent until you press send in your messaging app.</p>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => void prepare()}>Yes, prepare it</Button>
            <Button variant="ghost" onClick={() => setSos({ stage: 'idle' })}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {sos.stage === 'locating' && (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Spinner className="size-4" /> Finding your location…
        </p>
      )}

      {sos.stage === 'ready' && (
        <div className="space-y-3 rounded-2xl bg-paper p-4">
          <p className="text-sm">{message}</p>
          <div className="flex flex-wrap gap-2">
            <a href={smsAll} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 font-semibold text-cream">
              <MessageCircle className="size-4" /> Text everyone
            </a>
            {contacts.map((c) => (
              <a
                key={c.id}
                href={`https://wa.me/${whatsappNumber(c.phone)}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/20 px-4 font-semibold"
              >
                WhatsApp {c.name}
              </a>
            ))}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <Button variant="outline" onClick={() => void navigator.share({ text: message }).catch(() => undefined)}>
                <Share2 className="size-4" /> Other app
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(message);
                toast('Message copied', '📋');
              }}
            >
              <Copy className="size-4" /> Copy
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setSos({ stage: 'idle' })}>
            Done
          </Button>
        </div>
      )}
    </Card>
  );
}

function ContactsCard({ contacts }: { contacts: TrustedContactDto[] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', phone: '', relation: '' });
  const [error, setError] = useState<string | null>(null);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.contacts.create({ name: form.name, phone: form.phone, relation: form.relation || null });
      setForm({ name: '', phone: '', relation: '' });
      await queryClient.invalidateQueries({ queryKey: keys.contacts });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add.');
    }
  }

  return (
    <Card>
      <h2 className="text-xl font-semibold">Trusted contacts</h2>
      <p className="mt-1 text-sm text-ink-soft">Up to 5 people. Names and numbers are encrypted, and Cherri never contacts them on its own.</p>
      <ul className="mt-4 space-y-2">
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3">
            <span>
              <span className="font-semibold">{c.name}</span>
              {c.relation && <span className="ml-2 text-sm text-ink-soft">{c.relation}</span>}
              <span className="block text-sm text-ink-soft">{c.phone}</span>
            </span>
            <span className="flex gap-1">
              <a href={`tel:${c.phone}`} aria-label={`Call ${c.name}`} className="grid size-10 place-items-center rounded-full hover:bg-cream-deep">
                <Phone className="size-4" />
              </a>
              <button
                type="button"
                aria-label={`Remove ${c.name}`}
                className="grid size-10 place-items-center rounded-full hover:bg-cream-deep"
                onClick={async () => {
                  await api.contacts.remove(c.id);
                  await queryClient.invalidateQueries({ queryKey: keys.contacts });
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      {contacts.length < 5 && (
        <form onSubmit={(e) => void add(e)} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <Input required maxLength={60} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input required type="tel" inputMode="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input maxLength={40} placeholder="Relation (optional)" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} />
          <Button type="submit">
            <Plus className="size-4" /> Add
          </Button>
        </form>
      )}
      <FieldError>{error}</FieldError>
    </Card>
  );
}

export default function SafetyPage() {
  const contacts = useContacts();
  const help = useHelp();
  const list = contacts.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Safety & SOS" title="Safety is health too">
        Get help fast, leave the app in a second on a shared phone, and know who to call for violence at home or harassment online.
      </PageHeader>

      <SosCard contacts={list} />
      <ContactsCard contacts={list} />

      <section>
        <SectionTitle eyebrow="24×7, free" title="Helplines" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {help.data?.helplines.map((h) => (
            <a key={h.number} href={`tel:${h.number}`} className="rounded-card border border-ink/10 bg-ochre p-5 shadow-lift transition-transform hover:-translate-y-1">
              <p className="font-display text-3xl font-semibold">{h.number}</p>
              <p className="font-bold">{h.name}</p>
              <p className="mt-1 text-xs">{h.description}</p>
            </a>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card tone="dusk">
          <h3 className="text-lg font-semibold">Violence at home</h3>
          <p className="mt-1 text-sm">
            It is not your fault. Call 181 for confidential help, or visit a Sakhi One Stop Centre in your district for shelter, legal aid and counselling under the Protection of Women from Domestic Violence Act, 2005.
          </p>
        </Card>
        <Card tone="sage">
          <h3 className="text-lg font-semibold">Harassment or blackmail online</h3>
          <p className="mt-1 text-sm">
            Morphed photos, threats or stalking: screenshot the messages with dates and profile links before you block, then report at cybercrime.gov.in or call 1930.
          </p>
        </Card>
        <Card tone="clay">
          <h3 className="text-lg font-semibold">Quick exit</h3>
          <p className="mt-1 text-sm">
            Leaves Cherri for a weather page and clears this screen. On a computer, press Esc twice. It can’t erase browser history, so use a private window if someone checks your phone.
          </p>
          <QuickExitButton className="mt-3" />
        </Card>
      </div>
    </div>
  );
}
