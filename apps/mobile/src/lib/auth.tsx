import { ApiError, type LoginInput, type PublicUser } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onSignedOut } from './api';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  user: PublicUser | null;
  setUser: (user: PublicUser) => void;
  continueAsGuest: (name?: string) => Promise<PublicUser>;
  login: (input: LoginInput) => Promise<PublicUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<PublicUser | null>(null);

  const signedIn = useCallback((next: PublicUser) => {
    setUserState(next);
    setStatus('signedIn');
    return next;
  }, []);

  const signedOut = useCallback(() => {
    setUserState(null);
    setStatus('signedOut');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => onSignedOut(signedOut), [signedOut]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!(await api.hasSession())) {
        if (!cancelled) setStatus('signedOut');
        return;
      }
      try {
        const me = await api.me.get();
        if (!cancelled) signedIn(me);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 404)) await api.auth.logout();
        if (!cancelled) setStatus('signedOut');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      setUser: signedIn,
      continueAsGuest: async (name) => signedIn((await api.auth.guest(name ? { name } : {})).user),
      login: async (input) => signedIn((await api.auth.login(input)).user),
      logout: async () => {
        await api.auth.logout();
        signedOut();
      },
    }),
    [status, user, signedIn, signedOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
