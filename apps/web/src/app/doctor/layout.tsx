'use client';

import { LogOut, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/misc';
import { useAuth } from '@/lib/auth';

/** The doctor portal has its own shell: no patient navigation, no patient data beyond the consults. */
export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'signedOut') router.replace('/login');
    else if (status === 'signedIn' && user?.role !== 'DOCTOR') router.replace('/home');
  }, [status, user, router]);

  if (status !== 'signedIn' || user?.role !== 'DOCTOR') return <PageLoader label="Opening the doctor portal…" />;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/doctor" className="flex items-center gap-3">
            <Logo />
            <span className="hidden items-center gap-1 rounded-full bg-dusk-soft px-3 py-1 text-xs font-semibold text-dusk-deep sm:inline-flex">
              <Stethoscope className="size-3.5" /> Doctor portal
            </span>
          </Link>
          <span className="ml-auto hidden text-sm text-ink-soft sm:block">
            {user.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await logout();
              router.replace('/login');
            }}
          >
            <LogOut className="size-4" /> Log out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
