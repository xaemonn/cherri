'use client';

import { SCREENINGS, type ChatAction, type ChatSafety, type Citation, type ScreeningType } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { History, Mic, Plus, Send, Square, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CherryMark } from '@/components/brand/logo';
import { RichText } from '@/components/chat/rich-text';
import { Spinner } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { keys, useChatSessions, useInvalidateHealth } from '@/lib/queries';
import { useVoiceNote, voiceLanguageFor } from '@/lib/use-voice-note';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  citations: Citation[];
  actions: ChatAction[];
  safety: ChatSafety | null;
  offline?: boolean;
  streaming?: boolean;
}

const STARTERS = [
  'Why am I so tired lately?',
  'Is my cycle normal?',
  'Explain my blood report',
  'Aaj bahut cramps hain, kya karun?',
  'What helps PMS mood swings?',
  'Can I exercise on my period?',
];

function ActionCard({ action }: { action: ChatAction }) {
  if (action.kind === 'LOGGED') {
    return (
      <Link href="/log" className="inline-flex items-center gap-2 rounded-full bg-olive-soft px-3 py-1.5 text-xs font-bold text-olive-deep">
        Logged {action.summary}
      </Link>
    );
  }
  if (action.kind === 'SHOW_CYCLE') {
    return (
      <Link href="/cycle" className="inline-flex items-center gap-2 rounded-full bg-dusk-soft px-3 py-1.5 text-xs font-bold text-dusk-deep">
        Open your cycle calendar
      </Link>
    );
  }
  const screening = SCREENINGS[action.screening as ScreeningType];
  return (
    <Link href={`/checks/${action.screening}`} className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-ochre px-4 py-3 shadow-lift">
      <span className="text-2xl"></span>
      <span className="text-sm">
        <span className="block font-display font-semibold">Take the {screening?.title ?? 'health check'}</span>
        {action.reason}
      </span>
    </Link>
  );
}

function SafetyCard({ safety }: { safety: ChatSafety }) {
  return (
    <div className="rounded-3xl border border-cherry bg-cherry-soft p-4 text-cherry-deep">
      <p className="font-display text-lg font-semibold">You’re not alone</p>
      <p className="mt-1 text-sm">{safety.message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {safety.helplines.map((h) => (
          <a key={h.number} href={`tel:${h.number}`} className="rounded-full bg-cherry px-4 py-2 text-sm font-semibold text-white">
            {h.name} · {h.number}
          </a>
        ))}
      </div>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.role === 'USER') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[24px] rounded-br-md bg-ink px-4 py-3 text-[15px] text-cream sm:max-w-[70%]">{message.content}</div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <CherryMark className="mt-1 size-9 shrink-0" />
      <div className="min-w-0 max-w-[88%] space-y-2 sm:max-w-[75%]">
        {message.safety && <SafetyCard safety={message.safety} />}
        <div className="rounded-[24px] rounded-tl-md border border-line bg-paper px-4 py-3 text-[15px] shadow-soft">
          {message.content ? (
            <RichText text={message.content} citations={message.citations} />
          ) : (
            <span className="flex gap-1 py-1.5" aria-label="Cherri is typing">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="size-2 rounded-full bg-ink-faint" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />
              ))}
            </span>
          )}
          {message.offline && <p className="mt-2 text-[11px] font-bold tracking-wide text-ink-faint uppercase">Offline mode</p>}
        </div>
        {message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.actions.map((action, i) => (
              <ActionCard key={i} action={action} />
            ))}
          </div>
        )}
        {message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {message.citations.map((c) => (
              <Link key={c.index} href={`/learn/${c.articleId}`} className="rounded-full bg-cream-deep px-2.5 py-1 font-semibold text-ink-soft hover:text-ink">
                [{c.index}] {c.title} · {c.source}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const sessions = useChatSessions();
  const queryClient = useQueryClient();
  const invalidateHealth = useInvalidateHealth();
  const voice = useVoiceNote();
  const { user } = useAuth();
  const toast = useToast();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  async function openSession(id: string) {
    setShowHistory(false);
    setSessionId(id);
    const history = await queryClient.fetchQuery({ queryKey: keys.chatSession(id), queryFn: () => api.ai.session(id) });
    setMessages(
      history.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.meta?.citations ?? [],
        actions: m.meta?.actions ?? [],
        safety: null,
      })),
    );
  }

  function newChat() {
    setSessionId(null);
    setMessages([]);
    setShowHistory(false);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);
    const replyId = `reply-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: `me-${Date.now()}`, role: 'USER', content: message, citations: [], actions: [], safety: null },
      { id: replyId, role: 'ASSISTANT', content: '', citations: [], actions: [], safety: null, streaming: true },
    ]);
    const update = (fn: (reply: Message) => Message) => setMessages((m) => m.map((msg) => (msg.id === replyId ? fn(msg) : msg)));
    let logged = false;

    try {
      await api.ai.chat({ message, ...(sessionId && { sessionId }) }, (event) => {
        if (event.type === 'session') setSessionId(event.sessionId);
        else if (event.type === 'token') update((r) => ({ ...r, content: r.content + event.text }));
        else if (event.type === 'action') {
          if (event.action.kind === 'LOGGED') logged = true;
          update((r) => ({ ...r, actions: [...r.actions, event.action] }));
        } else if (event.type === 'citations') update((r) => ({ ...r, citations: event.citations }));
        else if (event.type === 'safety') update((r) => ({ ...r, safety: { category: event.category, message: event.message, helplines: event.helplines } }));
        else if (event.type === 'done') update((r) => ({ ...r, streaming: false, offline: event.offline }));
        else if (event.type === 'error') update((r) => ({ ...r, streaming: false, content: r.content || event.message }));
      });
    } catch (error) {
      update((r) => ({ ...r, streaming: false, content: error instanceof Error ? error.message : 'Cherri could not reply.' }));
    } finally {
      setBusy(false);
      void queryClient.invalidateQueries({ queryKey: keys.chatSessions });
      if (logged) void invalidateHealth();
    }
  }

  async function toggleVoice() {
    if (voice.state === 'recording') {
      try {
        await send(await voice.stop(voiceLanguageFor(user?.language)));
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Could not hear that.');
      }
    } else {
      voice.start().catch(() => toast('Microphone access is blocked.'));
    }
  }

  const sessionList = (
    <div className="flex h-full flex-col">
      <button type="button" onClick={newChat} className="mb-3 flex items-center justify-center gap-2 rounded-full border border-ink/10 bg-olive px-4 py-2.5 font-display font-bold shadow-lift">
        <Plus className="size-4" /> New chat
      </button>
      <div className="space-y-1 overflow-y-auto">
        {sessions.data?.map((s) => (
          <div key={s.id} className={cn('group flex items-center rounded-2xl', s.id === sessionId ? 'bg-cream-deep' : 'hover:bg-cream-deep/60')}>
            <button type="button" onClick={() => void openSession(s.id)} className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm font-semibold">
              {s.title}
            </button>
            <button
              type="button"
              aria-label="Delete chat"
              onClick={async () => {
                await api.ai.deleteSession(s.id);
                if (s.id === sessionId) newChat();
                void queryClient.invalidateQueries({ queryKey: keys.chatSessions });
              }}
              className="mr-1 hidden rounded-full p-2 text-ink-faint group-hover:block hover:text-cherry"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {sessions.data?.length === 0 && <p className="px-3 text-sm text-ink-faint">No chats yet.</p>}
      </div>
    </div>
  );

  return (
    <div className="grid gap-6 lg:h-[calc(100dvh-5rem)] lg:grid-cols-[240px_1fr]">
      <aside className="hidden rounded-card border border-line bg-paper p-3 lg:block">{sessionList}</aside>

      <section className="flex min-h-[calc(100dvh-12rem)] flex-col lg:min-h-0">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <h1 className="text-3xl font-semibold">Ask Cherri</h1>
          <button type="button" onClick={() => setShowHistory((v) => !v)} className="flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1.5 text-sm font-bold">
            <History className="size-4" /> History
          </button>
        </div>
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 max-h-72 rounded-card border border-line bg-paper p-3 lg:hidden">
              {sessionList}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 space-y-5 overflow-y-auto pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center px-2 pt-6 text-center sm:pt-12">
              <CherryMark className="size-24 animate-float" mood="wink" />
              <h2 className="mt-4 text-4xl font-semibold sm:text-5xl">Ask Cherri anything</h2>
              <p className="mt-2 max-w-md text-ink-soft">
                English, Hindi or Hinglish. Cherri knows your cycle and your labs, cites trusted sources, and can log symptoms for you.
              </p>
              <div className="mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold transition-colors hover:border-ink">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <Bubble key={m.id} message={m} />)
          )}
          <div ref={endRef} />
        </div>

        <form
          className="sticky bottom-24 flex items-end gap-2 rounded-[28px] border border-ink/10 bg-paper p-2 shadow-lift lg:bottom-0"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <textarea
            value={voice.state === 'recording' ? 'Listening… tap stop when done' : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            disabled={voice.state !== 'idle'}
            rows={1}
            placeholder="Message Cherri…"
            aria-label="Message Cherri"
            className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] placeholder:text-ink-faint focus:outline-none"
          />
          {voice.supported && (
            <button
              type="button"
              onClick={() => void toggleVoice()}
              disabled={busy || voice.state === 'transcribing'}
              aria-label={voice.state === 'recording' ? 'Stop recording' : 'Speak to Cherri'}
              className={cn('grid size-11 shrink-0 place-items-center rounded-full', voice.state === 'recording' ? 'animate-pulse bg-cherry text-white' : 'bg-cream-deep hover:bg-line')}
            >
              {voice.state === 'transcribing' ? <Spinner className="size-4" /> : voice.state === 'recording' ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
            </button>
          )}
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-cream disabled:opacity-40">
            {busy ? <Spinner className="size-4 border-cream/30 border-t-cream" /> : <Send className="size-5" />}
          </button>
        </form>
        <p className="mt-2 hidden text-center text-[11px] text-ink-faint lg:block">Cherri gives health information, not a diagnosis.</p>
      </section>
    </div>
  );
}
