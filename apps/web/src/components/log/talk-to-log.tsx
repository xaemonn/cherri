'use client';

import { Mic, Send, Square } from 'lucide-react';
import { useState } from 'react';
import { Spinner } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { useInvalidateHealth } from '@/lib/queries';
import { useVoiceNote, voiceLanguageFor } from '@/lib/use-voice-note';

/** Type or say how you feel ("cramps 7/10, bahut thakaan") and it becomes a log. */
export function TalkToLog({ className, date }: { className?: string; date?: string }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const invalidate = useInvalidateHealth();
  const voice = useVoiceNote();
  const { user } = useAuth();

  async function save(input: string, source: 'CHAT' | 'VOICE') {
    if (!input.trim()) return;
    setSaving(true);
    try {
      const result = await api.ai.parseLog({ text: input, commit: true, source, ...(date && { date }) });
      if (!result.summary) toast('Saved your note. Add a symptom or feeling to log more.');
      else toast(`Logged ${result.summary}`);
      setText('');
      await invalidate();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save that.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleVoice() {
    if (voice.state === 'recording') {
      try {
        const transcript = await voice.stop(voiceLanguageFor(user?.language));
        setText(transcript);
        await save(transcript, 'VOICE');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Could not hear that.');
      }
    } else {
      voice.start().catch(() => toast('Microphone access is blocked.'));
    }
  }

  const busy = saving || voice.state === 'transcribing';

  return (
    <form
      className={cn('flex items-center gap-2 rounded-full border border-ink/10 bg-paper p-1.5 pl-5 shadow-lift', className)}
      onSubmit={(e) => {
        e.preventDefault();
        void save(text, 'CHAT');
      }}
    >
      <input
        value={voice.state === 'recording' ? 'Listening… tap stop when done' : text}
        onChange={(e) => setText(e.target.value)}
        disabled={voice.state !== 'idle'}
        placeholder={user?.language === 'kn' ? 'ಉದಾ: ಇವತ್ತು ತುಂಬಾ ತಲೆನೋವು, BP 120/80' : 'Try: cramps 7/10 since morning, bahut thakaan'}
        aria-label="Describe how you feel"
        className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-ink-faint focus:outline-none"
      />
      {voice.supported && (
        <button
          type="button"
          onClick={() => void toggleVoice()}
          disabled={busy}
          aria-label={voice.state === 'recording' ? 'Stop recording' : 'Record a voice note'}
          className={cn('grid size-11 shrink-0 place-items-center rounded-full transition-colors', voice.state === 'recording' ? 'animate-pulse bg-cherry text-white' : 'bg-cream-deep hover:bg-line')}
        >
          {voice.state === 'recording' ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
        </button>
      )}
      <button type="submit" disabled={busy || !text.trim()} aria-label="Log it" className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-cream disabled:opacity-40">
        {busy ? <Spinner className="size-4 border-cream/30 border-t-cream" /> : <Send className="size-5" />}
      </button>
    </form>
  );
}
