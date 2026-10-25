'use client';

import { preventiveChecksFor, type NearbyCare } from '@cherri/shared';
import { CalendarCheck, ExternalLink, MapPin, Navigation, Phone } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { ErrorNote, PageHeader, Spinner } from '@/components/ui/misc';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useHelp } from '@/lib/queries';

const KIND_LABELS = { GYNAECOLOGY: { label: 'Women’s health', emoji: '🩺', bg: '#E6E9D3' }, HOSPITAL: { label: 'Hospital', emoji: '🏥', bg: '#DFE7E3' }, CLINIC: { label: 'Clinic', emoji: '🏠', bg: '#F3E6C6' } } as const;

export default function CarePage() {
  const help = useHelp();
  const { user } = useAuth();
  const preventive = preventiveChecksFor(user?.age ?? null);
  const [nearby, setNearby] = useState<NearbyCare | null>(null);
  const [state, setState] = useState<'idle' | 'locating' | 'searching'>('idle');
  const [error, setError] = useState<string | null>(null);

  function findNearby() {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser.');
      return;
    }
    setState('locating');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setState('searching');
        try {
          setNearby(await api.care.nearby(coords.latitude, coords.longitude, 5));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Search failed.');
        } finally {
          setState('idle');
        }
      },
      () => {
        setError('Location permission was denied. You can still use the free resources below.');
        setState('idle');
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Find care" title="Help is closer than you think">
        Nearby gynaecologists and clinics, free government consultations and helplines. Your location is only used for this search.
      </PageHeader>

      <Card sticker tone="olive" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Gynaecologists & clinics near you</h2>
          <p className="text-sm text-ink-soft">Within 5 km, from OpenStreetMap.</p>
        </div>
        <Button size="lg" onClick={findNearby} disabled={state !== 'idle'}>
          {state === 'idle' ? <Navigation className="size-5" /> : <Spinner className="size-4 border-cream/30 border-t-cream" />}
          {state === 'locating' ? 'Finding you…' : state === 'searching' ? 'Searching…' : 'Use my location'}
        </Button>
      </Card>
      {error && <ErrorNote error={new Error(error)} />}

      {nearby && (
        <section>
          <SectionTitle eyebrow={`${nearby.places.length} places`} title="Near you" />
          {nearby.degraded && <p className="mb-3 text-sm text-ink-soft">The map service is busy right now. Try again in a minute, or use eSanjeevani below.</p>}
          <div className="grid gap-3 md:grid-cols-2">
            {nearby.places.map((p) => {
              const kind = KIND_LABELS[p.kind];
              return (
                <Card key={`${p.name}-${p.lat}`} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: kind.bg }}>
                        {kind.emoji} {kind.label}
                      </span>
                      <h3 className="mt-2 text-lg leading-snug font-semibold">{p.name}</h3>
                      {p.address && <p className="text-sm text-ink-soft">{p.address}</p>}
                    </div>
                    <span className="shrink-0 font-display text-lg font-semibold">{p.distanceKm} km</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
                    <a href={p.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-3 py-1.5">
                      <MapPin className="size-4" /> Map
                    </a>
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 rounded-full bg-cream-deep px-3 py-1.5">
                        <Phone className="size-4" /> Call
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {preventive.length > 0 && (
        <section>
          <SectionTitle eyebrow={user?.age ? `For age ${user.age}` : 'For every age'} title="Check-ups worth booking" />
          <div className="grid gap-3 md:grid-cols-2">
            {preventive.map((check) => (
              <Card key={check.id} className="flex gap-3 p-4 sm:p-5">
                <CalendarCheck className="mt-0.5 size-5 shrink-0 text-olive-deep" />
                <div>
                  <h3 className="font-semibold">
                    {check.title} <span className="ml-1 text-sm font-medium text-ink-soft">· {check.howOften}</span>
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">{check.detail}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle eyebrow="Free & government" title="Care that costs nothing" />
        <div className="grid gap-4 md:grid-cols-3">
          {help.data?.resources.map((r) => (
            <a key={r.name} href={r.url} target="_blank" rel="noreferrer" className="group rounded-card border border-line bg-paper p-5 shadow-soft transition-transform hover:-translate-y-1">
              <h3 className="flex items-center justify-between text-lg font-semibold">
                {r.name} <ExternalLink className="size-4 opacity-50 group-hover:opacity-100" />
              </h3>
              <p className="mt-1 text-sm text-ink-soft">{r.description}</p>
            </a>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="24×7" title="Helplines" />
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
    </div>
  );
}
