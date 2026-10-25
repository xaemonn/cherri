'use client';

import { addDays, formatMonth, phaseColors, type CyclePrediction, type ISODate, type PeriodRecord } from '@cherri/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

type DayKind = 'period' | 'predicted' | 'fertile' | 'ovulation' | null;

function monthStart(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

function shiftMonth(start: ISODate, months: number): ISODate {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function inRange(date: ISODate, from: ISODate, to: ISODate) {
  return date >= from && date <= to;
}

/** Month view: logged periods, predicted periods, fertile window and ovulation. */
export function MonthCalendar({
  today,
  periods,
  prediction,
  periodLength,
}: {
  today: ISODate;
  periods: PeriodRecord[];
  prediction: CyclePrediction | null;
  periodLength: number;
}) {
  const [start, setStart] = useState(() => monthStart(today));

  const kindOf = useMemo(() => {
    const forecasts = prediction?.upcoming ?? [];
    const current = prediction?.current;
    return (date: ISODate): DayKind => {
      if (periods.some((p) => inRange(date, p.startDate, p.endDate ?? addDays(p.startDate, periodLength - 1)))) return 'period';
      if (forecasts.some((f) => date > today && inRange(date, f.periodStart, f.periodEnd))) return 'predicted';
      if (current?.ovulation === date || forecasts.some((f) => f.ovulation === date)) return 'ovulation';
      if ((current && inRange(date, current.fertileStart, current.fertileEnd)) || forecasts.some((f) => inRange(date, f.fertileStart, f.fertileEnd))) {
        return 'fertile';
      }
      return null;
    };
  }, [periods, prediction, periodLength, today]);

  const first = new Date(`${start}T00:00:00Z`);
  const leading = (first.getUTCDay() + 6) % 7; // weeks start on Monday
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: Array<ISODate | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(start, i)),
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => setStart(shiftMonth(start, -1))} className="grid size-10 place-items-center rounded-full border border-ink/10 hover:bg-ink hover:text-cream" aria-label="Previous month">
          <ChevronLeft className="size-5" />
        </button>
        <h3 className="text-xl font-semibold">{formatMonth(start)}</h3>
        <button type="button" onClick={() => setStart(shiftMonth(start, 1))} className="grid size-10 place-items-center rounded-full border border-ink/10 hover:bg-ink hover:text-cream" aria-label="Next month">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1.5 text-center text-xs font-bold text-ink-soft">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="pb-1">
            {d}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />;
          const kind = kindOf(date);
          const isToday = date === today;
          return (
            <span
              key={date}
              className={cn(
                'relative mx-auto grid size-10 place-items-center rounded-full text-sm font-semibold text-ink transition-transform sm:size-11',
                isToday && 'ring-2 ring-olive-deep ring-offset-2 ring-offset-paper',
              )}
              style={{
                background:
                  kind === 'period'
                    ? phaseColors.MENSTRUAL.fill
                    : kind === 'fertile'
                      ? phaseColors.OVULATORY.soft
                      : kind === 'ovulation'
                        ? phaseColors.OVULATORY.fill
                        : undefined,
                color: kind === 'period' ? '#FFFCFB' : undefined,
                border: kind === 'predicted' ? `2.5px dashed ${phaseColors.MENSTRUAL.fill}` : undefined,
              }}
            >
              {Number(date.slice(8))}
              {kind === 'ovulation' && <span className="absolute -top-1 -right-1 text-[10px]"></span>}
            </span>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-ink-soft">
        <Legend swatch={{ background: phaseColors.MENSTRUAL.fill }}>Period</Legend>
        <Legend swatch={{ border: `2.5px dashed ${phaseColors.MENSTRUAL.fill}` }}>Predicted</Legend>
        <Legend swatch={{ background: phaseColors.OVULATORY.soft }}>Fertile window</Legend>
        <Legend swatch={{ background: phaseColors.OVULATORY.fill }}>Ovulation</Legend>
      </div>
    </div>
  );
}

function Legend({ swatch, children }: { swatch: React.CSSProperties; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-3.5 rounded-md" style={swatch} />
      {children}
    </span>
  );
}
