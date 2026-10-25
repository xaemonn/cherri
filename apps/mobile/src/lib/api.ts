import { createApiClient, type SessionStore, type StoredSession } from '@cherri/shared';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_KEY = 'cherri.session';

/**
 * Where the API lives. On a phone running Expo Go, the dev server's host is your laptop,
 * so the API is assumed to be on the same machine at port 4100. Override with EXPO_PUBLIC_API_URL
 * (e.g. a deployed API, or when using `expo start --tunnel`).
 */
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') return 'http://localhost:4100/api';
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:4100/api` : 'http://localhost:4100/api';
}

export const API_URL = resolveApiUrl();

/** SecureStore (Keychain / Keystore) on phones; localStorage when running on the web. */
const sessionStore: SessionStore =
  Platform.OS === 'web'
    ? {
        async load() {
          const raw = globalThis.localStorage?.getItem(SESSION_KEY);
          return raw ? (JSON.parse(raw) as StoredSession) : null;
        },
        async save(session) {
          if (session) globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(session));
          else globalThis.localStorage?.removeItem(SESSION_KEY);
        },
      }
    : {
        async load() {
          const raw = await SecureStore.getItemAsync(SESSION_KEY);
          return raw ? (JSON.parse(raw) as StoredSession) : null;
        },
        async save(session) {
          if (session) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
          else await SecureStore.deleteItemAsync(SESSION_KEY);
        },
      };

const signedOutListeners = new Set<() => void>();

export function onSignedOut(listener: () => void): () => void {
  signedOutListeners.add(listener);
  return () => signedOutListeners.delete(listener);
}

export const api = createApiClient({
  baseUrl: API_URL,
  session: sessionStore,
  onSignedOut: () => signedOutListeners.forEach((listener) => listener()),
});
