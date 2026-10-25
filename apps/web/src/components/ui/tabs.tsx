'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  badge?: string | number | null;
}

/** Segmented tabs: long pages show one focused section at a time. */
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: TabItem<T>[]; value: T; onChange: (id: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('scrollbar-none -mx-1 flex gap-1 overflow-x-auto rounded-full border border-line bg-paper p-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
            value === t.id ? 'bg-olive-deep text-cream shadow-lift' : 'text-ink-soft hover:bg-cream hover:text-ink',
          )}
        >
          {t.icon && <t.icon className="size-4" strokeWidth={1.9} />}
          {t.label}
          {t.badge != null && t.badge !== '' && (
            <span className={cn('rounded-full px-1.5 text-xs', value === t.id ? 'bg-white/20' : 'bg-cream-deep')}>{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
