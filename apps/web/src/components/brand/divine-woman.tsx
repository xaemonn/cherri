'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { moonLitPath, polar } from '@/lib/svg';

const SKIN = '#B87A50';
const SKIN_SHADE = '#9E6440';
const HAIR = '#2B1E16';
const HAIR_LIGHT = '#4A3427';
const LIPS = '#8E3B2A';
const OCHRE = '#D9AA55';
const OLIVE = '#7F8F4E';
const OLIVE_DEEP = '#4A5A2B';
const RUST = '#A8432C';
const CREAM = '#FBF7EF';

/** Moons along an arc over the arch: the cycle, waxing to full and waning again. */
const MOONS = [
  { angle: -150, phase: 0.14 },
  { angle: -120, phase: 0.3 },
  { angle: -90, phase: 0.5 },
  { angle: -60, phase: 0.7 },
  { angle: -30, phase: 0.86 },
];

/** Parallax offset for a layer, from the pointer position (-1…1) held in CSS variables. */
const layer = (depth: number) => ({
  transform: `translate(calc(var(--px, 0) * ${depth}px), calc(var(--py, 0) * ${depth}px))`,
  transition: 'transform 0.6s cubic-bezier(0.22,1,0.36,1)',
});

/**
 * The hero illustration: a serene woman framed by an arch, the sun as her halo and the moon's
 * phases overhead. She meditates with closed eyes and opens them, following the pointer,
 * when you come close.
 */
export function DivineWoman({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [awake, setAwake] = useState(false);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const svg = ref.current;
    if (!svg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = svg.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.42;
        const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)));
        svg.style.setProperty('--px', nx.toFixed(3));
        svg.style.setProperty('--py', ny.toFixed(3));
        const near = Math.hypot(e.clientX - cx, e.clientY - cy) < Math.max(r.width, r.height) * 0.75;
        setAwake(near);
        setGaze({ x: nx * 3.2, y: ny * 2 });
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 400 520"
      className={cn('overflow-visible', className)}
      role="img"
      aria-label="Illustration of a serene woman framed by an arch, with the sun as her halo and moon phases above"
    >
      <defs>
        <clipPath id="dw-arch">
          <path d="M40 500V200a160 160 0 0 1 320 0v300Z" />
        </clipPath>
        <linearGradient id="dw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3E6C6" />
          <stop offset="1" stopColor="#EED9BE" />
        </linearGradient>
        <clipPath id="dw-eye-l">
          <path d="M169 215q12-11 24 0q-12 9-24 0Z" />
        </clipPath>
        <clipPath id="dw-eye-r">
          <path d="M207 215q12-11 24 0q-12 9-24 0Z" />
        </clipPath>
      </defs>

      {/* Moons */}
      <g style={layer(-10)}>
        {MOONS.map((m, i) => {
          const at = polar(200, 200, 186, m.angle);
          return (
            <g key={m.angle} transform={`translate(${at.x} ${at.y})`}>
              <g
                style={{
                  animation: `twinkle 3.2s ease-in-out ${i * 0.45}s infinite`,
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                }}
              >
                <circle r="9" fill="#46362A" opacity=".18" />
                <path d={moonLitPath(m.phase, 9)} fill={OCHRE} />
              </g>
            </g>
          );
        })}
      </g>

      {/* Arch scene */}
      <g clipPath="url(#dw-arch)">
        <rect x="40" y="40" width="320" height="460" fill="url(#dw-sky)" />
        <g style={layer(-6)}>
          <circle cx="200" cy="178" r="80" fill={OCHRE} />
          <circle cx="200" cy="178" r="64" fill="#E3BA6C" opacity=".6" />
          <g
            style={{
              animation: 'spin 60s linear infinite',
              transformOrigin: '200px 178px',
            }}
          >
            {Array.from({ length: 18 }, (_, i) => {
              const from = polar(200, 178, 94, i * 20);
              const to = polar(200, 178, 116, i * 20);
              return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={OCHRE} strokeWidth="6" strokeLinecap="round" />;
            })}
          </g>
        </g>
        <g style={layer(-3)}>
          <path d="M40 430c50-26 92-30 140-14s96 18 180-12v96H40Z" fill="#CDD3AE" />
          <path d="M40 462c70-20 120-14 170 0s110 10 150-8v46H40Z" fill="#A8B595" />
        </g>
      </g>
      <path d="M40 500V200a160 160 0 0 1 320 0v300" fill="none" stroke="#33261C" strokeOpacity=".14" strokeWidth="1.5" />

      {/* Figure, clipped to the arch so the bust sits inside it */}
      <g clipPath="url(#dw-arch)">
        <g style={layer(4)}>
          {/* hair, back */}
          <g
            style={{
              animation: 'hair-sway 7s ease-in-out infinite',
              transformOrigin: '200px 140px',
            }}
          >
            <path
              d="M200 124c-50 0-78 40-76 92 2 46-14 86-34 124-14 28-18 60-8 96 34-26 60-56 74-96 10 34 30 52 44 60 14-8 34-26 44-60 14 40 40 70 74 96 10-36 6-68-8-96-20-38-36-78-34-124 2-52-26-92-76-92Z"
              fill={HAIR}
            />
            <path
              d="M132 300c-10 34-22 64-36 92M268 300c10 34 22 64 36 92"
              fill="none"
              stroke={HAIR_LIGHT}
              strokeWidth="3"
              strokeLinecap="round"
              opacity=".7"
            />
          </g>

          {/* torso, breathing */}
          <g
            style={{
              animation: 'breathe 5.5s ease-in-out infinite',
              transformOrigin: '200px 520px',
            }}
          >
            <path d="M70 520c6-78 44-130 104-150h52c60 20 98 72 104 150Z" fill={RUST} />
            <path d="M174 366c6 18 16 26 26 26s20-8 26-26" fill={SKIN} />
            {/* neck */}
            <path d="M182 262h36v84c0 14-8 24-18 24s-18-10-18-24Z" fill={SKIN} />
            <path d="M182 268c10 12 26 12 36 0v18c-12 8-24 8-36 0Z" fill={SKIN_SHADE} opacity=".55" />
            {/* sari drape over one shoulder, with an ochre border */}
            <path d="M226 366c46 10 92 52 104 154H186c6-52 18-104 40-154Z" fill={OLIVE} />
            <path d="M226 366c-22 50-34 102-40 154h-16c6-56 20-110 44-158Z" fill={OCHRE} />
            <path
              d="M248 402c18 30 28 70 30 118M282 420c12 30 18 62 20 100"
              fill="none"
              stroke={OLIVE_DEEP}
              strokeWidth="2"
              strokeLinecap="round"
              opacity=".5"
            />
            {/* necklace with a crescent pendant */}
            <path d="M178 366q22 30 44 0" fill="none" stroke={OCHRE} strokeWidth="2.4" strokeLinecap="round" />
            {[0.2, 0.4, 0.6, 0.8].map((t) => (
              <circle key={t} cx={178 + 44 * t} cy={366 + 60 * t * (1 - t)} r="2.2" fill={OCHRE} />
            ))}
            <g transform="translate(200 386)">
              <circle r="7" fill={OCHRE} />
              <circle cx="3" cy="-2" r="6" fill={RUST} />
            </g>
          </g>

          {/* ears and earrings */}
          <ellipse cx="149" cy="222" rx="7" ry="12" fill={SKIN_SHADE} />
          <ellipse cx="251" cy="222" rx="7" ry="12" fill={SKIN_SHADE} />
          {[149, 251].map((x, i) => (
            <g
              key={x}
              style={{
                animation: `earring-swing 3.4s ease-in-out ${i * 0.3}s infinite`,
                transformOrigin: `${x}px 233px`,
              }}
            >
              <line x1={x} y1="233" x2={x} y2="242" stroke={OCHRE} strokeWidth="1.6" />
              <path d={`M${x - 7} 250a7 7 0 0 1 14 0Z`} fill={OCHRE} />
              {[-5, 0, 5].map((dx) => (
                <circle key={dx} cx={x + dx} cy="254" r="1.6" fill={OCHRE} />
              ))}
            </g>
          ))}

          {/* face */}
          <path d="M200 150c32 0 52 25 52 60 0 38-22 69-52 71-30-2-52-33-52-71 0-35 20-60 52-60Z" fill={SKIN} />
          <ellipse cx="172" cy="242" rx="10" ry="6" fill="#C27A5A" opacity=".35" />
          <ellipse cx="228" cy="242" rx="10" ry="6" fill="#C27A5A" opacity=".35" />
          {/* brows */}
          <path d="M166 199q13-9 27-3M207 196q14-6 27 3" fill="none" stroke={HAIR} strokeWidth="2.6" strokeLinecap="round" />
          {/* eyes: closed in meditation, open and following the pointer when you're near */}
          {awake ? (
            <g>
              {[
                { id: 'dw-eye-l', cx: 181 },
                { id: 'dw-eye-r', cx: 219 },
              ].map((eye) => (
                <g key={eye.id}>
                  <path d={`M${eye.cx - 12} 215q12-11 24 0q-12 9-24 0Z`} fill={CREAM} />
                  <g clipPath={`url(#${eye.id})`}>
                    <circle cx={eye.cx + gaze.x} cy={214 + gaze.y} r="5" fill="#3A2416" />
                    <circle cx={eye.cx + gaze.x + 1.6} cy={212.4 + gaze.y} r="1.3" fill={CREAM} />
                  </g>
                  <path d={`M${eye.cx - 13} 215q13-12 26 0`} fill="none" stroke={HAIR} strokeWidth="2" strokeLinecap="round" />
                </g>
              ))}
            </g>
          ) : (
            <path
              d="M169 214q12 8 24 0M207 214q12 8 24 0M172 218.5l-2 3.5M178 220.5l-1 3.6M210 218.5l-2 3.5M216 220.5l-1 3.6M222 220.5l1 3.6M184 220.5l1 3.6"
              fill="none"
              stroke={HAIR}
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
          {/* nose, lips, bindi */}
          <path d="M200 216c-1 12-3 20-6 24q5 4 11 1" fill="none" stroke={SKIN_SHADE} strokeWidth="1.8" strokeLinecap="round" />
          <path d={awake ? 'M187 255q13 9 26 0q-13 12-26 0Z' : 'M189 256q11 6 22 0q-11 10-22 0Z'} fill={LIPS} />
          <circle cx="200" cy="186" r="3.6" fill={RUST} />

          {/* hair, front: centre parting with curtains framing the face */}
          <g
            style={{
              animation: 'hair-sway 7s ease-in-out infinite',
              transformOrigin: '200px 140px',
            }}
          >
            <path d="M200 128c-38 0-62 30-58 80 6-26 22-46 42-54 8-3 12-10 16-26Z" fill={HAIR} />
            <path d="M200 128c38 0 62 30 58 80-6-26-22-46-42-54-8-3-12-10-16-26Z" fill={HAIR} />
            <path d="M142 206c-4 34-6 66-22 104 18-10 30-40 32-74Z" fill={HAIR} />
            <path d="M258 206c4 34 6 66 22 104-18-10-30-40-32-74Z" fill={HAIR} />
            <path d="M196 132c-20 4-36 18-44 40" fill="none" stroke={HAIR_LIGHT} strokeWidth="2.4" strokeLinecap="round" />
          </g>

          {/* cherries and leaves tucked into her hair */}
          <g transform="translate(150 158) rotate(-18)">
            <path d="M8 -14c-4 8-8 12-12 16M8 -14c2 8 6 12 10 14" fill="none" stroke="#5A3E2B" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="14" cy="-18" rx="10" ry="4.5" fill={OLIVE} transform="rotate(-30 14 -18)" />
            <ellipse cx="-2" cy="-20" rx="9" ry="4" fill="#A4B26B" transform="rotate(25 -2 -20)" />
            <circle cx="-5" cy="5" r="7" fill={RUST} />
            <circle cx="19" cy="3" r="7" fill={RUST} />
            <circle cx="-7.5" cy="2.5" r="1.8" fill={CREAM} opacity=".6" />
            <circle cx="16.5" cy=".5" r="1.8" fill={CREAM} opacity=".6" />
          </g>
        </g>
      </g>

      {/* Floating leaves and sparkles */}
      <g style={layer(12)}>
        {[
          { x: 18, y: 250, r: -20, d: 0, c: OLIVE },
          { x: 360, y: 300, r: 40, d: 1.4, c: '#A4B26B' },
          { x: 332, y: 120, r: 10, d: 2.2, c: OLIVE },
          { x: 60, y: 120, r: -50, d: 0.8, c: '#A4B26B' },
        ].map((l) => (
          <g key={`${l.x}-${l.y}`} transform={`translate(${l.x} ${l.y}) rotate(${l.r})`}>
            <g
              style={{
                animation: `drift ${6 + l.d}s ease-in-out ${l.d}s infinite`,
              }}
            >
              <path d="M0 18C0 8 7 1 18 0c0 11-7 18-18 18Z" fill={l.c} />
              <path d="M2 16C6 11 10 7 15 3" fill="none" stroke="#E6E9D3" strokeWidth=".9" strokeLinecap="round" />
            </g>
          </g>
        ))}
        {[
          { x: 330, y: 220, s: 1 },
          { x: 72, y: 330, s: 0.7 },
          { x: 300, y: 64, s: 0.6 },
        ].map((s, i) => (
          <g key={i} transform={`translate(${s.x} ${s.y}) scale(${s.s})`}>
            <path
              d="M0-12c.7 6.3 5 10.9 12 12-7 1.1-11.3 5.7-12 12-.7-6.3-5-10.9-12-12C-5-1.1-.7-5.7 0-12Z"
              fill={OCHRE}
              style={{
                animation: `twinkle 2.6s ease-in-out ${i * 0.7}s infinite`,
                transformBox: 'fill-box',
                transformOrigin: 'center',
              }}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
