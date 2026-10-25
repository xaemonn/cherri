'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/cn';

export function LanguageSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language selection"
      className={cn(
        'inline-flex items-center rounded-full border border-line bg-paper/90 p-1 shadow-sm backdrop-blur transition-colors',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setLang('en')}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200',
          lang === 'en'
            ? 'bg-olive-deep text-cream shadow-sm'
            : 'text-ink-soft hover:bg-cream-deep hover:text-ink',
        )}
      >
        <span className="tracking-tight">English</span>
      </button>

      <button
        type="button"
        onClick={() => setLang('hi')}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200',
          lang === 'hi'
            ? 'bg-olive-deep text-cream shadow-sm'
            : 'text-ink-soft hover:bg-cream-deep hover:text-ink',
        )}
      >
        <span className="font-medium tracking-normal">हिंदी</span>
      </button>
    </div>
  );
}

