'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CircleText, SunRays } from '@/components/brand/decor';
import { DivineWoman } from '@/components/brand/divine-woman';
import { CherryMark, Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/field';
import { useAuth } from '@/lib/auth';

export function AuthScreen({ mode }: { mode: 'login' | 'signup' }) {
  const { status, login, register, continueAsGuest } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'form' | 'guest' | null>(null);

  useEffect(() => {
    if (status === 'signedIn' && !busy) router.replace('/home');
  }, [status, busy, router]);

  async function run(kind: 'form' | 'guest', action: () => Promise<unknown>, next: string) {
    setBusy(kind);
    setError(null);
    try {
      await action();
      router.replace(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(null);
    }
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'login') void run('form', () => login({ email: form.email, password: form.password }), '/home');
    else void run('form', () => register({ email: form.email, password: form.password, name: form.name || undefined }), '/onboarding');
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-forest p-12 text-cream lg:flex lg:flex-col">
        <Link href="/" className="relative z-10">
          <Logo light />
        </Link>
        <SunRays className="absolute -top-40 -right-40 size-136 animate-spin-slow text-ochre/15" count={24} spread={360} inner={30} outer={48} width={2} />
        <div className="relative mx-auto mt-6 w-full max-w-sm flex-1">
          <DivineWoman className="w-full" />
          <CircleText text="100% free ✺ 0% judgement ✺ " className="absolute -bottom-2 -left-6 size-28 text-ochre-soft">
            <CherryMark className="size-10" />
          </CircleText>
        </div>
        <div className="relative mt-8">
          <h1 className="text-5xl leading-[1] font-medium">
            Your body is <span className="accent-italic text-ochre">divine.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-cream/75">Track, understand and take real evidence to your doctor. Free, private and made for India.</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-block lg:hidden">
            <Logo />
          </Link>
          <h2 className="text-4xl font-semibold">{mode === 'login' ? 'Welcome back 🍒' : 'Make your Cherri'}</h2>
          <p className="mt-2 text-ink-soft">
            {mode === 'login' ? 'Pick up right where you left off.' : 'Save your data across devices with an email.'}
          </p>

          <Button
            variant="olive"
            size="lg"
            className="mt-8 w-full"
            disabled={busy !== null}
            onClick={() => void run('guest', () => continueAsGuest(form.name || undefined), '/onboarding')}
          >
            {busy === 'guest' ? 'Setting things up…' : 'Continue as guest, no email needed'}
            <ArrowRight className="size-5" />
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs font-bold tracking-widest text-ink-faint uppercase">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <label className="block">
                <Label hint="optional">First name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="given-name" placeholder="Ananya" />
              </label>
            )}
            <label className="block">
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" placeholder="you@example.com" />
            </label>
            <label className="block">
              <Label hint={mode === 'signup' ? 'at least 8 characters' : undefined}>Password</Label>
              <Input
                type="password"
                required
                minLength={mode === 'signup' ? 8 : 1}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>
            <FieldError>{error}</FieldError>
            <Button type="submit" size="lg" className="w-full" disabled={busy !== null}>
              {busy === 'form' ? 'One sec…' : mode === 'login' ? 'Log in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <Link href="/signup" className="font-semibold text-olive-deep underline decoration-1 underline-offset-4">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have one?{' '}
                <Link href="/login" className="font-semibold text-olive-deep underline decoration-1 underline-offset-4">
                  Log in
                </Link>
              </>
            )}
          </p>
          {mode === 'login' && (
            <p className="mt-4 rounded-2xl bg-ochre-soft px-4 py-3 text-center text-xs text-ochre-deep">
              Demo account: <strong>demo@cherri.app</strong> / <strong>cherri-demo-2026</strong>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
