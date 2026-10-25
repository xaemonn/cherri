'use client';

import { useEffect, useRef, useState } from 'react';

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

const TRAIL_MS = 650;
const INTERACTIVE = 'a, button, [role="button"], label, summary, select, [data-cursor]';
const TYPING = 'input, textarea, [contenteditable="true"]';

/**
 * Mouse-only custom cursor: a dot, a lagging ring that grows over anything clickable,
 * and a soft olive shadow trail that fades behind the pointer.
 */
export function CursorTrail() {
  const [enabled, setEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setEnabled(fine.matches && !still.matches);
    update();
    fine.addEventListener('change', update);
    still.addEventListener('change', update);
    return () => {
      fine.removeEventListener('change', update);
      still.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current!;
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const label = labelRef.current!;
    const ctx = canvas.getContext('2d')!;
    document.documentElement.classList.add('cursor-custom');

    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();

    const trail: TrailPoint[] = [];
    const ripples: TrailPoint[] = [];
    const pos = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    let hovering = false;
    let typing = false;
    let visible = false;
    let frame = 0;

    const setVisible = (v: boolean) => {
      visible = v;
      dot.style.opacity = v && !typing ? '1' : '0';
      ring.style.opacity = v && !typing ? '1' : '0';
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      // Fill the gap after a fast flick so the shadow reads as one continuous ribbon.
      const last = trail[trail.length - 1];
      if (last) {
        const steps = Math.min(12, Math.floor(Math.hypot(e.clientX - last.x, e.clientY - last.y) / 7));
        for (let s = 1; s < steps; s++) {
          trail.push({ x: last.x + ((e.clientX - last.x) * s) / steps, y: last.y + ((e.clientY - last.y) * s) / steps, t: now });
        }
      }
      pos.x = e.clientX;
      pos.y = e.clientY;
      trail.push({ x: pos.x, y: pos.y, t: now });
      if (!visible) {
        ringPos.x = pos.x;
        ringPos.y = pos.y;
        setVisible(true);
      }
      const target = e.target instanceof Element ? e.target : null;
      typing = !!target?.closest(TYPING);
      const interactive = target?.closest<HTMLElement>(INTERACTIVE) ?? null;
      hovering = !!interactive && !typing;
      const text = interactive?.dataset.cursor ?? '';
      label.textContent = text;
      ring.dataset.state = typing ? 'typing' : text ? 'label' : hovering ? 'hover' : 'idle';
      setVisible(true);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    };
    const onLeave = () => setVisible(false);

    const draw = (now: number) => {
      // Ring eases towards the pointer; the dot sits exactly on it.
      ringPos.x += (pos.x - ringPos.x) * 0.18;
      ringPos.y += (pos.y - ringPos.y) * 0.18;
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`;

      while (trail.length && now - trail[0]!.t > TRAIL_MS) trail.shift();
      while (ripples.length && now - ripples[0]!.t > 700) ripples.shift();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i]!;
        const life = 1 - (now - p.t) / TRAIL_MS;
        const radius = 5 + life * 20;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        g.addColorStop(0, `rgba(74, 90, 43, ${0.22 * life})`);
        g.addColorStop(0.55, `rgba(164, 178, 107, ${0.13 * life})`);
        g.addColorStop(1, 'rgba(196, 138, 90, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const r of ripples) {
        const k = (now - r.t) / 700;
        ctx.strokeStyle = `rgba(74, 90, 43, ${0.45 * (1 - k)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 8 + k * 46, 0, Math.PI * 2);
        ctx.stroke();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', resize);
      document.documentElement.classList.remove('cursor-custom');
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-9999 print:hidden">
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      <div
        ref={ringRef}
        data-state="idle"
        className="absolute top-0 left-0 grid size-9 place-items-center rounded-full border border-olive-deep/60 opacity-0 transition-[width,height,background-color,border-color,opacity] duration-300 ease-out-soft data-[state=hover]:size-14 data-[state=hover]:border-olive-deep data-[state=hover]:bg-olive/20 data-[state=label]:size-20 data-[state=label]:border-transparent data-[state=label]:bg-ochre/95"
      >
        <span ref={labelRef} className="text-[11px] font-semibold tracking-wide text-ink uppercase" />
      </div>
      <div ref={dotRef} className="absolute top-0 left-0 size-1.5 rounded-full bg-ink opacity-0 transition-opacity duration-200" />
    </div>
  );
}
