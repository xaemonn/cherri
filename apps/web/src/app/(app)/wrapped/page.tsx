'use client';

import { formatDay, PHASE_GUIDES, phaseColors, type WrappedResponse } from '@cherri/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Blob, Sparkle } from '@/components/brand/decor';
import { CherryMark } from '@/components/brand/logo';
import { ErrorNote, PageLoader } from '@/components/ui/misc';
import { useAuth } from '@/lib/auth';
import { useWrapped } from '@/lib/queries';

const BLOB_COLORS = ['#A4B26B', '#FBF7EF', '#33261C', '#D9AA55', '#C48A5A', '#8FAAA3'];

interface Slide {
  bg: string;
  ink: string;
  eyebrow: string;
  big: string;
  caption: string;
}

function slidesFor(w: WrappedResponse, name: string | null): Slide[] {
  const slides: Slide[] = [
    { bg: '#33261C', ink: '#F3EBDD', eyebrow: 'Cycle Wrapped', big: `${name ? `${name}’s` : 'Your'} last 90 days`, caption: `${formatDay(w.rangeStart)} – ${formatDay(w.rangeEnd)}` },
    { bg: '#A4B26B', ink: '#33261C', eyebrow: 'You showed up', big: `${w.daysLogged} days logged`, caption: `Longest streak: ${w.longestStreak} days in a row. That’s real self-care.` },
  ];
  if (w.periodsTracked > 0) {
    slides.push({
      bg: '#D9AA55',
      ink: '#33261C',
      eyebrow: 'Your rhythm',
      big: w.avgCycleLength ? `${Math.round(w.avgCycleLength)}-day cycles` : `${w.periodsTracked} periods tracked`,
      caption: `${w.periodsTracked} period${w.periodsTracked === 1 ? '' : 's'} tracked. Every one made Cherri’s predictions sharper.`,
    });
  }
  if (w.powerPhase) {
    const guide = PHASE_GUIDES[w.powerPhase];
    slides.push({ bg: phaseColors[w.powerPhase].fill, ink: '#33261C', eyebrow: 'Your power phase', big: `${guide.emoji} ${guide.vibe}`, caption: `Your mood and energy peak in your ${guide.name.toLowerCase()}. Plan the big stuff here.` });
  }
  if (w.topSymptoms.length > 0) {
    slides.push({
      bg: '#8FAAA3',
      ink: '#33261C',
      eyebrow: 'Top symptoms',
      big: w.topSymptoms.map((s) => s.label).join(' · '),
      caption: w.topSymptoms.map((s) => `${s.label}: ${s.days} days`).join(', '),
    });
  }
  if (w.toughPhase) {
    const guide = PHASE_GUIDES[w.toughPhase];
    slides.push({ bg: '#C48A5A', ink: '#33261C', eyebrow: 'Go easy on yourself during', big: `${guide.emoji} ${guide.vibe}`, caption: 'That’s when your pain tends to peak. Rest is productive too.' });
  }
  slides.push({
    bg: '#33261C',
    ink: '#F3EBDD',
    eyebrow: 'Cherri decoded',
    big: `${w.patternsFound} patterns · ${w.labsDecoded} reports · ${w.screeningsTaken} checks`,
    caption: 'Keep logging. Your next Wrapped will know you even better. 🍒',
  });
  return slides;
}

export default function WrappedPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useWrapped(90);
  const [index, setIndex] = useState(0);
  if (isLoading) return <PageLoader label="Wrapping your cycle…" />;
  if (error || !data) return <ErrorNote error={error} />;

  const slides = slidesFor(data, user?.name?.split(' ')[0] ?? null);
  const slide = slides[Math.min(index, slides.length - 1)]!;
  const go = (delta: number) => setIndex((i) => Math.min(slides.length - 1, Math.max(0, i + delta)));

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex gap-1.5">
        {slides.map((_, i) => (
          <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/15">
            <span className="block h-full rounded-full bg-ink transition-all" style={{ width: i <= index ? '100%' : '0%' }} />
          </span>
        ))}
      </div>
      <div className="relative aspect-[9/16] max-h-[78vh] w-full overflow-hidden rounded-[36px] border border-ink/10 shadow-lift-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 flex flex-col justify-end p-8"
            style={{ background: slide.bg, color: slide.ink }}
          >
            <Blob className="absolute -top-16 -right-16 size-64 opacity-60" color={BLOB_COLORS[index % BLOB_COLORS.length]} variant={(index % 3) as 0 | 1 | 2} />
            <Sparkle className="absolute top-28 left-12 size-7 animate-float opacity-80" />
            <Sparkle className="absolute top-52 right-16 size-5 animate-float opacity-60" />
            <CherryMark className="absolute top-8 left-8 size-12" />
            <p className="relative text-xs font-semibold tracking-[0.2em] uppercase opacity-80">{slide.eyebrow}</p>
            <h2 className="relative mt-3 text-5xl leading-[1] font-medium">{slide.big}</h2>
            <p className="relative mt-4 text-lg opacity-90">{slide.caption}</p>
          </motion.div>
        </AnimatePresence>
        <button type="button" className="absolute inset-y-0 left-0 w-1/3" onClick={() => go(-1)} aria-label="Previous slide" />
        <button type="button" className="absolute inset-y-0 right-0 w-2/3" onClick={() => go(1)} aria-label="Next slide" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button type="button" onClick={() => go(-1)} disabled={index === 0} className="grid size-11 place-items-center rounded-full border border-ink/10 disabled:opacity-30" aria-label="Previous">
          <ChevronLeft className="size-5" />
        </button>
        <p className="text-sm font-bold text-ink-soft">Tap to continue</p>
        <button type="button" onClick={() => go(1)} disabled={index === slides.length - 1} className="grid size-11 place-items-center rounded-full border border-ink/10 disabled:opacity-30" aria-label="Next">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
