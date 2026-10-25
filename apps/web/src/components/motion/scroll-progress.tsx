'use client';

import { motion, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

const THUMB = 56;
/** Looser springs lag further behind: together they leave a fading shadow while scrolling. */
const GHOSTS = [
  { stiffness: 120, damping: 24, opacity: 0.32 },
  { stiffness: 60, damping: 20, opacity: 0.2 },
  { stiffness: 30, damping: 16, opacity: 0.12 },
];

function useThumbY(progress: MotionValue<number>, track: number) {
  return useTransform(progress, (p) => p * Math.max(0, track - THUMB));
}

function Ghost({ progress, track, stiffness, damping, opacity }: { progress: MotionValue<number>; track: number; stiffness: number; damping: number; opacity: number }) {
  const lagging = useSpring(progress, { stiffness, damping, mass: 0.6 });
  const y = useThumbY(lagging, track);
  return <motion.span className="absolute left-0 w-full rounded-full bg-olive blur-[1.5px]" style={{ y, height: THUMB, opacity }} />;
}

/**
 * Desktop scrollbar replacement: an olive thumb on a hairline track that leaves a soft
 * trail of shadows when you scroll. Drag it or click the track to jump.
 */
export function ScrollProgress() {
  const [enabled, setEnabled] = useState(false);
  const [scrollable, setScrollable] = useState(false);
  const [track, setTrack] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 400, damping: 40, mass: 0.3 });
  const y = useThumbY(smooth, track);
  const [active, setActive] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const update = () => setEnabled(fine.matches);
    update();
    fine.addEventListener('change', update);
    return () => fine.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const measure = () => {
      setScrollable(document.documentElement.scrollHeight - window.innerHeight > 40);
      setTrack(trackRef.current?.clientHeight ?? 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [enabled]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('scroller-custom', enabled && scrollable);
    return () => root.classList.remove('scroller-custom');
  }, [enabled, scrollable]);

  useMotionValueEvent(scrollYProgress, 'change', () => {
    setActive(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setActive(false), 900);
  });

  const scrollToPointer = (clientY: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientY - r.top - THUMB / 2) / (r.height - THUMB)));
    window.scrollTo({ top: p * (document.documentElement.scrollHeight - window.innerHeight) });
  };

  if (!enabled) return null;
  return (
    <div
      ref={trackRef}
      aria-hidden="true"
      data-active={active || undefined}
      className="group fixed top-4 right-1.5 bottom-4 z-50 w-2 cursor-pointer opacity-55 transition-opacity duration-500 hover:opacity-100 data-[active]:opacity-100 print:hidden"
      style={{ opacity: scrollable ? undefined : 0, pointerEvents: scrollable ? undefined : 'none' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        scrollToPointer(e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) scrollToPointer(e.clientY);
      }}
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink/15 transition-all duration-300 group-hover:w-2 group-hover:rounded-full group-hover:bg-ink/10" />
      {GHOSTS.map((g) => (
        <Ghost key={g.stiffness} progress={scrollYProgress} track={track} {...g} />
      ))}
      <motion.span className="absolute left-0 w-full rounded-full bg-olive-deep shadow-lift" style={{ y, height: THUMB }} />
    </div>
  );
}
