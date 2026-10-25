import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/misc';
import { DoctorConsult } from './doctor-consult';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageLoader label="Opening the consultation…" />}>
      <DoctorConsult params={params} />
    </Suspense>
  );
}
