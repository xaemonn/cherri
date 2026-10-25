import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

const base =
  'w-full rounded-2xl border border-line bg-paper px-4 text-[15px] text-ink placeholder:text-ink-faint transition-all duration-300 focus:border-olive-deep focus:ring-4 focus:ring-olive/25 focus:outline-none';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(base, 'h-12', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(base, 'min-h-24 py-3', className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(base, 'h-12 appearance-none', className)} {...props} />;
}

export function Label({ children, hint, className }: { children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <span className={cn('mb-1.5 block', className)}>
      <span className="text-sm font-semibold">{children}</span>
      {hint && <span className="ml-2 text-xs text-ink-soft">{hint}</span>}
    </span>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-2 rounded-xl bg-cherry-soft px-3 py-2 text-sm font-medium text-cherry-deep">
      {children}
    </p>
  );
}
