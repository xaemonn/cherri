import { FlaskConical, MessageCircleHeart, Mic, QrCode, Radar, Sparkles, type LucideIcon } from 'lucide-react';
import { SunRays } from '@/components/brand/decor';
import { BlurWords, InView } from '@/components/motion/reveal';

const FEATURES: { icon: LucideIcon; title: string; text: string; tint: string; ray: string }[] = [
  { icon: Sparkles, title: 'Predictions that learn', text: 'A cycle engine that grows more confident every month: “78% sure, learned from 5 cycles”.', tint: '#E6E9D3', ray: '#8E9F55' },
  { icon: Mic, title: 'Just say it', text: '“Aaj bahut cramps hain, 7/10.” Type or speak in Hinglish and it becomes a log.', tint: '#F3E6C6', ray: '#D9AA55' },
  { icon: Radar, title: 'Pattern Radar', text: 'Real statistics find what repeats: headaches before periods, mood dips, pain spikes.', tint: '#DFE7E3', ray: '#6F8F88' },
  { icon: FlaskConical, title: 'Lab decoder', text: 'Snap your blood report. Every value explained in plain words, flags included.', tint: '#F0E0CC', ray: '#C48A5A' },
  { icon: QrCode, title: 'Doctor-ready report', text: 'One clinical page, shared by QR. Walk in with evidence, not “I think”.', tint: '#E6EADD', ray: '#7F8F4E' },
  { icon: MessageCircleHeart, title: 'Ask Cherri', text: 'An AI bestie that knows your cycle, cites trusted sources and never judges.', tint: '#F3E6C6', ray: '#B5512F' },
];

/** Feature cards framed by arches, with a sun that rises and turns on hover (after Mimoli). */
export function FeatureArches() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
      <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-olive-deep uppercase">What’s inside</p>
      <BlurWords text="Everything your body’s *been trying* to tell you." className="max-w-3xl text-[clamp(2.4rem,5.5vw,4.4rem)] leading-[1.02] font-medium" />
      <div className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <InView key={f.title} delay={(i % 3) * 0.1}>
            <article className="group" data-cursor="Explore">
              <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-arch border border-line" style={{ background: f.tint }}>
                <SunRays
                  className="absolute top-[18%] left-1/2 size-40 -translate-x-1/2 translate-y-6 opacity-70 transition-all duration-700 ease-out-soft group-hover:translate-y-0 group-hover:rotate-[24deg] group-hover:opacity-100"
                  color={f.ray}
                  count={11}
                />
                <span
                  className="absolute top-[38%] left-1/2 size-20 -translate-x-1/2 rounded-full transition-transform duration-700 ease-out-soft group-hover:-translate-y-3"
                  style={{ background: f.ray, opacity: 0.25 }}
                />
                <span className="relative grid size-16 place-items-center rounded-full bg-paper shadow-lift transition-transform duration-500 ease-out-soft group-hover:scale-110">
                  <f.icon className="size-7" strokeWidth={1.6} style={{ color: f.ray }} />
                </span>
                <span className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-paper/60 to-transparent" />
              </div>
              <h3 className="mt-5 text-2xl font-medium">{f.title}</h3>
              <p className="mt-1.5 text-ink-soft">{f.text}</p>
            </article>
          </InView>
        ))}
      </div>
    </section>
  );
}
