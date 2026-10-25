'use client';

import { verdictStyles, type Myth, type MythCheck } from '@cherri/shared';
import { ArrowRight, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { ErrorNote, EvidenceMeter, PageHeader, PageLoader, Spinner } from '@/components/ui/misc';
import { api } from '@/lib/api';
import { useArticles, useMyths } from '@/lib/queries';

const DECK_TONES = ['#E6E9D3', '#F3E6C6', '#DFE7E3', '#F0E0CC', '#E6EADD'];

function MythDeck({ myths }: { myths: Myth[] }) {
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState<'fact' | 'myth' | null>(null);
  const [score, setScore] = useState(0);
  const myth = myths[index % myths.length]!;
  const isFact = myth.verdict === 'TRUE';
  const correct = guess !== null && (guess === 'fact') === isFact;
  const verdict = verdictStyles[myth.verdict];

  function choose(choice: 'fact' | 'myth') {
    if (guess) return;
    setGuess(choice);
    if ((choice === 'fact') === isFact) setScore((s) => s + 1);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm font-bold text-ink-soft">
        <span>
          Card {(index % myths.length) + 1} of {myths.length}
        </span>
        <span>Score: {score} 🍒</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={myth.id}
          initial={{ opacity: 0, rotate: -3, y: 20 }}
          animate={{ opacity: 1, rotate: 0, y: 0 }}
          exit={{ opacity: 0, rotate: 4, x: 60 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <Card sticker className="min-h-72" style={{ background: DECK_TONES[index % DECK_TONES.length] }}>
            <p className="text-xs font-semibold tracking-[0.18em] text-ink-soft uppercase">Myth or fact?</p>
            <h3 className="mt-3 text-2xl leading-snug font-semibold sm:text-3xl">“{myth.claim}”</h3>
            {guess ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: verdict.bg, color: verdict.ink }}>
                    {verdict.emoji} {verdict.label}
                  </span>
                  <span className="text-sm font-bold">{correct ? 'You got it! 🎉' : 'Not quite!'}</span>
                </div>
                <p className="mt-3 text-[15px]">{myth.explanation}</p>
                <EvidenceMeter level={myth.evidence} className="mt-3" />
              </motion.div>
            ) : (
              <div className="mt-8 grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg" onClick={() => choose('myth')}>
                  ❌ Myth
                </Button>
                <Button size="lg" onClick={() => choose('fact')}>
                  ✅ Fact
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
      {guess && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="olive"
            onClick={() => {
              setGuess(null);
              setIndex((i) => i + 1);
            }}
          >
            Next card <ArrowRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function ClaimChecker() {
  const [claim, setClaim] = useState('');
  const [result, setResult] = useState<MythCheck | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function check(event: React.FormEvent) {
    event.preventDefault();
    if (claim.trim().length < 3) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await api.ai.mythCheck({ claim }));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  const verdict = result ? verdictStyles[result.verdict] : null;
  return (
    <Card tone="ink">
      <p className="text-xs font-semibold tracking-[0.18em] text-olive uppercase">Fact-checker</p>
      <h3 className="mt-1 text-2xl font-semibold text-cream">Saw something on Insta? Check it.</h3>
      <form onSubmit={check} className="mt-4 flex gap-2">
        <Input value={claim} onChange={(e) => setClaim(e.target.value)} placeholder="e.g. jeera water cures PCOS" className="border-transparent" />
        <Button variant="olive" type="submit" disabled={loading} aria-label="Check claim">
          {loading ? <Spinner className="size-4" /> : <Search className="size-5" />}
        </Button>
      </form>
      {error !== null && (
        <div className="mt-3">
          <ErrorNote error={error} />
        </div>
      )}
      {result && verdict && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-3xl bg-paper p-4 text-ink">
          <span className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: verdict.bg, color: verdict.ink }}>
            {verdict.emoji} {verdict.label}
          </span>
          <p className="mt-3 text-[15px]">{result.explanation.replace(/\s*\[\d+\]/g, '')}</p>
          <EvidenceMeter level={result.evidence} className="mt-3" />
          {result.citations.length > 0 && (
            <p className="mt-3 text-xs text-ink-soft">
              Source:{' '}
              {result.citations.map((c) => (
                <Link key={c.index} href={`/learn/${c.articleId}`} className="font-bold underline">
                  {c.title} ({c.source})
                </Link>
              ))}
            </p>
          )}
        </motion.div>
      )}
    </Card>
  );
}

export default function LearnPage() {
  const myths = useMyths();
  const articles = useArticles();

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Learn" title="Body literacy, minus the lecture">
        Bust myths your aunties swear by, check claims from the internet, and read short guides from WHO, NHS and Government of India sources.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <SectionTitle eyebrow="Swipe game" title="Myth or fact?" />
          {myths.data ? <MythDeck myths={myths.data} /> : <PageLoader />}
        </section>
        <section className="lg:pt-12">
          <ClaimChecker />
        </section>
      </div>

      <section>
        <SectionTitle eyebrow="Library" title="Short, trusted guides" />
        {articles.isLoading ? (
          <PageLoader />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.data?.map((a) => (
              <Link key={a.id} href={`/learn/${a.id}`} className="group flex flex-col rounded-card border border-line bg-paper p-5 shadow-soft transition-transform hover:-translate-y-1">
                <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">{a.source}</p>
                <h3 className="mt-1 text-lg leading-snug font-semibold">{a.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{a.summary}</p>
                <span className="mt-auto pt-3 text-sm font-bold">
                  Read <ArrowRight className="inline size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
