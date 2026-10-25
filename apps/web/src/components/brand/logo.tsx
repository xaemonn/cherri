import { cn } from '@/lib/cn';

/** Two sleepy-smiling cherries on one stem. Rust fruit, olive leaf, never pink. */
export function CherryMark({ className, mood = 'happy' }: { className?: string; mood?: 'happy' | 'wink' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M33 10C30 22 24 30 21 39M33 10c3 11 7 18 10.5 26" fill="none" stroke="#5A3E2B" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M33 10c6.5-6.5 16-5.5 21.5 1C47 16.5 39 16 33 10Z" fill="#8E9F55" />
      <path d="M35.5 10.5c5-2 10.5-1.6 15 .6" fill="none" stroke="#C9D19A" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="20" cy="45" r="12" fill="#A8432C" />
      <circle cx="44.5" cy="43" r="12" fill="#A8432C" />
      <path d="M29.5 50.5a12 12 0 0 1-17.8 3.3" fill="none" stroke="#8C3522" strokeWidth="3" strokeLinecap="round" opacity=".55" />
      <path d="M54 48.5a12 12 0 0 1-17.8 3.3" fill="none" stroke="#8C3522" strokeWidth="3" strokeLinecap="round" opacity=".55" />
      <ellipse cx="14.8" cy="39.6" rx="3.2" ry="2" fill="#F3EBDD" opacity=".55" transform="rotate(-25 14.8 39.6)" />
      <ellipse cx="39.3" cy="37.6" rx="3.2" ry="2" fill="#F3EBDD" opacity=".55" transform="rotate(-25 39.3 37.6)" />
      {/* faces: closed happy eyes */}
      <path d="M15.2 45.6q1.3-1.5 2.6 0M22.2 45.6q1.3-1.5 2.6 0" fill="none" stroke="#33261C" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M17.6 49q2.4 1.9 4.8 0" fill="none" stroke="#33261C" strokeWidth="1.3" strokeLinecap="round" />
      {mood === 'wink' ? (
        <path d="M39.8 43.4h2.6" stroke="#33261C" strokeWidth="1.3" strokeLinecap="round" />
      ) : (
        <path d="M39.8 43.6q1.3-1.5 2.6 0" fill="none" stroke="#33261C" strokeWidth="1.3" strokeLinecap="round" />
      )}
      <path d="M46.7 43.6q1.3-1.5 2.6 0" fill="none" stroke="#33261C" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M42.1 47q2.4 1.9 4.8 0" fill="none" stroke="#33261C" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <CherryMark className="size-9 shrink-0" />
      <span className={cn('font-display text-[26px] leading-none font-semibold tracking-tight', light ? 'text-cream' : 'text-ink')}>cherri</span>
    </span>
  );
}
