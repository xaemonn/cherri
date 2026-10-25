'use client';

import { CAMOUFLAGES, type Camouflage } from '@cherri/shared';
import { useSyncExternalStore } from 'react';
import { CAMOUFLAGE_KEY, CAMOUFLAGE_TITLES, LOCK_KEY } from '@/components/safety/shield-script';

export { CAMOUFLAGE_KEY, LOCK_KEY };

/** Where the screen rests while shielded; the Back button lands on more shield, never on health data. */
export const SHIELD_PATH = '/w';

export const CAMOUFLAGE_OPTIONS: Record<Camouflage, { label: string; title: string; hint: string }> = {
  WEATHER: { label: 'Weather', title: CAMOUFLAGE_TITLES.WEATHER, hint: 'An open-source style forecast for your city.' },
  ARTICLE: { label: 'Encyclopedia article', title: CAMOUFLAGE_TITLES.ARTICLE, hint: 'A long, boring article about the monsoon.' },
  NOTES: { label: 'Blank notes', title: CAMOUFLAGE_TITLES.NOTES, hint: 'A plain notes page with a grocery list.' },
};

/** A flat grey square: nothing pink, nothing that says health. */
const GREY_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%239aa0a6'/%3E%3Crect x='8' y='9' width='16' height='2.5' rx='1.2' fill='%23fff'/%3E%3Crect x='8' y='15' width='16' height='2.5' rx='1.2' fill='%23fff'/%3E%3Crect x='8' y='21' width='10' height='2.5' rx='1.2' fill='%23fff'/%3E%3C/svg%3E";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Blocked storage: the shield still works for this page view.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function loadCamouflage(): Camouflage {
  if (typeof window === 'undefined') return 'WEATHER';
  const saved = read(CAMOUFLAGE_KEY);
  return CAMOUFLAGES.includes(saved as Camouflage) ? (saved as Camouflage) : 'WEATHER';
}

export function saveCamouflage(value: Camouflage): void {
  write(CAMOUFLAGE_KEY, value);
  emit();
}

export const useCamouflage = () => useSyncExternalStore(subscribe, loadCamouflage, () => 'WEATHER' as const);

const isShielded = () => document.documentElement.dataset.shield === 'on' || read(LOCK_KEY) === '1';
export const useShielded = () => useSyncExternalStore(subscribe, isShielded, () => false);

function swapFavicons(grey: boolean): void {
  for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]')) {
    if (grey) {
      link.dataset.original ??= link.href;
      link.href = GREY_ICON;
    } else if (link.dataset.original) {
      link.href = link.dataset.original;
      delete link.dataset.original;
    }
  }
}

/** Re-applies the disguise (title, favicon) after a reload or a client navigation. */
export function applyDisguise(): void {
  document.title = CAMOUFLAGE_OPTIONS[loadCamouflage()].title;
  swapFavicons(true);
}

/**
 * Hide everything now. The attribute flip is synchronous, so the camouflage paints in the
 * very next frame; the lock flag survives reloads and the Back button.
 */
export function engageShield(): void {
  document.documentElement.dataset.shield = 'on';
  write(LOCK_KEY, '1');
  applyDisguise();
  window.history.replaceState(null, '', SHIELD_PATH);
  emit();
}

export function releaseShield(): void {
  delete document.documentElement.dataset.shield;
  write(LOCK_KEY, null);
  swapFavicons(false);
  document.title = 'Cherri · your body, decoded';
  emit();
}
