'use client';

import { useSyncExternalStore } from 'react';

/** Per-device display preferences. Kept in localStorage: they are about this screen, not her health data. */
export const TEXT_SIZES = [
  { value: 'md', label: 'Standard', scale: '100%' },
  { value: 'lg', label: 'Large', scale: '112.5%' },
  { value: 'xl', label: 'Extra large', scale: '125%' },
] as const;

export type TextSize = (typeof TEXT_SIZES)[number]['value'];

const TEXT_SIZE_KEY = 'cherri.textSize';

export function loadTextSize(): TextSize {
  try {
    const stored = window.localStorage.getItem(TEXT_SIZE_KEY);
    return TEXT_SIZES.some((s) => s.value === stored) ? (stored as TextSize) : 'md';
  } catch {
    return 'md';
  }
}

/** Every size in the app is in rem, so scaling the root font size scales the whole interface. */
export function applyTextSize(size: TextSize): void {
  document.documentElement.style.fontSize = TEXT_SIZES.find((s) => s.value === size)!.scale;
}

const listeners = new Set<() => void>();

export function saveTextSize(size: TextSize): void {
  applyTextSize(size);
  try {
    window.localStorage.setItem(TEXT_SIZE_KEY, size);
  } catch {
    // Storage blocked: the size still applies for this visit.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/** The saved text size; "md" while prerendering, since the server can't see this device's storage. */
export function useTextSize(): TextSize {
  return useSyncExternalStore(subscribe, loadTextSize, () => 'md');
}
