import { BadgeCheck, CalendarHeart, House, MessageCircleHeart, NotebookPen, Radar, Siren } from 'lucide-react';
import { cn } from '@/lib/cn';

/** A phone frame drawn in CSS, so the mockups stay crisp at any size and need no screenshots. */
export function PhoneFrame({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <figure className={cn('relative w-[230px] shrink-0', className)} aria-label={label}>
      <div className="relative aspect-[9/19] rounded-[2.6rem] bg-[#1d1712] p-[9px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
        <div className="relative h-full overflow-hidden rounded-[2.05rem] bg-cream text-ink">
          <div className="absolute top-2 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-[#1d1712]" />
          <div className="flex items-center justify-between px-6 pt-2.5 text-[9px] font-semibold">
            <span>9:41</span>
            <span>● ● ▮</span>
          </div>
          {children}
        </div>
      </div>
    </figure>
  );
}

function TabBar({ active }: { active: number }) {
  const tabs = [House, NotebookPen, MessageCircleHeart, Radar];
  return (
    <div className="absolute inset-x-3 bottom-3 flex justify-around rounded-2xl border border-line bg-paper/95 py-2">
      {tabs.map((Icon, i) => (
        <Icon key={i} className={cn('size-4', i === active ? 'text-olive-deep' : 'text-ink-faint')} strokeWidth={i === active ? 2.4 : 1.8} />
      ))}
    </div>
  );
}

export function TodayScreen() {
  const day = 14;
  const length = 30;
  const c = 2 * Math.PI * 38;
  return (
    <div className="px-4 pt-5">
      <p className="text-[9px] font-semibold text-ink-soft">Sunday, 25 Oct</p>
      <p className="font-display text-lg leading-tight font-medium">Good morning, Ananya</p>
      <div className="mt-3 rounded-2xl border border-line bg-paper p-3">
        <div className="relative mx-auto size-28">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle cx="50" cy="50" r="38" fill="none" stroke="#E8DCC6" strokeWidth="9" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#A8432C" strokeWidth="9" strokeDasharray={`${c * (5 / length)} ${c}`} />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#8A3E66" strokeWidth="9" strokeLinecap="round" strokeDasharray={`2 ${c}`} strokeDashoffset={-c * (day / length)} />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-[8px] font-bold tracking-widest text-ink-soft uppercase">Day</p>
              <p className="font-display text-3xl leading-none font-semibold">{day}</p>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] font-semibold text-olive-deep">Main Character Era</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-cherry-soft p-2">
          <p className="text-[8px] font-bold text-cherry-deep uppercase">Next period</p>
          <p className="font-display text-sm font-semibold text-cherry-deep">in 16 days</p>
        </div>
        <div className="rounded-xl bg-ochre-soft p-2">
          <p className="text-[8px] font-bold text-ochre-deep uppercase">Confidence</p>
          <p className="font-display text-sm font-semibold text-ochre-deep">82% sure</p>
        </div>
      </div>
      <div className="mt-2 rounded-xl border border-cherry/30 bg-paper p-2 text-[9px]">
        <p className="font-semibold text-cherry-deep">Heavy bleeding (PBAC 162)</p>
        <p className="text-ink-soft">Added to the top of your doctor report.</p>
      </div>
      <TabBar active={0} />
    </div>
  );
}

export function ChatScreen() {
  return (
    <div className="flex h-full flex-col px-3 pt-4">
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <span className="grid size-7 place-items-center rounded-full bg-dusk-soft text-[10px] font-bold text-dusk-deep">KR</span>
        <div>
          <p className="flex items-center gap-1 text-[10px] font-semibold">
            Dr. Kavya Rao <BadgeCheck className="size-3 text-olive-deep" />
          </p>
          <p className="text-[8px] text-ink-soft">Gynaecologist · replies in 4–12 h</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {['PBAC 162', 'Ferritin 9 ↓', 'Cycles 32–44 d'].map((t) => (
          <span key={t} className="rounded-full bg-cherry-soft px-1.5 py-0.5 text-[8px] font-semibold text-cherry-deep">
            {t}
          </span>
        ))}
      </div>
      <div className="mt-2 space-y-1.5 text-[9px]">
        <p className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-olive-deep px-2 py-1.5 text-cream">Ferritin 9 aaya hai, periods bhi heavy. Iron lena chahiye?</p>
        <p className="w-fit max-w-[88%] rounded-xl rounded-bl-sm border border-line bg-paper px-2 py-1.5">
          Yes. Your PBAC and ferritin both point to iron loss. Start iron on alternate days, away from tea and calcium.
        </p>
        <p className="w-fit max-w-[88%] rounded-xl rounded-bl-sm border border-line bg-paper px-2 py-1.5">
          <span className="mb-0.5 block font-semibold text-dusk-deep">Recommended tests</span>
          CBC · Pelvic ultrasound
        </p>
      </div>
      <div className="mt-auto mb-14 flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-1.5 text-[9px] text-ink-faint">Hold to record a voice note…</div>
      <TabBar active={2} />
    </div>
  );
}

export function SafetyScreen() {
  return (
    <div className="px-4 pt-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-medium">Accident plan</p>
        <span className="rounded-full bg-cherry-soft px-2 py-0.5 text-[8px] font-semibold text-cherry-deep">Quick exit</span>
      </div>
      <div className="mt-2 rounded-xl bg-cherry p-2.5 text-cream">
        <p className="text-[8px] font-semibold tracking-wider uppercase opacity-80">21 h since · cycle day 13</p>
        <p className="font-display text-sm font-medium">High conception risk</p>
      </div>
      {[
        { name: 'Levonorgestrel pill', left: '51 h left', used: 29, eff: '~95% now' },
        { name: 'Ulipristal pill', left: '4 d 3 h left', used: 18, eff: 'Works 5 days' },
        { name: 'Copper IUD', left: '4 d 3 h left', used: 18, eff: '>99%' },
      ].map((o) => (
        <div key={o.name} className="mt-2 rounded-xl border border-line bg-paper p-2">
          <div className="flex justify-between text-[9px] font-semibold">
            <span>{o.name}</span>
            <span className="text-olive-deep">{o.eff}</span>
          </div>
          <p className="font-display text-sm font-semibold">{o.left}</p>
          <div className="mt-1 h-1.5 rounded-full bg-cream-deep">
            <div className="h-full rounded-full bg-ink/70" style={{ width: `${o.used}%` }} />
          </div>
        </div>
      ))}
      <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-olive-soft p-2 text-[9px] font-semibold text-olive-deep">
        <CalendarHeart className="size-3.5" /> Test reminder set for 15 Nov
      </div>
      <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-[#FEE4E2] p-2 text-[9px] font-semibold text-[#7A1D14]">
        <Siren className="size-3.5" /> Emergency? Call 112 / 108
      </div>
      <TabBar active={0} />
    </div>
  );
}
