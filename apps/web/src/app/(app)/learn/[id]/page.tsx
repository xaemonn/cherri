import { Suspense } from 'react';
import { PageLoader } from '@/components/ui/misc';
import { ArticleView } from './article-view';

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <ArticleView params={params} />
    </Suspense>
  );
}
