import { CherryMark } from '@/components/brand/logo';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <CherryMark className="mx-auto size-24 animate-wiggle" mood="wink" />
        <h1 className="mt-6 text-6xl font-semibold uppercase">Oops, 404</h1>
        <p className="mt-3 text-lg text-ink-soft">This page wandered off. Let’s get you back.</p>
        <ButtonLink href="/" variant="olive" size="lg" className="mt-8">
          Take me home
        </ButtonLink>
      </div>
    </div>
  );
}
