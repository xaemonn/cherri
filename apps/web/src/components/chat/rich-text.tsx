import type { Citation } from '@cherri/shared';
import { Fragment } from 'react';

/** Inline formatting: **bold** and [n] citation chips. */
function inline(text: string, citations: Citation[], keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
    const cite = /^\[(\d+)\]$/.exec(part);
    if (cite) {
      const citation = citations.find((c) => c.index === Number(cite[1]));
      return (
        <a
          key={key}
          href={citation ? `/learn/${citation.articleId}` : undefined}
          title={citation ? `${citation.title} · ${citation.source}` : undefined}
          className="mx-0.5 inline-grid size-5 place-items-center rounded-full bg-ochre align-[2px] text-[10px] font-semibold text-ink no-underline"
        >
          {cite[1]}
        </a>
      );
    }
    return <Fragment key={key}>{part.replace(/\*([^*]+)\*/g, '$1')}</Fragment>;
  });
}

/** A tiny, safe markdown subset for chat replies: paragraphs, bullet lists, bold, citations. */
export function RichText({ text, citations = [] }: { text: string; citations?: Citation[] }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2.5">
      {blocks.map((block, b) => {
        const lines = block.split('\n');
        if (lines.every((line) => /^\s*([-*•]|\d+\.)\s+/.test(line))) {
          return (
            <ul key={b} className="space-y-1.5">
              {lines.map((line, l) => (
                <li key={l} className="flex gap-2">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-current opacity-60" />
                  <span>{inline(line.replace(/^\s*([-*•]|\d+\.)\s+/, ''), citations, `${b}-${l}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={b}>
            {lines.map((line, l) => (
              <Fragment key={l}>
                {l > 0 && <br />}
                {inline(line, citations, `${b}-${l}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
