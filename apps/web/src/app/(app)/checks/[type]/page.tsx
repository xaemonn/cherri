import { SCREENING_TYPES, type ScreeningType } from '@cherri/shared';
import { notFound } from 'next/navigation';
import { CheckFlow } from './check-flow';

export function generateStaticParams() {
  return SCREENING_TYPES.map((type) => ({ type }));
}

export default async function CheckPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!(SCREENING_TYPES as readonly string[]).includes(type)) notFound();
  return <CheckFlow type={type as ScreeningType} />;
}
