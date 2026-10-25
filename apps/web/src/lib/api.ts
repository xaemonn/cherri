import { createApiClient, type SessionStore, type StoredSession } from '@cherri/shared';

const SESSION_KEY = 'cherri.session';

const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100/api';

const isLocalHost = (host: string) => host === 'localhost' || host === '127.0.0.1';

/** Opened from a phone on the same Wi-Fi (e.g. a scanned share QR), "localhost" would mean the phone, so reuse the page's host. */
function resolveApiUrl(): string {
  if (typeof window === 'undefined') return CONFIGURED_API_URL;
  const url = new URL(CONFIGURED_API_URL);
  if (!isLocalHost(url.hostname) || isLocalHost(window.location.hostname)) return CONFIGURED_API_URL;
  url.hostname = window.location.hostname;
  return url.toString().replace(/\/$/, '');
}

export const API_URL = resolveApiUrl();

const browserSessionStore: SessionStore = {
  async load() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  },
  async save(session) {
    if (typeof window === 'undefined') return;
    try {
      if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Private mode or blocked storage: the session simply won't persist.
    }
  },
};

const signedOutListeners = new Set<() => void>();

export function onSignedOut(listener: () => void): () => void {
  signedOutListeners.add(listener);
  return () => signedOutListeners.delete(listener);
}

export const api = createApiClient({
  baseUrl: API_URL,
  session: browserSessionStore,
  onSignedOut: () => signedOutListeners.forEach((listener) => listener()),
});
