import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/misc';
import { SharedReport } from './shared-report';

export const metadata = { title: 'Shared health summary · Cherri', robots: { index: false, follow: false } };

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<PageLoader label="Opening report…" />}>
      <SharedReport params={params} />
    </Suspense>
  );
}
