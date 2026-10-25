'use client';

import { MessageSquareText, Pill as PillIcon, UserRound } from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';

import {
  FAMILY_CONDITION_LABELS,
  FAMILY_CONDITIONS,
  formatDay,
  type ChatSafety,
  type FamilyCondition,
  type HealthBackground,
  type MedicationDto,
  type StructuredStory,
  type SymptomStoryDto,
} from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Mic, Pill, Plus, Square, Trash2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { FieldError, Input, Label, Textarea } from '@/components/ui/field';
import { ErrorNote, PageHeader, Spinner } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { keys, useBackground, useMedications, useStory } from '@/lib/queries';
import { useVoiceNote, voiceLanguageFor } from '@/lib/use-voice-note';

const STORY_FIELDS: Array<{ key: keyof StructuredStory; label: string; hint: string; list?: boolean }> = [
  { key: 'mainConcern', label: 'Main concern', hint: 'what bothers you most' },
  { key: 'since', label: 'Since when', hint: 'when it started' },
  { key: 'pattern', label: 'When it happens', hint: 'e.g. before periods' },
  { key: 'location', label: 'Where', hint: 'part of the body' },
  { key: 'severity', label: 'How bad', hint: 'your words or 0–10' },
  { key: 'triggers', label: 'Makes it worse', hint: 'separate with commas', list: true },
  { key: 'relief', label: 'Helps', hint: 'separate with commas', list: true },
  { key: 'tried', label: 'Tried so far', hint: 'medicines or remedies', list: true },
  { key: 'impact', label: 'Effect on daily life', hint: 'study, work, sleep' },
  { key: 'worries', label: 'What worries you', hint: '' },
  { key: 'goals', label: 'What you want from the visit', hint: 'your question for the doctor' },
];

const STORY_PROMPTS = ['What is bothering you most?', 'Since when?', 'What makes it better or worse?', 'How does it affect your day?', 'What do you want to ask?'];

function StoryCard() {
  const story = useStory();
  if (story.isLoading) {
    return (
      <Card sticker className="grid place-items-center py-12">
        <Spinner />
      </Card>
    );
  }
  return <StoryEditor initial={story.data?.story ?? null} />;
}

/** Mounted once the saved story has loaded, so the form starts from it. */
function StoryEditor({ initial }: { initial: SymptomStoryDto | null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const voice = useVoiceNote();
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState(initial?.text ?? '');
  const [source, setSource] = useState<'MANUAL' | 'VOICE'>(initial?.source ?? 'MANUAL');
  const [draft, setDraft] = useState<StructuredStory | null>(initial?.structured ?? null);
  const [safety, setSafety] = useState<ChatSafety | null>(null);
  const [busy, setBusy] = useState<'structure' | 'save' | null>(null);

  async function toggleVoice() {
    if (voice.state === 'recording') {
      try {
        const transcript = await voice.stop(voiceLanguageFor(user?.language));
        setText((t) => [t.trim(), transcript].filter(Boolean).join(' '));
        setSource('VOICE');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Could not hear that.');
      }
    } else {
      voice.start().catch(() => toast('Microphone access is blocked.'));
    }
  }

  async function organise() {
    setBusy('structure');
    try {
      const result = await api.story.structure(text);
      setDraft(result.structured);
      setSafety(result.safety);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not organise your story.');
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!draft) return;
    setBusy('save');
    try {
      setSaved(await api.story.save({ text, structured: draft, source }));
      await queryClient.invalidateQueries({ queryKey: keys.story });
      await queryClient.invalidateQueries({ queryKey: ['report'] });
      toast('Saved to your doctor report');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save.');
    } finally {
      setBusy(null);
    }
  }

  const set = (key: keyof StructuredStory, value: string, list?: boolean) => {
    if (!draft) return;
    const parsed = list ? value.split(',').map((v) => v.trim()).filter(Boolean) : value.trim() === '' && key !== 'mainConcern' ? null : value;
    setDraft({ ...draft, [key]: parsed });
  };

  return (
    <Card sticker>
      <h2 className="text-2xl font-semibold">Your story, in your words</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Doctors take a history in a set order.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {STORY_PROMPTS.map((p) => (
          <span key={p} className="rounded-full bg-cream-deep px-3 py-1 text-xs font-semibold text-ink-soft">
            {p}
          </span>
        ))}
      </div>
      <div className="relative mt-4">
        <Textarea
          className="min-h-36 pr-14"
          maxLength={4000}
          value={voice.state === 'recording' ? `${text}${text ? ' ' : ''}…listening` : text}
          disabled={voice.state !== 'idle'}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. My periods have been painful since I was 15. The cramps are 8/10 and I miss college every month…"
        />
        {voice.supported && (
          <button
            type="button"
            onClick={() => void toggleVoice()}
            disabled={voice.state === 'transcribing'}
            aria-label={voice.state === 'recording' ? 'Stop recording' : 'Tell your story out loud'}
            className={cn('absolute right-3 bottom-3 grid size-10 place-items-center rounded-full', voice.state === 'recording' ? 'animate-pulse bg-cherry text-white' : 'bg-cream-deep hover:bg-line')}
          >
            {voice.state === 'transcribing' ? <Spinner className="size-4" /> : voice.state === 'recording' ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => void organise()} disabled={text.trim().length < 10 || busy !== null}>
          {busy === 'structure' ? <Spinner className="size-4" /> : <Wand2 className="size-4" />} Organise my story
        </Button>
      </div>

      {safety && (
        <div role="alert" className="mt-4 rounded-2xl bg-cherry-soft p-4 text-sm text-cherry-deep">
          <p className="font-semibold">{safety.message}</p>
          <p className="mt-2 flex flex-wrap gap-2">
            {safety.helplines.map((h) => (
              <a key={h.number} href={`tel:${h.number}`} className="rounded-full bg-cherry px-3 py-1 font-bold text-cream">
                {h.name} {h.number}
              </a>
            ))}
          </p>
        </div>
      )}

      {draft && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="font-semibold">Check it before it goes in your report</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {STORY_FIELDS.map((field) => {
              const value = draft[field.key];
              return (
                <label key={field.key} className={field.key === 'mainConcern' || field.key === 'goals' ? 'sm:col-span-2' : ''}>
                  <Label hint={field.hint}>{field.label}</Label>
                  <Input value={Array.isArray(value) ? value.join(', ') : (value ?? '')} onChange={(e) => set(field.key, e.target.value, field.list)} />
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="olive" onClick={() => void save()} disabled={busy !== null || !draft.mainConcern.trim()}>
              {busy === 'save' ? 'Saving…' : 'Save to my report'}
            </Button>
            {saved && (
              <Button
                variant="ghost"
                onClick={async () => {
                  await api.story.remove();
                  setSaved(null);
                  setText('');
                  setDraft(null);
                  await queryClient.invalidateQueries({ queryKey: keys.story });
                  toast('Story deleted');
                }}
              >
                <Trash2 className="size-4" /> Delete story
              </Button>
            )}
          </div>
          {saved && <p className="mt-2 text-xs text-ink-soft">Last saved {formatDay(saved.updatedAt.slice(0, 10), { year: true })}</p>}
        </div>
      )}
    </Card>
  );
}

const EMPTY_MED = { name: '', dose: '', schedule: '', reason: '', startedOn: '' };

function MedicinesCard() {
  const meds = useMedications();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_MED);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: keys.medications }), queryClient.invalidateQueries({ queryKey: ['report'] })]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.medications.create({
        name: form.name,
        dose: form.dose || null,
        schedule: form.schedule || null,
        reason: form.reason || null,
        startedOn: form.startedOn || null,
      });
      setForm(EMPTY_MED);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add.');
    }
  }

  async function toggle(med: MedicationDto) {
    await api.medications.update(med.id, { active: !med.active });
    await refresh();
    toast(med.active ? `${med.name} marked as stopped` : `${med.name} marked as current`);
  }

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <Pill className="size-6" /> Medicines & supplements
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Include iron or calcium tablets, painkillers you take for periods, the pill and any home remedies.
      </p>
      <ul className="mt-4 space-y-2">
        {meds.data?.map((med) => (
          <li key={med.id} className={cn('flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3', !med.active && 'opacity-60')}>
            <span className="min-w-0">
              <span className="font-semibold">{med.name}</span>
              <span className="ml-2 text-sm text-ink-soft">{[med.dose, med.schedule, med.reason && `for ${med.reason}`].filter(Boolean).join(' · ')}</span>
              {med.startedOn && <span className="block text-xs text-ink-soft">since {formatDay(med.startedOn, { year: true })}</span>}
            </span>
            <span className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => void toggle(med)}>
                {med.active ? 'Stopped it' : 'Taking again'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove ${med.name}`}
                onClick={async () => {
                  await api.medications.remove(med.id);
                  await refresh();
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </span>
          </li>
        ))}
        {meds.data?.length === 0 && <li className="text-sm text-ink-soft">Nothing listed yet.</li>}
      </ul>
      <form onSubmit={(e) => void add(e)} className="mt-5 grid gap-3 sm:grid-cols-2">
        <Input required maxLength={80} placeholder="Name, e.g. Meftal-Spas" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="sm:col-span-2" />
        <Input maxLength={60} placeholder="Dose, e.g. 500 mg" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} />
        <Input maxLength={60} placeholder="How often" list="med-schedules" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
        <datalist id="med-schedules">
          <option value="Once a day" />
          <option value="Twice a day" />
          <option value="When needed" />
          <option value="During periods" />
        </datalist>
        <Input maxLength={120} placeholder="What for" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <label>
          <Label hint="optional">Started on</Label>
          <Input type="date" value={form.startedOn} onChange={(e) => setForm({ ...form, startedOn: e.target.value })} />
        </label>
        <Button type="submit" className="self-end">
          <Plus className="size-4" /> Add
        </Button>
      </form>
      <FieldError>{error}</FieldError>
    </Card>
  );
}

function BackgroundCard() {
  const background = useBackground();
  if (background.error) return <ErrorNote error={background.error} />;
  if (!background.data) {
    return (
      <Card className="grid place-items-center py-12">
        <Spinner />
      </Card>
    );
  }
  return <BackgroundForm initial={background.data} />;
}

function BackgroundForm({ initial }: { initial: HealthBackground }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState<HealthBackground>(initial);

  const toggleFamily = (code: FamilyCondition) =>
    setForm((f) => ({ ...f, familyHistory: f.familyHistory.includes(code) ? f.familyHistory.filter((c) => c !== code) : [...f.familyHistory, code] }));

  async function save() {
    try {
      await api.me.updateBackground({
        menarcheAge: form.menarcheAge,
        familyHistory: form.familyHistory,
        allergies: form.allergies?.trim() || null,
        surgeries: form.surgeries?.trim() || null,
      });
      await Promise.all([queryClient.invalidateQueries({ queryKey: keys.background }), queryClient.invalidateQueries()]);
      toast('Background saved');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.');
    }
  }

  return (
    <Card>
      <h2 className="text-2xl font-semibold">Your background</h2>
      <p className="mt-1 text-sm text-ink-soft">The questions a doctor asks at a first visit, answered once.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>
          <Label hint="leave blank if you don’t remember">Age at your first period</Label>
          <Input
            type="number"
            min={8}
            max={20}
            value={form.menarcheAge ?? ''}
            onChange={(e) => setForm({ ...form, menarcheAge: e.target.value ? Number(e.target.value) : null })}
          />
        </label>
        <div className="sm:col-span-2">
          <Label>In your mother or sisters</Label>
          <div className="flex flex-wrap gap-2">
            {FAMILY_CONDITIONS.map((code) => (
              <Chip key={code} selected={form.familyHistory.includes(code)} onClick={() => toggleFamily(code)}>
                {FAMILY_CONDITION_LABELS[code]}
              </Chip>
            ))}
          </div>
        </div>
        <label>
          <Label hint="medicines, foods, latex">Allergies</Label>
          <Textarea className="min-h-20" maxLength={500} value={form.allergies ?? ''} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
        </label>
        <label>
          <Label hint="with the year, if you know it">Past surgeries or procedures</Label>
          <Textarea className="min-h-20" maxLength={500} value={form.surgeries ?? ''} onChange={(e) => setForm({ ...form, surgeries: e.target.value })} />
        </label>
      </div>
      <Button className="mt-4" onClick={() => void save()}>
        Save background
      </Button>
    </Card>
  );
}

export default function VisitPrepPage() {
  const [tab, setTab] = useState<'story' | 'medicines' | 'background'>('story');
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Visit prep" title="Get heard in a ten-minute visit" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'story', label: 'Your story', icon: MessageSquareText },
            { id: 'medicines', label: 'Medicines', icon: PillIcon },
            { id: 'background', label: 'Background', icon: UserRound },
          ]}
        />
        <ButtonLink href="/report" variant="olive" size="sm">
          Open my report <ArrowRight className="size-4" />
        </ButtonLink>
      </div>
      <div className="max-w-4xl">
        {tab === 'story' && <StoryCard />}
        {tab === 'medicines' && <MedicinesCard />}
        {tab === 'background' && <BackgroundCard />}
      </div>
    </div>
  );
}
