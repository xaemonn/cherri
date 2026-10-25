'use client';

import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { SunRays } from '@/components/brand/decor';
import { CherryMark } from '@/components/brand/logo';
import { INTRO_SEEN_KEY } from '@/components/motion/intro-script';

const EASE = [0.22, 1, 0.36, 1] as const;
const ARCH = 'M-20 26V-6a20 20 0 0 1 40 0V26Z';
const LEAVES = [0.14, 0.33, 0.52, 0.71, 0.9];
const noopSubscribe = () => () => {};

/** Seconds to hold entrance animations so they play after the intro, not hidden behind it. */
export function useIntroDelay() {
  const [delay] = useState(() => (typeof document !== 'undefined' && document.documentElement.dataset.intro !== 'seen' ? 2 : 0));
  return delay;
}

/**
 * First-visit intro (after Neutomni's "cut along line"): a counter runs to 100 while a vine
 * grows along a dashed line, the wordmark rises letter by letter, then an arch opens onto the site.
 */
export function IntroLoader() {
  // Set by INTRO_SCRIPT before hydration; the server always renders the overlay (CSS hides it when seen).
  const seen = useSyncExternalStore(
    noopSubscribe,
    () => document.documentElement.dataset.intro === 'seen',
    () => false,
  );
  const [stage, setStage] = useState<'play' | 'reveal' | 'done'>('play');
  const [cover, setCover] = useState(60);
  const progress = useMotionValue(0);
  const width = useTransform(progress, (p) => `${p * 100}%`);
  const [count, setCount] = useState(0);
  const [grown, setGrown] = useState(0);

  useEffect(() => {
    if (seen) return;
    const root = document.documentElement;
    root.style.overflow = 'hidden';
    const counter = animate(progress, 1, {
      duration: 1.7,
      ease: [0.65, 0, 0.35, 1],
      delay: 0.15,
      onUpdate: (p) => {
        setCount(Math.round(p * 100));
        setGrown(LEAVES.filter((at) => p >= at).length);
      },
    });
    const toReveal = setTimeout(() => {
      // Big enough for the arch to clear every corner of the viewport.
      setCover((Math.max(window.innerWidth, window.innerHeight) / 40) * 2.4);
      setStage('reveal');
    }, 2050);
    const toDone = setTimeout(() => {
      setStage('done');
      root.dataset.intro = 'seen';
      root.style.overflow = '';
      try {
        sessionStorage.setItem(INTRO_SEEN_KEY, '1');
      } catch {
        // Storage blocked: the intro simply plays again next time.
      }
    }, 3000);
    return () => {
      counter.stop();
      clearTimeout(toReveal);
      clearTimeout(toDone);
      root.style.overflow = '';
    };
  }, [seen, progress]);

  if (seen || stage === 'done') return null;

  return (
    <div className="intro-overlay fixed inset-0 z-10000 select-none" aria-hidden="true">
      <svg className="absolute inset-0 size-full">
        <defs>
          <mask id="intro-arch">
            <rect width="100%" height="100%" fill="white" />
            <svg x="50%" y="50%" overflow="visible">
              <motion.path
                d={ARCH}
                fill="black"
                initial={{ scale: 0 }}
                animate={{ scale: stage === 'reveal' ? cover : 0 }}
                transition={{ duration: 0.95, ease: [0.76, 0, 0.24, 1] }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            </svg>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="#4A2340" mask="url(#intro-arch)" />
        {/* a thin ochre outline rides the edge of the opening arch */}
        <svg x="50%" y="50%" overflow="visible">
          <motion.path
            d={ARCH}
            fill="none"
            stroke="#D9AA55"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            initial={{ scale: 0, opacity: 0 }}
            animate={stage === 'reveal' ? { scale: cover, opacity: [0, 1, 1, 0] } : { scale: 0, opacity: 0 }}
            transition={{ duration: 0.95, ease: [0.76, 0, 0.24, 1] }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        </svg>
      </svg>

      <motion.div
        className="absolute inset-0"
        animate={stage === 'reveal' ? { opacity: 0, y: -24, filter: 'blur(8px)' } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div className="absolute inset-x-0 top-[24%] flex flex-col items-center">
          <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: EASE }}>
            <SunRays className="size-24 animate-spin-slow text-ochre sm:size-32" count={11} />
          </motion.span>
          <span className="-mt-6 flex overflow-hidden pb-[0.1em] font-display text-[clamp(4.5rem,17vw,13rem)] leading-[0.9] font-medium tracking-tight text-ochre-soft sm:-mt-10">
            {[...'cherri'].map((ch, i) => (
              <motion.span
                key={i}
                className={i === 5 ? 'accent-italic' : undefined}
                initial={{ y: '105%', rotate: 8 }}
                animate={{ y: 0, rotate: 0 }}
                transition={{ duration: 1.05, ease: EASE, delay: 0.2 + i * 0.08 }}
              >
                {ch}
              </motion.span>
            ))}
          </span>
          <motion.p
            className="mt-3 font-display text-lg text-cream/60 sm:text-xl"
            initial={{ opacity: 0, filter: 'blur(8px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, delay: 0.9 }}
          >
            your body, decoded
          </motion.p>
        </div>

        <div className="absolute inset-x-0 bottom-[16%] px-4 sm:px-8">
          <div className="mb-3 flex items-end justify-between text-[11px] font-semibold tracking-[0.22em] text-cream/60 uppercase">
            <span className="font-display text-3xl tracking-normal text-cream tabular-nums normal-case">{String(count).padStart(2, '0')}</span>
            <span>growing your space ✺</span>
          </div>
          <div className="relative h-10">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-cream/25" />
            <motion.div className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 rounded-full bg-ochre" style={{ width }} />
            {LEAVES.map((at, i) => (
              <motion.svg
                key={at}
                viewBox="0 0 20 20"
                className="absolute size-8"
                style={{ left: `calc(${at * 100}% - 16px)`, top: i % 2 ? '50%' : 'calc(50% - 32px)', originX: 0.5, originY: i % 2 ? 0 : 1 }}
                initial={{ scale: 0, rotate: i % 2 ? 30 : -30 }}
                animate={i < grown ? { scale: 1, rotate: 0 } : { scale: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              >
                <path d={i % 2 ? 'M10 0C4 6 4 14 10 20c6-6 6-14 0-20Z' : 'M10 20C4 14 4 6 10 0c6 6 6 14 0 20Z'} fill={i % 2 ? '#D69AB5' : '#CDD3AE'} />
              </motion.svg>
            ))}
            <motion.span className="absolute top-1/2 -translate-x-1/2 translate-y-[-85%]" style={{ left: width }}>
              <CherryMark className="size-9 animate-[float_1.6s_ease-in-out_infinite]" />
            </motion.span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
