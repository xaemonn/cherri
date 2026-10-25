'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { QuickExitFab } from '@/components/safety/quick-exit';
import { BottomNav, NavFallback, Sidebar } from '@/components/shell/nav';
import { PageLoader } from '@/components/ui/misc';
import { useAuth } from '@/lib/auth';
import { applyTextSize, loadTextSize } from '@/lib/preferences';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => applyTextSize(loadTextSize()), []);

  useEffect(() => {
    if (status === 'signedOut') router.replace('/login');
    else if (status === 'signedIn' && user?.role === 'DOCTOR') router.replace('/doctor');
    else if (status === 'signedIn' && user && !user.onboarded) router.replace('/onboarding');
  }, [status, user, router]);

  if (status !== 'signedIn' || !user?.onboarded || user.role === 'DOCTOR') return <PageLoader label="Warming up…" />;

  return (
    <div className="lg:flex">
      <QuickExitFab />
      <Suspense fallback={<NavFallback />}>
        <Sidebar />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">{children}</main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}
