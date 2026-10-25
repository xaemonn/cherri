'use client';

import { ApiError } from '@cherri/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, useState, type ReactNode } from 'react';
import { PageTranslator } from '@/components/i18n/page-translator';
import { ScreenShield } from '@/components/safety/quick-exit';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/lib/auth';
import { LanguageProvider } from '@/lib/i18n';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Client errors won't fix themselves on retry.
            retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
          },
        },
      }),
  );

  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            {children}
            <Suspense fallback={null}>
              <ScreenShield />
            </Suspense>
            <PageTranslator />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}
