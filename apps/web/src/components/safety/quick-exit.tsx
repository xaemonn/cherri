'use client';

import { ApiError } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { CamouflageScreen } from '@/components/safety/camouflage';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { applyDisguise, CAMOUFLAGE_OPTIONS, engageShield, releaseShield, SHIELD_PATH, useCamouflage, useShielded } from '@/lib/shield';

/**
 * Quick exit: hides Cherri behind a neutral screen in the same frame, swaps the tab title and
 * icon, rewrites this history entry and locks the session until her PIN (or password) is entered.
 */
export function useQuickExit() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useCallback(() => {
    engageShield();
    router.replace(SHIELD_PATH);
    // Drop cached health data once the app pages have unmounted behind the shield.
    window.setTimeout(() => queryClient.clear(), 300);
  }, [queryClient, router]);
}

export function QuickExitButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const quickExit = useQuickExit();
  return (
    <button
      type="button"
      onClick={quickExit}
      title="Hide Cherri now (Esc twice, or Alt+Q)"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border border-cherry/30 bg-cherry-soft font-semibold text-cherry-deep transition-colors hover:bg-cherry hover:text-cream',
        compact ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm',
        className,
      )}
    >
      <EyeOff className="size-4" /> Quick exit
    </button>
  );
}

/** Always within thumb's reach, top-right of every app screen. */
export function QuickExitFab() {
  return <QuickExitButton compact className="fixed top-3 right-3 z-50 shadow-lift-lg backdrop-blur sm:top-4 sm:right-4 print:hidden" />;
}

const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

function UnlockPad({ onClose }: { onClose: () => void }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const usePin = Boolean(user?.hasPin);

  async function attempt(secret: { pin?: string; password?: string }) {
    setBusy(true);
    setError(null);
    try {
      if (status === 'signedIn') await api.me.unlock(secret);
      releaseShield();
      router.replace(status !== 'signedIn' ? '/' : user?.role === 'DOCTOR' ? '/doctor' : '/home');
    } catch (e) {
      setPin('');
      setError(e instanceof ApiError && e.status === 429 ? 'Too many tries. Wait a minute.' : 'Incorrect. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function press(digit: string) {
    if (busy) return;
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length === 4) void attempt({ pin: next });
  }

  // No account on this device, or a guest without a PIN: nothing to check against.
  const nothingToCheck = status !== 'signedIn' || (!usePin && user?.isGuest);

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-black/40 p-4" onClick={onClose} style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="w-full max-w-xs rounded-2xl bg-white p-5 text-center text-[#202124] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-medium">{nothingToCheck ? 'Open?' : usePin ? 'Enter passcode' : 'Enter password'}</p>
        {nothingToCheck ? (
          <button type="button" className="mt-4 h-11 w-full rounded-full bg-[#1a73e8] text-sm font-medium text-white" onClick={() => void attempt({})}>
            Continue
          </button>
        ) : usePin ? (
          <>
            <div className="my-4 flex justify-center gap-3" aria-label={`${pin.length} of 4 digits entered`}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cn('size-3.5 rounded-full border border-[#5f6368]', i < pin.length && 'bg-[#202124]')} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, i) =>
                key === '' ? (
                  <span key={i} />
                ) : (
                  <button
                    key={i}
                    type="button"
                    disabled={busy}
                    onClick={() => (key === '⌫' ? setPin(pin.slice(0, -1)) : press(key))}
                    className="h-12 rounded-full bg-[#f1f3f4] text-lg font-medium hover:bg-[#e8eaed]"
                  >
                    {key}
                  </button>
                ),
              )}
            </div>
          </>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void attempt({ password });
            }}
          >
            <span className="relative block">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#dadce0] px-3 pr-11 text-sm outline-none focus:border-[#1a73e8]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-1 my-auto grid size-9 place-items-center rounded-full text-[#5f6368] hover:bg-[#f1f3f4]"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
            <button type="submit" disabled={busy || !password} className="h-11 w-full rounded-full bg-[#1a73e8] text-sm font-medium text-white disabled:opacity-50">
              Open
            </button>
          </form>
        )}
        {error && <p className="mt-3 text-sm text-[#d93025]">{error}</p>}
        <button type="button" onClick={onClose} className="mt-3 text-sm text-[#5f6368]">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Mounted once for the whole site: the decoy layer, the lock and the keyboard shortcuts. */
export function ScreenShield() {
  const mounted = useMounted();
  const shielded = useShielded();
  const camouflage = useCamouflage();
  const pathname = usePathname();
  const { status } = useAuth();
  const quickExit = useQuickExit();
  const [unlocking, setUnlocking] = useState(false);

  // Keep the disguise through reloads and navigations (Next re-sets the title from metadata).
  useEffect(() => {
    if (!shielded) return;
    document.documentElement.dataset.shield = 'on';
    applyDisguise();
    const title = CAMOUFLAGE_OPTIONS[camouflage].title;
    const observer = new MutationObserver(() => {
      if (document.title !== title) document.title = title;
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [shielded, camouflage, pathname]);

  // Esc twice quickly, or Alt+Q. A single Esc still closes dialogs.
  useEffect(() => {
    if (status !== 'signedIn' || shielded) return;
    let last = 0;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        quickExit();
        return;
      }
      if (event.key !== 'Escape') return;
      const now = event.timeStamp;
      if (now - last < 600) quickExit();
      last = now;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, shielded, quickExit]);

  return (
    <div className="shield-layer" aria-hidden={!shielded}>
      {mounted && shielded && (
        <>
          <CamouflageScreen kind={camouflage} onUnlock={() => setUnlocking(true)} />
          {unlocking && <UnlockPad onClose={() => setUnlocking(false)} />}
        </>
      )}
    </div>
  );
}
