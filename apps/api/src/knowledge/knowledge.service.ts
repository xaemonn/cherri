import { Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { MYTHS, SYMPTOMS, type Article, type ArticleMeta, type Myth, type SymptomDef } from '@cherri/shared';
import MiniSearch from 'minisearch';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface KnowledgeHit {
  articleId: string;
  title: string;
  heading: string;
  text: string;
  source: string;
  url?: string;
  score: number;
}

interface Chunk {
  id: string;
  articleId: string;
  title: string;
  heading: string;
  text: string;
  topics: string;
}

const STOP_WORDS = new Set(
  'a an and are as at be but by can could do does for from had has have how i if in is it its me my of on or should so that the their them then there these this to was what when where which who why will with would you your hai hain ka ki ke ko kya mein main mujhe mera meri se aur bhi kyun kaise'.split(' '),
);

/** Everyday and Hinglish words mapped to the terms the articles use. */
const SYNONYMS: Record<string, string> = {
  periods: 'period',
  mc: 'period',
  mahina: 'period',
  pcod: 'pcos',
  anaemia: 'anemia',
  anemic: 'anemia',
  anaemic: 'anemia',
  haemoglobin: 'hemoglobin',
  hb: 'hemoglobin',
  thyroid: 'thyroid',
  sugar: 'diabetes',
  pills: 'contraception',
  'i-pill': 'emergency',
  ipill: 'emergency',
};

// Walk up instead of a fixed '../..': tsc emits dist/knowledge/*, swc (dev) emits dist/src/knowledge/*.
function findKnowledgeDir(from: string): string {
  for (let dir = from; dirname(dir) !== dir; dir = dirname(dir)) {
    const candidate = join(dir, 'knowledge');
    if (existsSync(join(dir, 'package.json')) && existsSync(candidate)) return candidate;
  }
  throw new Error(`knowledge/ folder not found above ${from}`);
}

const KNOWLEDGE_DIR = findKnowledgeDir(__dirname);

function processTerm(term: string): string | null {
  const t = term.toLowerCase();
  if (STOP_WORDS.has(t) || t.length < 2) return null;
  return SYNONYMS[t] ?? t;
}

function parseArticle(file: string, raw: string): Article {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${file}: missing frontmatter`);
  const meta: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  const body = match[2]!.trim();
  if (!meta.id || !meta.title || !meta.source) throw new Error(`${file}: frontmatter needs id, title and source`);
  return {
    id: meta.id,
    title: meta.title,
    source: meta.source,
    url: meta.url || undefined,
    topics: (meta.topics ?? '').replace(/[[\]]/g, '').split(',').map((t) => t.trim()).filter(Boolean),
    summary: body.split(/\r?\n\r?\n/)[0]!.replace(/^#+\s.*\n/, '').trim(),
    body,
  };
}

/** Splits an article into its "## " sections so retrieval returns focused passages. */
function chunk(article: Article): Chunk[] {
  const sections = article.body.split(/\r?\n(?=## )/);
  return sections.map((section, i) => {
    const heading = /^## (.*)/.exec(section)?.[1]?.trim() ?? article.title;
    return {
      id: `${article.id}#${i}`,
      articleId: article.id,
      title: article.title,
      heading,
      text: section.replace(/^## .*\r?\n/, '').trim(),
      topics: article.topics.join(' '),
    };
  });
}

/**
 * The curated health library: grounding for the Cherri AI companion (with citations) and the Learn hub.
 * Small enough to search in memory with BM25; no vector database needed.
 */
@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private articles = new Map<string, Article>();
  private readonly chunks = new MiniSearch<Chunk>({
    fields: ['title', 'heading', 'text', 'topics'],
    storeFields: ['articleId', 'title', 'heading', 'text'],
    processTerm,
    searchOptions: { boost: { title: 2, heading: 2, topics: 2 }, fuzzy: 0.15, prefix: true, processTerm },
  });
  private readonly myths = new MiniSearch<Myth>({
    fields: ['claim', 'tags'],
    storeFields: ['id'],
    processTerm,
    extractField: (doc, field) => (field === 'tags' ? doc.tags.join(' ') : String(doc[field as keyof Myth])),
    searchOptions: { fuzzy: 0.15, prefix: true, processTerm },
  });

  onModuleInit(): void {
    const files = readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const article = parseArticle(file, readFileSync(join(KNOWLEDGE_DIR, file), 'utf8'));
      this.articles.set(article.id, article);
      this.chunks.addAll(chunk(article));
    }
    this.myths.addAll(MYTHS);
    this.logger.log(`Loaded ${this.articles.size} articles (${this.chunks.documentCount} passages) and ${MYTHS.length} myths`);
  }

  /** Adds catalog terms when the query uses everyday or Hinglish symptom words ("pet dard" → cramps). */
  private expand(query: string): string {
    const lower = ` ${query.toLowerCase()} `;
    const extra = (SYMPTOMS as readonly SymptomDef[]).filter((s) => s.keywords.some((k) => lower.includes(` ${k} `))).map((s) => `${s.label} ${s.clinicalTerm ?? ''}`);
    return [query, ...extra].join(' ');
  }

  search(query: string, limit = 3): KnowledgeHit[] {
    const seen = new Set<string>();
    const hits: KnowledgeHit[] = [];
    for (const result of this.chunks.search(this.expand(query))) {
      const articleId = result.articleId as string;
      // One passage per article keeps the context diverse.
      if (seen.has(articleId)) continue;
      seen.add(articleId);
      const article = this.articles.get(articleId)!;
      hits.push({
        articleId,
        title: article.title,
        heading: result.heading as string,
        text: result.text as string,
        source: article.source,
        url: article.url,
        score: result.score,
      });
      if (hits.length >= limit) break;
    }
    return hits;
  }

  /** Closest curated myth, with `coverage` = share of the claim's meaningful words it matched. */
  findMyth(claim: string): { myth: Myth; coverage: number } | null {
    const tokenize = MiniSearch.getDefault('tokenize') as (text: string) => string[];
    const terms = new Set(tokenize(claim).map(processTerm).filter(Boolean));
    const [best] = this.myths.search(claim);
    if (!best || terms.size === 0) return null;
    return { myth: MYTHS.find((m) => m.id === best.id)!, coverage: best.queryTerms.length / terms.size };
  }

  list(): ArticleMeta[] {
    return [...this.articles.values()].map(({ body: _body, ...meta }) => meta).sort((a, b) => a.title.localeCompare(b.title));
  }

  get(id: string): Article {
    const article = this.articles.get(id);
    if (!article) throw new NotFoundException({ code: 'ARTICLE_NOT_FOUND', message: 'Article not found.' });
    return article;
  }
}
