import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'olive' | 'outline' | 'ghost' | 'cream';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-cream hover:bg-[#46362A]',
  olive: 'bg-olive-deep text-cream shadow-lift hover:-translate-y-0.5 hover:bg-forest hover:shadow-lift-lg active:translate-y-0',
  outline: 'border border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-cream',
  ghost: 'text-ink hover:bg-cream-deep',
  cream: 'bg-cream text-ink hover:bg-paper',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-14 px-7 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight whitespace-nowrap transition-all duration-300 ease-out-soft disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
