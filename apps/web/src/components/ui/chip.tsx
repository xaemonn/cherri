import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/** Toggleable pill used for symptoms, life stages, filters. */
export function Chip({
  selected = false,
  emoji,
  className,
  children,
  ...props
}: ComponentProps<'button'> & { selected?: boolean; emoji?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-300 ease-out-soft active:scale-95',
        selected ? 'border-olive-deep bg-olive-deep text-cream shadow-lift' : 'border-line bg-paper text-ink hover:border-olive-deep/50 hover:bg-olive-soft/60',
        className,
      )}
      {...props}
    >
      {emoji && <span aria-hidden="true">{emoji}</span>}
      {children}
    </button>
  );
}

export function Pill({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', className)} style={style}>
      {children}
    </span>
  );
}
