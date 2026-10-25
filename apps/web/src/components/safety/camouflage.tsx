'use client';

import type { Camouflage } from '@cherri/shared';
import { useState } from 'react';

/**
 * Decoy screens shown after a quick exit. They deliberately share nothing with Cherri's look:
 * system fonts, greys and blues, no cherries, no olive.
 */

const SYSTEM_FONT = { fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' };

function MenuButton({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <button type="button" aria-label="Menu" onClick={onOpen} className={`grid size-10 place-items-center rounded-full hover:bg-black/5 ${className ?? ''}`}>
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="12" cy="19" r="1.8" />
      </svg>
    </button>
  );
}

/** Deterministic but plausible numbers, so the forecast doesn't change on every glance. */
function forecast(now: Date) {
  const month = now.getMonth();
  const base = [24, 27, 31, 34, 35, 32, 29, 29, 29, 29, 27, 24][month]!;
  const seed = now.getDate() * 7 + month * 13;
  const conditions = month >= 5 && month <= 8 ? ['Light rain', 'Showers', 'Cloudy', 'Thunderstorms', 'Light rain'] : ['Sunny', 'Partly cloudy', 'Clear', 'Hazy', 'Partly cloudy'];
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() + i * 86_400_000);
    const wobble = ((seed + i * 5) % 5) - 2;
    const condition = conditions[(seed + i) % conditions.length]!;
    return {
      day: i === 0 ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'short' }),
      high: base + wobble + 2,
      low: base - 6 + ((seed + i * 3) % 3),
      condition,
      rain: /rain|shower|thunder/i.test(condition) ? 40 + ((seed + i * 17) % 6) * 10 : 0,
    };
  });
  const hours = Array.from({ length: 8 }, (_, i) => {
    const h = (now.getHours() + i) % 24;
    const curve = Math.round(Math.sin(((h - 8) / 24) * Math.PI * 2) * 4);
    return { label: i === 0 ? 'Now' : `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`, temp: base + curve - 1 };
  });
  return { now: hours[0]!.temp, today: days[0]!, days, hours };
}

function icon(condition: string) {
  if (/thunder/i.test(condition)) return '⛈️';
  if (/rain|shower/i.test(condition)) return '🌧️';
  if (/cloud/i.test(condition)) return '⛅';
  if (/haz/i.test(condition)) return '🌫️';
  return '☀️';
}

function Weather({ onUnlock }: { onUnlock: () => void }) {
  const [now] = useState(() => new Date());
  const city = (Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1] ?? 'Your city').replace(/_/g, ' ');
  const f = forecast(now);
  return (
    <div className="min-h-full bg-gradient-to-b from-[#4a6fa5] to-[#9bb7d4] text-white" style={SYSTEM_FONT}>
      <div className="mx-auto max-w-md px-5 pt-6 pb-16">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium opacity-90">Weather</span>
          <MenuButton onOpen={onUnlock} className="text-white hover:bg-white/15" />
        </div>
        <div className="mt-8 text-center">
          <p className="text-2xl font-medium">{city === 'Calcutta' ? 'Kolkata' : city}</p>
          <p className="mt-1 text-8xl font-extralight">{f.now}°</p>
          <p className="text-lg opacity-90">
            {icon(f.today.condition)} {f.today.condition}
          </p>
          <p className="text-sm opacity-80">
            H:{f.today.high}° L:{f.today.low}°
          </p>
        </div>
        <div className="mt-8 rounded-2xl bg-white/15 p-4 backdrop-blur">
          <p className="mb-3 text-xs font-semibold tracking-wide uppercase opacity-80">Hourly forecast</p>
          <div className="flex justify-between gap-2 overflow-x-auto">
            {f.hours.map((h) => (
              <div key={h.label} className="flex min-w-10 flex-col items-center gap-1 text-sm">
                <span className="opacity-80">{h.label}</span>
                <span>{icon(f.today.condition)}</span>
                <span className="font-medium">{h.temp}°</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-white/15 p-4 backdrop-blur">
          <p className="mb-2 text-xs font-semibold tracking-wide uppercase opacity-80">7-day forecast</p>
          {f.days.map((d) => (
            <div key={d.day} className="flex items-center justify-between border-t border-white/15 py-2.5 text-sm first:border-0">
              <span className="w-14">{d.day}</span>
              <span className="w-24">
                {icon(d.condition)} <span className="opacity-80">{d.rain ? `${d.rain}%` : ''}</span>
              </span>
              <span className="opacity-80">{d.low}°</span>
              <span className="mx-2 h-1 flex-1 rounded-full bg-gradient-to-r from-[#7ec8e3] to-[#f6c453]" />
              <span>{d.high}°</span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs opacity-70">Weather · free and open-source</p>
      </div>
    </div>
  );
}

const ARTICLE_SECTIONS: Array<{ heading: string; text: string }> = [
  {
    heading: 'Overview',
    text: 'The South Asian monsoon is a seasonal reversal of winds that brings most of the annual rainfall to the Indian subcontinent. Between June and September, moist south-westerly winds from the Indian Ocean move inland, and the season accounts for roughly three quarters of India’s yearly rain.',
  },
  {
    heading: 'Onset',
    text: 'The monsoon usually reaches the Kerala coast around the first of June and spreads northwards over the following six weeks. Its arrival is tracked by meteorological departments using rainfall at fixed stations, outgoing longwave radiation and wind patterns over the Arabian Sea.',
  },
  {
    heading: 'Agriculture',
    text: 'Kharif crops such as rice, maize, cotton and soybean are sown with the first rains. Reservoir levels, groundwater recharge and hydroelectric output all depend on the strength and timing of the season, which is why forecasts are followed closely by farmers and planners alike.',
  },
  {
    heading: 'Variability',
    text: 'Year-to-year variation is linked to sea-surface temperatures in the Pacific (El Niño and La Niña) and the Indian Ocean Dipole. Breaks of one or two weeks within the season are common and are not by themselves a sign of drought.',
  },
  {
    heading: 'Withdrawal',
    text: 'The monsoon begins to withdraw from north-west India in September and has usually left the country by mid-October, after which the north-east monsoon brings rain to Tamil Nadu and parts of Andhra Pradesh.',
  },
];

function Article({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="min-h-full bg-white text-[#202122]" style={SYSTEM_FONT}>
      <div className="border-b border-[#c8ccd1]">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2">
          <span className="font-serif text-lg">Open Encyclopedia</span>
          <span className="ml-auto hidden h-8 w-64 rounded border border-[#a2a9b1] px-2 text-sm leading-8 text-[#72777d] sm:block">Search</span>
          <MenuButton onOpen={onUnlock} className="text-[#54595d]" />
        </div>
      </div>
      <article className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="border-b border-[#a2a9b1] pb-1 font-serif text-3xl" style={{ fontFamily: 'Georgia, "Linux Libertine", serif' }}>
          Monsoon of South Asia
        </h1>
        <p className="mt-1 text-sm text-[#54595d]">From the Open Encyclopedia, the free encyclopedia</p>
        <aside className="float-right ml-4 mb-3 hidden w-64 border border-[#a2a9b1] bg-[#f8f9fa] p-3 text-sm sm:block">
          <p className="mb-2 text-center font-semibold">South Asian monsoon</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="font-semibold">Season</dt>
            <dd>June – September</dd>
            <dt className="font-semibold">Region</dt>
            <dd>Indian subcontinent</dd>
            <dt className="font-semibold">Share of rain</dt>
            <dd>≈ 75% of annual</dd>
          </dl>
        </aside>
        {ARTICLE_SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="mt-6 border-b border-[#a2a9b1] font-serif text-2xl" style={{ fontFamily: 'Georgia, serif' }}>
              {s.heading}
            </h2>
            <p className="mt-2 leading-7">{s.text}</p>
          </section>
        ))}
      </article>
    </div>
  );
}

function Notes({ onUnlock }: { onUnlock: () => void }) {
  const [now] = useState(() => new Date());
  return (
    <div className="min-h-full bg-[#fafafa] text-[#202124]" style={SYSTEM_FONT}>
      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#5f6368]">Daily Notes</span>
          <MenuButton onOpen={onUnlock} className="text-[#5f6368]" />
        </div>
        <div className="mt-4 rounded-lg border border-[#e0e0e0] bg-white p-6 shadow-sm">
          <p className="text-xl font-medium">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <textarea
            aria-label="Note"
            defaultValue={'Groceries\n- atta 5kg\n- toor dal\n- onions, tomatoes\n- curd\n- dish soap\n\nCall electrician about the fan\nPay phone bill by Friday'}
            className="mt-4 min-h-[60vh] w-full resize-none border-0 bg-transparent text-[15px] leading-7 outline-none"
          />
        </div>
      </div>
    </div>
  );
}

export function CamouflageScreen({ kind, onUnlock }: { kind: Camouflage; onUnlock: () => void }) {
  if (kind === 'ARTICLE') return <Article onUnlock={onUnlock} />;
  if (kind === 'NOTES') return <Notes onUnlock={onUnlock} />;
  return <Weather onUnlock={onUnlock} />;
}
