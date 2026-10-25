import { PHASE_GUIDES, phaseColors, type CyclePhase } from '@cherri/shared';
import { MoonPhase } from '@/components/brand/decor';
import { BlurWords, InView } from '@/components/motion/reveal';

const ORDER: { phase: CyclePhase; moon: number; days: string }[] = [
  { phase: 'MENSTRUAL', moon: 0.02, days: 'Days 1–5' },
  { phase: 'FOLLICULAR', moon: 0.27, days: 'Days 6–13' },
  { phase: 'OVULATORY', moon: 0.5, days: 'Around day 14' },
  { phase: 'LUTEAL', moon: 0.76, days: 'Days 15–28' },
];

/** The four phases as arch tiles, each with its moon and its "era". */
export function Eras() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-olive-deep uppercase">Your cycle, your eras</p>
          <BlurWords text="Four seasons, *every* month." className="text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[1.02] font-medium" />
        </div>
        <p className="max-w-sm text-ink-soft">Cherri tells you which era you’re in, what your body is doing, and what tends to help, rated by how strong the science is.</p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map(({ phase, moon, days }, i) => {
          const guide = PHASE_GUIDES[phase];
          const color = phaseColors[phase];
          return (
            <InView key={phase} delay={i * 0.1}>
              <article className="group relative h-full overflow-hidden rounded-arch border border-line bg-paper px-6 pt-14 pb-7 text-center shadow-lift transition-transform duration-500 ease-out-soft hover:-translate-y-2">
                <span
                  className="absolute inset-x-0 bottom-0 h-0 transition-[height] duration-700 ease-out-soft group-hover:h-full"
                  style={{ background: color.soft }}
                  aria-hidden="true"
                />
                <MoonPhase phase={moon} className="relative mx-auto size-16 transition-transform duration-700 ease-out-soft group-hover:-translate-y-1 group-hover:rotate-12" lit={color.fill} dark="#E8DCC6" />
                <p className="relative mt-6 text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: color.ink }}>
                  {days}
                </p>
                <h3 className="relative mt-2 text-2xl font-medium">{guide.vibe}</h3>
                <p className="relative text-sm text-ink-soft italic">{guide.name}</p>
                <p className="relative mt-4 text-sm text-ink-soft">{guide.description}</p>
              </article>
            </InView>
          );
        })}
      </div>
    </section>
  );
}
