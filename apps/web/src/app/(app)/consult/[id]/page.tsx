import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/misc';
import { ConsultThread } from './consult-thread';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageLoader label="Opening your consultation…" />}>
      <ConsultThread params={params} />
    </Suspense>
  );
}
