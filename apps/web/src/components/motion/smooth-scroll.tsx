'use client';

import { ReactLenis } from 'lenis/react';
import { useSyncExternalStore, type ReactNode } from 'react';
import 'lenis/dist/lenis.css';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** Buttery wheel scrolling for the landing page; off for reduced-motion users (and on the server). */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const still = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => true);
  if (still) return <>{children}</>;
  return (
    <ReactLenis root options={{ lerp: 0.09, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
