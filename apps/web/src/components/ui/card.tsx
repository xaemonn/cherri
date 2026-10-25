import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'paper' | 'olive' | 'ochre' | 'dusk' | 'clay' | 'sage' | 'cherry' | 'ink' | 'cream';

const TONES: Record<Tone, string> = {
  paper: 'bg-paper border-line',
  cream: 'bg-cream-deep border-line',
  olive: 'bg-olive-soft border-[#CDD3AE]',
  ochre: 'bg-ochre-soft border-[#E6D3A4]',
  dusk: 'bg-dusk-soft border-[#C3D1CC]',
  clay: 'bg-clay-soft border-[#E7CBA8]',
  sage: 'bg-sage-soft border-[#CBD3BF]',
  cherry: 'bg-cherry-soft border-[#E5CDB0]',
  ink: 'bg-ink border-ink text-cream',
};

/** `sticker` lifts a card that deserves attention (the hero card on a page). */
export function Card({
  tone = 'paper',
  sticker = false,
  className,
  ...props
}: ComponentProps<'div'> & { tone?: Tone; sticker?: boolean }) {
  return (
    <div className={cn('rounded-card border p-5 sm:p-6', TONES[tone], sticker ? 'shadow-lift-lg' : 'shadow-lift', className)} {...props} />
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-[11px] font-semibold tracking-[0.2em] text-olive-deep uppercase">{eyebrow}</p>}
        <h2 className="text-xl font-medium sm:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
