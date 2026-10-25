import { useId } from 'react';
import { cn } from '@/lib/cn';
import { moonLitPath, polar } from '@/lib/svg';

const BLOBS = [
  'M43.9,-58.6C55.7,-50.9,63.2,-36.4,67.5,-21C71.8,-5.6,72.8,10.7,66.7,23.9C60.6,37.1,47.3,47.2,33,55.6C18.7,64,3.3,70.7,-12.6,70.2C-28.6,69.7,-45.2,62,-56.1,49.4C-67.1,36.8,-72.4,19.4,-71.2,3.3C-70.1,-12.8,-62.6,-27.6,-51.8,-35.6C-41,-43.6,-27,-44.9,-14.2,-52.1C-1.4,-59.4,10.2,-72.6,23.3,-73.1C36.3,-73.6,32.1,-66.3,43.9,-58.6Z',
  'M38.2,-47.4C50.6,-38.2,62.4,-26.7,66.1,-12.7C69.8,1.2,65.4,17.6,56.4,30.4C47.4,43.2,33.8,52.5,18.6,58.5C3.4,64.5,-13.4,67.3,-27.6,62C-41.9,56.7,-53.6,43.3,-61.2,27.6C-68.8,11.9,-72.3,-6.1,-66.2,-20.4C-60,-34.7,-44.2,-45.3,-29.4,-53.8C-14.6,-62.3,-0.8,-68.7,11.1,-66C23,-63.3,25.8,-56.6,38.2,-47.4Z',
  'M47.7,-55.5C60.2,-46.1,67.6,-29.4,69.4,-12.5C71.2,4.4,67.4,21.4,57.6,33.6C47.8,45.8,31.9,53.1,15.2,58.6C-1.5,64.1,-19,67.8,-33.3,61.6C-47.6,55.4,-58.7,39.4,-64.7,21.8C-70.7,4.2,-71.6,-15,-63.6,-29.4C-55.6,-43.8,-38.7,-53.4,-22.6,-61.4C-6.5,-69.4,8.8,-75.8,23.3,-72.8C37.8,-69.8,35.2,-64.9,47.7,-55.5Z',
];

/** Soft organic shape behind illustrations. */
export function Blob({ className, color = '#E6E9D3', variant = 0 }: { className?: string; color?: string; variant?: 0 | 1 | 2 }) {
  return (
    <svg viewBox="-80 -80 160 160" className={cn('pointer-events-none', className)} aria-hidden="true">
      <path d={BLOBS[variant]} fill={color} />
    </svg>
  );
}

/**
 * A round, tilted stamp with a stitched inner ring, e.g. "NO EMAIL NEEDED".
 * Pass position and size together in `className` (e.g. "absolute -top-6 right-0 size-24").
 */
export function Sticker({
  children,
  className = 'relative size-28',
  textClassName = 'px-4 text-[12px]',
  color = '#A4B26B',
  textColor = '#33261C',
  tilt = -10,
}: {
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
  color?: string;
  textColor?: string;
  tilt?: number;
}) {
  return (
    <span className={cn('inline-grid place-items-center', className)} style={{ rotate: `${tilt}deg` }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full drop-shadow-[0_10px_18px_rgb(51_38_28/0.18)]" aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill={color} />
        <circle cx="50" cy="50" r="41" fill="none" stroke={textColor} strokeOpacity=".35" strokeWidth="1.2" strokeDasharray="3 3.5" />
      </svg>
      <span className={cn('relative text-center leading-tight font-semibold tracking-wide uppercase', textClassName)} style={{ color: textColor }}>
        {children}
      </span>
    </span>
  );
}

/** Four-point sparkle. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('pointer-events-none', className)} aria-hidden="true">
      <path d="M12 0c.7 6.3 5 10.9 12 12-7 1.1-11.3 5.7-12 12-.7-6.3-5-10.9-12-12C7 10.9 11.3 6.3 12 0Z" fill="currentColor" />
    </svg>
  );
}

/** Mimoli-style sun: short rounded rays fanning over a half or full circle. */
export function SunRays({
  className,
  color = 'currentColor',
  count = 9,
  spread = 180,
  inner = 34,
  outer = 48,
  width = 4,
}: {
  className?: string;
  color?: string;
  count?: number;
  spread?: number;
  inner?: number;
  outer?: number;
  width?: number;
}) {
  const start = -90 - spread / 2;
  const step = spread === 360 ? 360 / count : spread / (count - 1);
  return (
    <svg viewBox="-50 -50 100 100" className={cn('pointer-events-none', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const from = polar(0, 0, inner, start + i * step);
        const to = polar(0, 0, outer, start + i * step);
        return (
          <line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/** Text running around a circle, spinning slowly, with an optional centre. */
export function CircleText({ text, className, children, color = 'currentColor' }: { text: string; className?: string; children?: React.ReactNode; color?: string }) {
  const id = useId();
  return (
    <span className={cn('relative inline-grid place-items-center', className)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full animate-spin-slow" aria-hidden="true">
        <defs>
          <path id={id} d="M50 50m-38 0a38 38 0 1 1 76 0a38 38 0 1 1-76 0" />
        </defs>
        <text fill={color} fontSize="9.2" letterSpacing="2.2" fontWeight={600} style={{ textTransform: 'uppercase' }}>
          <textPath href={`#${id}`}>{text}</textPath>
        </text>
      </svg>
      {children && <span className="relative">{children}</span>}
    </span>
  );
}

/** A single leaf, for floating decoration. */
export function Leaf({ className, color = '#8E9F55', vein = '#C9D19A' }: { className?: string; color?: string; vein?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('pointer-events-none', className)} aria-hidden="true">
      <path d="M4 36C4 18 16 5 36 4c0 20-13 32-32 32Z" fill={color} />
      <path d="M6 34C14 25 22 17 32 8" fill="none" stroke={vein} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** A curved sprig with alternating leaves. */
export function Sprig({ className, color = '#8E9F55' }: { className?: string; color?: string }) {
  const leaves = [
    { x: 30, y: 78, r: -35 },
    { x: 44, y: 66, r: 30 },
    { x: 46, y: 50, r: -40 },
    { x: 58, y: 40, r: 25 },
    { x: 58, y: 25, r: -30 },
  ];
  return (
    <svg viewBox="0 0 100 100" className={cn('pointer-events-none', className)} aria-hidden="true">
      <path d="M22 96C34 74 52 52 66 10" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      {leaves.map((l, i) => (
        <ellipse key={i} cx={l.x} cy={l.y} rx="11" ry="4.6" fill={color} transform={`rotate(${l.r} ${l.x} ${l.y})`} />
      ))}
    </svg>
  );
}

/**
 * A moon at a point in its cycle: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter.
 */
export function MoonPhase({ phase, className, lit = '#F3E6C6', dark = '#46362A' }: { phase: number; className?: string; lit?: string; dark?: string }) {
  const p = ((phase % 1) + 1) % 1;
  const r = 20;
  return (
    <svg viewBox="-22 -22 44 44" className={cn('pointer-events-none', className)} aria-hidden="true">
      <circle r={r} fill={dark} />
      {p > 0.01 && p < 0.99 && <path d={moonLitPath(p, r)} fill={lit} />}
    </svg>
  );
}
