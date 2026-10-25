'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LOCK_KEY } from '@/lib/shield';

/**
 * The URL a quick exit rests on. The decoy itself is drawn by <ScreenShield />. Opened directly
 * without a lock it just goes home; the check runs once, so it never races the unlock redirect.
 */
export default function ShieldPage() {
  const router = useRouter();
  useEffect(() => {
    let locked = document.documentElement.dataset.shield === 'on';
    try {
      locked ||= window.localStorage.getItem(LOCK_KEY) === '1';
    } catch {
      // Storage blocked: rely on the attribute.
    }
    if (!locked) router.replace('/');
  }, [router]);
  return null;
}
