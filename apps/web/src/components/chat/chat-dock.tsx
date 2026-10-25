'use client';

import type { Citation } from '@cherri/shared';
import { ArrowUp, Maximize2, MessageCircleHeart, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { RichText } from '@/components/chat/rich-text';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/lib/i18n';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  streaming?: boolean;
}

const PAGE_NAMES: Record<string, string> = {
  '/home': 'Home dashboard',
  '/log': 'Daily log',
  '/insights': 'Insights',
  '/cycle': 'Cycle calendar',
  '/checks': 'Health checks',
  '/labs': 'Lab decoder',
  '/prep': 'Visit prep',
  '/report': 'Doctor report',
  '/learn': 'Learn & myths',
  '/care': 'Find care',
  '/consult': 'Consult a doctor',
  '/meds': 'Medicine guardian',
  '/ec': 'Accident help (emergency contraception)',
  '/pregnancy': 'Pregnancy & baby',
  '/mind': 'Mind check',
  '/wrapped': 'Cycle Wrapped',
  '/settings': 'Settings',
};

function pageName(pathname: string): string {
  const base = `/${pathname.split('/')[1] ?? ''}`;
  return PAGE_NAMES[base] ?? 'Cherri';
}

/** What she can see right now: the page name plus the visible text of the main area. */
function readPageContext(pathname: string, lang: string): string {
  const main = document.querySelector('main');
  const text = (main?.innerText ?? '').replace(/\s+\n/g, '\n').replace(/\n{2,}/g, '\n').trim().slice(0, 1600);
  const language = lang === 'hi' ? 'The app is shown in Hindi: reply in Hindi (Devanagari) unless she writes in another language.\n' : '';
  return `${language}Page: ${pageName(pathname)} (${pathname})\nVisible on screen:\n${text}`;
}

const SUGGESTIONS = ['Explain this page simply', 'What should I do next?', 'Is anything here worrying?'];

/** "Ask Cherri" in a corner of every page: it knows which page she is on and what it shows. */
export function ChatDock() {
  const pathname = usePathname();
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  // The full chat page has its own composer.
  if (pathname.startsWith('/chat')) return null;

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', content: message }, { role: 'assistant', content: '', streaming: true }]);
    const update = (fn: (m: Message) => Message) => setMessages((all) => [...all.slice(0, -1), fn(all[all.length - 1]!)]);
    try {
      await api.ai.chat({ message, pageContext: readPageContext(pathname, lang), ...(sessionId && { sessionId }) }, (event) => {
        if (event.type === 'session') setSessionId(event.sessionId);
        else if (event.type === 'token') update((r) => ({ ...r, content: r.content + event.text }));
        else if (event.type === 'citations') update((r) => ({ ...r, citations: event.citations }));
        else if (event.type === 'safety') update((r) => ({ ...r, content: `${event.message}\n\n${r.content}` }));
        else if (event.type === 'done') update((r) => ({ ...r, streaming: false }));
        else if (event.type === 'error') update((r) => ({ ...r, streaming: false, content: r.content || event.message }));
      });
    } catch (e) {
      update((r) => ({ ...r, streaming: false, content: e instanceof Error ? e.message : 'Something went wrong. Try again.' }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="print:hidden">
      <AnimatePresence>
        {open && (
          <motion.section
            aria-label="Ask Cherri"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed right-3 bottom-40 z-50 flex h-[min(560px,70dvh)] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[24px] border border-line bg-paper shadow-lift-lg lg:right-6 lg:bottom-24"
          >
            <header className="flex items-center gap-3 border-b border-line bg-olive-soft/60 px-4 py-3">
              <span className="grid size-9 place-items-center rounded-xl bg-olive-deep text-cream">
                <MessageCircleHeart className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t('nav.chat', 'Ask Cherri')}</p>
                <p className="truncate text-xs text-ink-soft">Looking at: {pageName(pathname)}</p>
              </div>
              <Link href="/chat" aria-label="Open full chat" className="rounded-full p-2 text-ink-soft hover:bg-paper">
                <Maximize2 className="size-4" />
              </Link>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="rounded-full p-2 text-ink-soft hover:bg-paper">
                <X className="size-4" />
              </button>
            </header>

            <div ref={scroller} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {messages.length === 0 ? (
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-ink-soft">Ask anything about this page or your health.</p>
                  <div className="flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" onClick={() => void send(s)} className="rounded-2xl border border-line bg-cream px-3 py-2 text-left text-sm font-medium hover:border-olive-deep hover:bg-olive-soft">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm', m.role === 'user' ? 'rounded-br-md bg-olive-deep text-cream' : 'rounded-bl-md bg-cream')}>
                      {m.role === 'assistant' ? (
                        m.content ? (
                          <RichText text={m.content} citations={m.citations} />
                        ) : (
                          <span className="inline-flex gap-1" aria-label="Cherri is typing">
                            {[0, 1, 2].map((d) => (
                              <span key={d} className="size-1.5 animate-bounce rounded-full bg-ink-faint" style={{ animationDelay: `${d * 120}ms` }} />
                            ))}
                          </span>
                        )
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              className="flex items-end gap-2 border-t border-line p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Ask in English, Hindi or Hinglish…"
                aria-label="Message Cherri"
                className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-olive-deep"
              />
              <button type="submit" aria-label="Send" disabled={!input.trim() || busy} className="grid size-11 shrink-0 place-items-center rounded-full bg-olive-deep text-cream disabled:opacity-40">
                <ArrowUp className="size-5" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close Ask Cherri' : 'Ask Cherri'}
        className="fixed right-3 bottom-24 z-50 inline-flex h-13 items-center gap-2 rounded-full bg-olive-deep px-5 font-semibold text-cream shadow-lift-lg transition-transform hover:-translate-y-0.5 lg:right-6 lg:bottom-6"
      >
        {open ? <X className="size-5" /> : <MessageCircleHeart className="size-5" />}
        <span className="hidden sm:inline">{t('nav.chat', 'Ask Cherri')}</span>
      </button>
    </div>
  );
}
