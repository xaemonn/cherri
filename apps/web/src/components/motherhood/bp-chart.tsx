'use client';

import { formatDay, toDayNumber, type BloodPressureReading } from '@cherri/shared';
import { useMemo, useState } from 'react';

// Validated with the dataviz palette checker on the paper surface (#FBF7EF): all checks pass.
const SYSTOLIC = '#B5512F';
const DIASTOLIC = '#1B6FAE';
const GRID = '#E0D3BD';
const SURFACE = '#FBF7EF';

const W = 640;
const H = 240;
const PAD = { top: 16, right: 48, bottom: 28, left: 36 };

/** Blood pressure over time on one mmHg axis, with the 140/90 line she should know about. */
export function BloodPressureChart({ readings }: { readings: readonly BloodPressureReading[] }) {
  const [active, setActive] = useState<number | null>(null);

  const scale = useMemo(() => {
    const days = readings.map((r) => toDayNumber(r.date));
    const first = Math.min(...days);
    const span = Math.max(1, Math.max(...days) - first);
    const low = Math.max(40, Math.floor((Math.min(...readings.map((r) => r.diastolic)) - 10) / 20) * 20);
    const high = Math.ceil((Math.max(150, ...readings.map((r) => r.systolic)) + 10) / 20) * 20;
    const x = (date: string) => PAD.left + ((toDayNumber(date) - first) / span) * (W - PAD.left - PAD.right);
    const y = (value: number) => PAD.top + (1 - (value - low) / (high - low)) * (H - PAD.top - PAD.bottom);
    const ticks = Array.from({ length: (high - low) / 20 + 1 }, (_, i) => low + i * 20);
    return { x, y, ticks };
  }, [readings]);

  if (readings.length === 0) return null;
  const { x, y, ticks } = scale;
  const path = (key: 'systolic' | 'diastolic') => readings.map((r, i) => `${i ? 'L' : 'M'}${x(r.date).toFixed(1)},${y(r[key]).toFixed(1)}`).join(' ');
  const last = readings.at(-1)!;
  const shown = active === null ? null : readings[active]!;

  function pick(clientX: number, rect: DOMRect) {
    const svgX = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    readings.forEach((r, i) => {
      if (Math.abs(x(r.date) - svgX) < Math.abs(x(readings[best]!.date) - svgX)) best = i;
    });
    setActive(best);
  }

  return (
    <figure className="space-y-3">
      <figcaption className="flex flex-wrap gap-4 text-sm text-ink-soft">
        <LegendKey color={SYSTOLIC} label="Systolic (top number)" />
        <LegendKey color={DIASTOLIC} label="Diastolic (bottom number)" />
      </figcaption>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none overflow-visible"
          role="img"
          aria-label={`Blood pressure, ${readings.length} readings. Latest ${last.systolic}/${last.diastolic} on ${formatDay(last.date)}.`}
          tabIndex={0}
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') setActive((i) => Math.min(readings.length - 1, (i ?? -1) + 1));
            if (e.key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? readings.length) - 1));
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink-faint text-[11px] tabular-nums">
                {t}
              </text>
            </g>
          ))}
          {[140, 90].map((limit) => (
            <g key={limit}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(limit)} y2={y(limit)} stroke="#A3927F" strokeWidth={1} />
              {/* Left, above the line: the right edge belongs to the latest readings' labels. */}
              <text x={PAD.left + 4} y={y(limit) - 5} className="fill-ink-soft text-[11px] font-semibold">
                {limit === 140 ? '140 systolic: high' : '90 diastolic: high'}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={H - 6} className="fill-ink-faint text-[11px]">
            {formatDay(readings[0]!.date)}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-ink-faint text-[11px]">
            {formatDay(last.date)}
          </text>

          {shown && <line x1={x(shown.date)} x2={x(shown.date)} y1={PAD.top} y2={H - PAD.bottom} stroke="#6B5A4A" strokeWidth={1} />}
          {(['systolic', 'diastolic'] as const).map((key) => (
            <g key={key}>
              <path d={path(key)} fill="none" stroke={key === 'systolic' ? SYSTOLIC : DIASTOLIC} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {readings.map((r, i) => (
                <circle
                  key={r.date}
                  cx={x(r.date)}
                  cy={y(r[key])}
                  r={i === active || i === readings.length - 1 ? 5 : 4}
                  fill={key === 'systolic' ? SYSTOLIC : DIASTOLIC}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              ))}
            </g>
          ))}
          {/* End labels in text colour; the line beside them carries the identity. */}
          <text x={x(last.date) + 10} y={y(last.systolic)} dy="0.32em" className="fill-ink text-[12px] font-bold">
            {last.systolic}
          </text>
          <text x={x(last.date) + 10} y={y(last.diastolic)} dy="0.32em" className="fill-ink text-[12px] font-bold">
            {last.diastolic}
          </text>
        </svg>

        {shown && (
          <div
            className="pointer-events-none absolute top-0 rounded-2xl border border-line bg-paper px-3 py-2 text-sm shadow-lift"
            style={{ left: `${Math.min(70, (x(shown.date) / W) * 100)}%` }}
            role="status"
          >
            <p className="text-xs text-ink-soft">{formatDay(shown.date, { weekday: true })}</p>
            <p className="font-bold">
              {shown.systolic}/{shown.diastolic} <span className="font-normal text-ink-soft">mmHg</span>
            </p>
            <p className="text-xs text-ink-soft">Mean arterial pressure {shown.map}</p>
          </div>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-ink-soft">See all readings as a table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-xs text-ink-soft uppercase">
            <tr>
              <th className="py-1 pr-3 font-semibold">Date</th>
              <th className="py-1 pr-3 font-semibold">Systolic</th>
              <th className="py-1 pr-3 font-semibold">Diastolic</th>
              <th className="py-1 font-semibold">MAP</th>
            </tr>
          </thead>
          <tbody>
            {[...readings].reverse().map((r) => (
              <tr key={r.date} className="border-t border-line/70">
                <td className="py-1 pr-3">{formatDay(r.date, { year: true })}</td>
                <td className="py-1 pr-3">{r.systolic}</td>
                <td className="py-1 pr-3">{r.diastolic}</td>
                <td className="py-1">{r.map}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="18" height="8" aria-hidden="true">
        <line x1="1" x2="17" y1="4" y2="4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}
