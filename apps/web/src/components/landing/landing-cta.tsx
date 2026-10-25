'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Magnetic } from '@/components/motion/reveal';
import { Button, ButtonLink } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

/** Signed-in visitors get "Open app"; everyone else goes to log in, or starts as a guest in one tap. */
export function LandingCta({ size = 'lg', light = false }: { size?: 'md' | 'lg'; light?: boolean }) {
  const { status, continueAsGuest } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (status === 'signedIn') {
    return (
      <Magnetic>
        <ButtonLink href="/home" variant="olive" size={size}>
          Open my Cherri <ArrowRight className="size-5" />
        </ButtonLink>
      </Magnetic>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Magnetic>
        <ButtonLink href="/login" variant="olive" size={size}>
          Log in or sign up <ArrowRight className="size-5" />
        </ButtonLink>
      </Magnetic>
      <Button
        variant={light ? 'cream' : 'outline'}
        size={size}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await continueAsGuest();
            router.push('/onboarding');
          } catch {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Setting up…' : 'Try as a guest'}
      </Button>
    </div>
  );
}

export function NavCta() {
  const { status } = useAuth();
  return (
    <ButtonLink href={status === 'signedIn' ? '/home' : '/login'} variant="primary" size="sm">
      {status === 'signedIn' ? 'Open app' : 'Log in'}
    </ButtonLink>
  );
}
