'use client';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';

/** A neutral page to land on, so a glance at the screen shows nothing about health. */
const NEUTRAL_URL = 'https://www.google.com/search?q=weather+today';

/**
 * Leave in one tap on a shared phone: clears what's on screen and replaces this history entry.
 * It can't erase earlier browser history; the Safety page says so.
 */
export function leaveNow(queryClient: QueryClient): void {
  queryClient.clear();
  try {
    window.sessionStorage.clear();
  } catch {
    // Storage may be blocked; leaving matters more.
  }
  document.title = 'Weather';
  window.location.replace(NEUTRAL_URL);
}

/** Pressing Esc twice quickly leaves the app (a single Esc still closes dialogs). */
export function useQuickExitShortcut(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    let last = 0;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const now = Date.now();
      if (now - last < 600) leaveNow(queryClient);
      last = now;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queryClient]);
}

export function QuickExitButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const queryClient = useQueryClient();
  return (
    <button
      type="button"
      onClick={() => leaveNow(queryClient)}
      title="Leave Cherri now (or press Esc twice)"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border border-cherry/30 bg-cherry-soft font-semibold text-cherry-deep transition-colors hover:bg-cherry hover:text-cream',
        compact ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm',
        className,
      )}
    >
      <LogOut className="size-4" /> Quick exit
    </button>
  );
}
