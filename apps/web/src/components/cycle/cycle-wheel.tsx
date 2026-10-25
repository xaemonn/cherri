import { phaseColors, phaseForDay } from '@cherri/shared';

function point(cx: number, cy: number, r: number, degrees: number) {
  const rad = ((degrees - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, start: number, end: number) {
  const a = point(cx, cy, r, start);
  const b = point(cx, cy, r, end);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${end - start > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

/**
 * The cycle as a ring of beads, one per day, coloured by phase. Past days are solid,
 * the future is faded, and today wears a ring.
 */
export function CycleWheel({
  day,
  cycleLength,
  periodLength,
  children,
  className,
}: {
  day: number;
  cycleLength: number;
  periodLength: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const total = Math.max(cycleLength, day);
  const size = 240;
  const c = size / 2;
  const r = 98;
  const gap = total > 40 ? 1.6 : 2.4;
  const todayAngle = ((day - 0.5) / total) * 360;
  const marker = point(c, c, r, todayAngle);

  return (
    <div className={className} style={{ position: 'relative', aspectRatio: '1 / 1' }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full" role="img" aria-label={`Cycle day ${day} of about ${cycleLength}`}>
        <circle cx={c} cy={c} r={r + 17} fill="#FFFCFB" stroke="#2E2230" strokeWidth="2.5" />
        {Array.from({ length: total }, (_, i) => {
          const d = i + 1;
          const phase = phaseForDay(d, cycleLength, periodLength);
          const start = (i / total) * 360 + gap / 2;
          const end = ((i + 1) / total) * 360 - gap / 2;
          return (
            <path
              key={d}
              d={arc(c, c, r, start, end)}
              fill="none"
              stroke={phaseColors[phase].fill}
              strokeWidth={d === day ? 24 : 18}
              strokeLinecap="round"
              opacity={d > day ? 0.35 : 1}
            />
          );
        })}
        <circle cx={marker.x} cy={marker.y} r="14" fill="#FFFCFB" stroke="#2E2230" strokeWidth="3" />
        <circle cx={marker.x} cy={marker.y} r="5" fill="#2E2230" />
      </svg>
      <div className="absolute inset-[22%] grid place-items-center text-center">{children}</div>
    </div>
  );
}
