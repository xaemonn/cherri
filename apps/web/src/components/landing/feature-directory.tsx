import {
  Baby,
  BookOpen,
  Brain,
  CalendarHeart,
  ClipboardCheck,
  ClipboardList,
  Droplets,
  EyeOff,
  FlaskConical,
  Gift,
  Languages,
  Lock,
  MapPin,
  MessageCircleHeart,
  Mic,
  Pill,
  QrCode,
  Radar,
  ShieldQuestion,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { InView } from '@/components/motion/reveal';
import { cn } from '@/lib/cn';

interface Feature {
  icon: LucideIcon;
  title: string;
  text: string;
  isNew?: boolean;
}

interface Chapter {
  id: string;
  numeral: string;
  title: string;
  lead: string;
  tint: string;
  ink: string;
  features: Feature[];
}

/** Every feature, grouped and ordered by how much it matters on a hard day. */
const CHAPTERS: Chapter[] = [
  {
    id: 'care',
    numeral: 'I',
    title: 'Real care, from real doctors',
    lead: 'The things that get you seen, heard and treated.',
    tint: 'bg-dusk-soft',
    ink: 'text-dusk-deep',
    features: [
      {
        icon: Stethoscope,
        title: 'Consult a gynaecologist',
        text: 'Ask a verified doctor by text or voice note. Replies in 4–12 hours.',
        isNew: true,
      },
      {
        icon: QrCode,
        title: 'Doctor-ready report',
        text: 'One clinical page to share by QR, print or export.',
      },
      {
        icon: FlaskConical,
        title: 'Lab report decoder',
        text: 'Every blood-test value explained in plain words.',
      },
      {
        icon: ClipboardList,
        title: 'Visit prep',
        text: 'Turn your story into a doctor-style history.',
      },
    ],
  },
  {
    id: 'safety',
    numeral: 'II',
    title: 'Safety, privacy and emergencies',
    lead: 'Because a shared phone shouldn’t decide what you can look up.',
    tint: 'bg-cherry-soft',
    ink: 'text-cherry-deep',
    features: [
      {
        icon: EyeOff,
        title: 'Quick exit & screen shield',
        text: 'One tap hides Cherri behind a weather page, locked by PIN.',
        isNew: true,
      },
      {
        icon: ShieldQuestion,
        title: 'Emergency contraception triage',
        text: 'Your risk, a live countdown and a discreet test reminder.',
        isNew: true,
      },
      {
        icon: Lock,
        title: 'Your data, your rules',
        text: 'Encrypted, no ads, delete everything anytime.',
      },
    ],
  },
  {
    id: 'body',
    numeral: 'III',
    title: 'Understand your body',
    lead: 'Tracking that turns into answers.',
    tint: 'bg-olive-soft',
    ink: 'text-olive-deep',
    features: [
      {
        icon: CalendarHeart,
        title: 'Cycle predictions that learn',
        text: 'Period and fertile-window predictions that get sharper.',
      },
      {
        icon: Mic,
        title: 'Just say it',
        text: 'Speak or type in English, Hinglish, Hindi or Kannada.',
      },
      {
        icon: Droplets,
        title: 'Heavy bleeding meter (PBAC)',
        text: 'Measure blood loss the way doctors do.',
        isNew: true,
      },
      {
        icon: Pill,
        title: 'Medicine guardian',
        text: 'Timing, clashes and what to do after a missed pill.',
        isNew: true,
      },
      {
        icon: Radar,
        title: 'Pattern Radar',
        text: 'Finds what repeats across your cycles.',
      },
      {
        icon: ClipboardCheck,
        title: 'Health checks',
        text: 'Screen for PCOS, endometriosis, PMDD, anaemia, thyroid.',
      },
      {
        icon: Brain,
        title: 'Mind checks',
        text: 'Validated PHQ-9 and GAD-7 check-ins.',
      },
    ],
  },
  {
    id: 'life',
    numeral: 'IV',
    title: 'For every stage of life',
    lead: 'From first period to motherhood and beyond.',
    tint: 'bg-ochre-soft',
    ink: 'text-ochre-deep',
    features: [
      {
        icon: Baby,
        title: 'Pregnancy & new motherhood',
        text: 'Week-by-week care and blood-pressure watch.',
      },
      {
        icon: MessageCircleHeart,
        title: 'Ask Cherri',
        text: 'An AI companion that cites trusted sources.',
      },
      {
        icon: BookOpen,
        title: 'Learn & myth-busting',
        text: 'Short, sourced reads. Myths, busted.',
      },
      {
        icon: MapPin,
        title: 'Find care nearby',
        text: 'Clinics near you, and what’s free.',
      },
      {
        icon: Gift,
        title: 'Cycle Wrapped',
        text: 'Your cycle story, every few months.',
      },
      {
        icon: Languages,
        title: 'Made for India',
        text: 'Four languages and an app for your phone.',
      },
    ],
  },
];

export const FEATURE_COUNT = CHAPTERS.reduce((n, c) => n + c.features.length, 0);
/** Running number of each chapter's first feature, so the list reads 01 → 21. */
const OFFSETS = CHAPTERS.map((_, i) => CHAPTERS.slice(0, i).reduce((n, c) => n + c.features.length, 0));

function FeatureCard({ feature, index, chapter }: { feature: Feature; index: number; chapter: Chapter }) {
  return (
    <Link
      href="/login"
      className={cn(
        'group relative flex h-full flex-col rounded-card border border-line bg-paper p-6 transition-all duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-lift',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', chapter.tint, chapter.ink)}>
          <feature.icon className="size-6" strokeWidth={1.7} />
        </span>
        <span className="flex items-center gap-2">
          {feature.isNew && <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-cream uppercase">New</span>}
          <span className="font-display text-sm text-ink-faint tabular-nums">{String(index).padStart(2, '0')}</span>
        </span>
      </div>
      <h4 className="mt-4 text-lg font-semibold">{feature.title}</h4>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{feature.text}</p>
    </Link>
  );
}

/** The full feature list, in chapters, with a sticky table of contents on wide screens. */
export function FeatureDirectory() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8">
      <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-olive-deep uppercase">Everything Cherri can do</p>
      <h2 className="max-w-3xl text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.05] font-medium">
        {FEATURE_COUNT} features. One calm place for <span className="accent-italic text-olive-deep">your whole health.</span>
      </h2>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">In order of what matters most. All free.</p>

      <div className="mt-14 grid gap-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Feature chapters" className="hidden lg:block">
          <ol className="sticky top-28 space-y-1">
            {CHAPTERS.map((c) => (
              <li key={c.id}>
                <a href={`#chapter-${c.id}`} className="group flex items-baseline gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-paper">
                  <span className={cn('font-display text-lg', c.ink)}>{c.numeral}</span>
                  <span className="text-[15px] font-medium text-ink-soft group-hover:text-ink">
                    {c.title}
                    <span className="block text-xs text-ink-faint">{c.features.length} features</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-16">
          {CHAPTERS.map((chapter, ci) => (
            <div key={chapter.id} id={`chapter-${chapter.id}`} className="scroll-mt-28">
              <div className="mb-6 flex items-end gap-4 border-b border-line pb-4">
                <span className={cn('font-display text-5xl leading-none font-medium sm:text-6xl', chapter.ink)}>{chapter.numeral}</span>
                <div>
                  <h3 className="text-2xl font-medium sm:text-3xl">{chapter.title}</h3>
                  <p className="text-ink-soft">{chapter.lead}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {chapter.features.map((feature, fi) => (
                  <InView key={feature.title} delay={(fi % 3) * 0.06}>
                    <FeatureCard feature={feature} index={OFFSETS[ci]! + fi + 1} chapter={chapter} />
                  </InView>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
