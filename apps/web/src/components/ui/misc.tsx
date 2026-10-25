import { evidenceStyles, type EvidenceLevel } from '@cherri/shared';
import { SunRays } from '@/components/brand/decor';
import { CherryMark } from '@/components/brand/logo';
import { cn } from '@/lib/cn';

/** Small turning sun, for buttons and inline waits. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span role="status" aria-label="Loading" className={cn('inline-block size-5', className)}>
      <SunRays className="size-full animate-spin [animation-duration:1.6s]" count={8} spread={360} inner={22} outer={44} width={9} />
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-cream-deep', className)} />;
}

/** A sun rising inside an arch while its rays turn: the page-level wait. */
export function BohoLoader({ className }: { className?: string }) {
  return (
    <span className={cn('relative block size-28', className)} aria-hidden="true">
      <span className="absolute inset-x-3 top-2 bottom-0 overflow-hidden rounded-arch border border-ink/10 bg-ochre-soft">
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-olive-soft" />
        <span className="absolute left-1/2 size-12 -translate-x-1/2 animate-[sunrise_2.4s_var(--ease-out-soft)_infinite] rounded-full bg-ochre" />
      </span>
      <SunRays className="absolute -top-3 left-1/2 size-24 -translate-x-1/2 animate-[spin_9s_linear_infinite] text-clay" count={9} />
      <CherryMark className="absolute -right-1 bottom-0 size-9 animate-[float_3s_ease-in-out_infinite]" />
    </span>
  );
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="flex flex-col items-center gap-4 text-ink-soft">
        <BohoLoader />
        <span className="font-display text-lg italic">{label}</span>
      </div>
    </div>
  );
}

export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-ink/20 bg-paper/60 px-6 py-10 text-center">
      <span className="text-4xl" aria-hidden="true">
        {emoji}
      </span>
      <h3 className="text-lg font-medium">{title}</h3>
      {children && <div className="max-w-sm text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 animate-rise sm:mb-8">
      {eyebrow && <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-olive-deep uppercase">{eyebrow}</p>}
      <h1 className="text-4xl leading-[1] font-medium text-balance sm:text-5xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-[15px] text-ink-soft sm:text-base">{children}</div>}
    </header>
  );
}

/** Four dots: how strong the science behind a tip or claim is. */
export function EvidenceMeter({ level, className }: { level: EvidenceLevel; className?: string }) {
  const style = evidenceStyles[level];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', className)} style={{ color: style.ink }}>
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="size-2 rounded-full" style={{ background: i <= style.meter ? style.ink : '#E0D3BD' }} />
        ))}
      </span>
      {style.label}
    </span>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return <p className="rounded-2xl bg-cherry-soft px-4 py-3 text-sm font-medium text-cherry-deep">{message}</p>;
}
