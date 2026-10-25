'use client';

import { EMPTY_PBAC, PBAC_HEAVY_ML, PBAC_HEAVY_SCORE, PBAC_POINTS, pbacDayScore, type PbacEntry } from '@cherri/shared';
import { ChevronDown, Droplets, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

type Level = 'light' | 'moderate' | 'soaked';
type CountKey = Exclude<keyof PbacEntry, 'cupMl'>;

const FILL: Record<Level, number> = { light: 0.18, moderate: 0.5, soaked: 0.95 };
const LEVEL_LABEL: Record<Level, string> = { light: 'Lightly stained', moderate: 'Half soaked', soaked: 'Fully soaked' };

/** A pad seen from above, stained to the level she picks: the picture is the whole point of PBAC. */
function PadIcon({ level }: { level: Level }) {
  const h = 52 * FILL[level];
  return (
    <svg viewBox="0 0 40 64" className="h-14 w-9" aria-hidden="true">
      <defs>
        <clipPath id={`pad-${level}`}>
          <rect x="6" y="4" width="28" height="56" rx="14" />
        </clipPath>
      </defs>
      <rect x="6" y="4" width="28" height="56" rx="14" fill="#FFFCFB" stroke="#A3927F" strokeWidth="1.5" />
      <g clipPath={`url(#pad-${level})`}>
        <ellipse cx="20" cy="32" rx="12" ry={h / 2} fill="#A8432C" opacity={0.85} />
      </g>
      <path d="M6 22 0 26v12l6 4M34 22l6 4v12l-6 4" fill="#FAF5F3" stroke="#A3927F" strokeWidth="1.2" />
    </svg>
  );
}

function TamponIcon({ level }: { level: Level }) {
  const h = 38 * FILL[level];
  return (
    <svg viewBox="0 0 40 64" className="h-14 w-9" aria-hidden="true">
      <rect x="11" y="4" width="18" height="42" rx="9" fill="#FFFCFB" stroke="#A3927F" strokeWidth="1.5" />
      <rect x="11" y={46 - h - 2} width="18" height={h} rx="8" fill="#A8432C" opacity={0.85} />
      <path d="M20 46c0 6-3 9 0 16" fill="none" stroke="#A3927F" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Coin({ size, label }: { size: 'small' | 'large'; label: string }) {
  const r = size === 'small' ? 9 : 14;
  return (
    <svg viewBox="0 0 32 32" className="size-9" aria-hidden="true">
      <circle cx="16" cy="16" r={r} fill="#6B2416" opacity={0.9} />
      <circle cx="16" cy="16" r={r} fill="none" stroke="#C48A5A" strokeDasharray="2 2" strokeWidth="1" />
      <text x="16" y="19.5" textAnchor="middle" fontSize={size === 'small' ? 8 : 10} fontWeight="700" fill="#F3E6C6">
        {label}
      </text>
    </svg>
  );
}

function Counter({ value, onChange, label, points }: { value: number; onChange: (v: number) => void; label: string; points: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label={`One less: ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="grid size-8 place-items-center rounded-full border border-line bg-paper hover:bg-cream disabled:opacity-40" disabled={value === 0}>
        <Minus className="size-3.5" />
      </button>
      <span className="w-6 text-center font-display text-xl font-semibold tabular-nums" aria-label={`${label}: ${value}`}>
        {value}
      </span>
      <button type="button" aria-label={`One more: ${label}`} onClick={() => onChange(Math.min(30, value + 1))} className="grid size-8 place-items-center rounded-full bg-ink text-cream hover:bg-[#46362A]">
        <Plus className="size-3.5" />
      </button>
      <span className="ml-1 text-[11px] font-semibold text-ink-faint">×{points}</span>
    </div>
  );
}

/**
 * Daily PBAC logging: tap what she used and how soaked it was. The score sums across the period;
 * over 100 points, or about 80 mL, is heavy menstrual bleeding.
 */
export function PbacCard({ value, onChange, defaultOpen }: { value: PbacEntry; onChange: (next: PbacEntry) => void; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const e = { ...EMPTY_PBAC, ...value };
  const set = (key: CountKey) => (v: number) => onChange({ ...value, [key]: v });
  const score = pbacDayScore(value);
  const ml = Math.round(e.cupMl + score * 0.8);

  const products: Array<{ kind: 'pad' | 'tampon'; keys: Record<Level, CountKey> }> = [
    { kind: 'pad', keys: { light: 'padsLight', moderate: 'padsModerate', soaked: 'padsSoaked' } },
    { kind: 'tampon', keys: { light: 'tamponsLight', moderate: 'tamponsModerate', soaked: 'tamponsSoaked' } },
  ];

  return (
    <Card tone="cherry" className="lg:col-span-2">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <span className="flex items-center gap-2 text-xl font-semibold">
            <Droplets className="size-5 text-cherry" /> Blood loss (PBAC)
          </span>
          <span className="text-sm text-ink-soft">Count what you used today. Doctors use this score to measure heavy periods.</span>
        </span>
        <span className="flex items-center gap-3">
          {score > 0 || e.cupMl > 0 ? (
            <span className="rounded-full bg-paper px-3 py-1 text-sm font-semibold">
              {score} pts · ≈{ml} mL
            </span>
          ) : null}
          <ChevronDown className={cn('size-5 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div className="mt-5 space-y-6">
          {products.map(({ kind, keys }) => (
            <div key={kind}>
              <h3 className="mb-2 text-xs font-semibold tracking-[0.16em] text-ink-soft uppercase">{kind === 'pad' ? 'Pads' : 'Tampons'}</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {(['light', 'moderate', 'soaked'] as const).map((level) => (
                  <div key={level} className="flex items-center gap-3 rounded-2xl bg-paper p-3">
                    {kind === 'pad' ? <PadIcon level={level} /> : <TamponIcon level={level} />}
                    <div>
                      <p className="text-sm font-semibold">{LEVEL_LABEL[level]}</p>
                      <Counter value={e[keys[level]]} onChange={set(keys[level])} label={`${LEVEL_LABEL[level]} ${kind}s`} points={PBAC_POINTS[kind][level]} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-paper p-3">
              <h3 className="mb-2 text-xs font-semibold tracking-[0.16em] text-ink-soft uppercase">Menstrual cup</h3>
              <label className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={120}
                  step={5}
                  value={Math.min(120, e.cupMl)}
                  onChange={(ev) => onChange({ ...value, cupMl: Number(ev.target.value) })}
                  className="flex-1"
                  aria-label="Millilitres emptied from the cup today"
                />
                <span className="w-16 text-right font-display text-xl font-semibold tabular-nums">{e.cupMl} mL</span>
              </label>
              <p className="mt-1 text-xs text-ink-faint">Most cups have marks at 10, 20 and 30 mL. Add up today’s emptyings.</p>
            </div>
            <div className="rounded-2xl bg-paper p-3">
              <h3 className="mb-2 text-xs font-semibold tracking-[0.16em] text-ink-soft uppercase">Clots & flooding</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Coin size="small" label="₹1" />
                  <span className="flex-1 text-sm">Small clot (₹1 coin)</span>
                  <Counter value={e.clotsSmall} onChange={set('clotsSmall')} label="Small clots" points={PBAC_POINTS.clot.small} />
                </div>
                <div className="flex items-center gap-2">
                  <Coin size="large" label="₹5" />
                  <span className="flex-1 text-sm">Large clot (₹5 coin)</span>
                  <Counter value={e.clotsLarge} onChange={set('clotsLarge')} label="Large clots" points={PBAC_POINTS.clot.large} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center text-xl" aria-hidden="true">
                   
                  </span>
                  <span className="flex-1 text-sm">Flooding (gush through clothes)</span>
                  <Counter value={e.flooding} onChange={set('flooding')} label="Flooding episodes" points={PBAC_POINTS.flooding} />
                </div>
              </div>
            </div>
          </div>

          <p className="rounded-2xl bg-paper/70 px-4 py-3 text-sm text-ink-soft">
            Today: <strong className="text-ink">{score} points</strong>, about <strong className="text-ink">{ml} mL</strong>. Cherri adds up every day of your period: over{' '}
            {PBAC_HEAVY_SCORE} points (or about {PBAC_HEAVY_ML} mL) in one period is heavy menstrual bleeding, and it goes to the top of your doctor report.
          </p>
        </div>
      )}
    </Card>
  );
}
