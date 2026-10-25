'use client';

import { ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { RichText } from '@/components/chat/rich-text';
import { Card } from '@/components/ui/card';
import { ErrorNote, PageLoader } from '@/components/ui/misc';
import { useArticle } from '@/lib/queries';

export function ArticleView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error } = useArticle(id);
  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorNote error={error} />;

  const [intro, ...sections] = data.body.split(/\n(?=## )/);

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/learn" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Learn
      </Link>
      <p className="text-xs font-bold tracking-[0.18em] text-ink-soft uppercase">{data.source}</p>
      <h1 className="mt-2 text-4xl leading-tight font-semibold sm:text-5xl">{data.title}</h1>
      <div className="mt-6 text-lg leading-relaxed">
        <RichText text={intro ?? ''} />
      </div>
      <div className="mt-8 space-y-5">
        {sections.map((section) => {
          const [heading, ...rest] = section.split('\n');
          return (
            <Card key={heading}>
              <h2 className="text-2xl font-semibold">{heading?.replace(/^##\s*/, '')}</h2>
              <div className="mt-3 text-[15px] leading-relaxed">
                <RichText text={rest.join('\n')} />
              </div>
            </Card>
          );
        })}
      </div>
      {data.url && (
        <a href={data.url} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-1.5 text-sm font-bold underline decoration-2 underline-offset-4">
          Read the original source <ExternalLink className="size-4" />
        </a>
      )}
      <p className="mt-6 text-xs text-ink-soft">Cherri gives health information, not a diagnosis. Talk to a qualified doctor about your symptoms.</p>
    </article>
  );
}
