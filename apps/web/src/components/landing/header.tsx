'use client';

import { Logo } from '@/components/brand/logo';
import { NavCta } from '@/components/landing/landing-cta';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useLanguage } from '@/lib/i18n';

export function LandingHeader() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-3 z-40 px-3 sm:px-6">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-line bg-paper/85 py-2 pr-2 pl-4 shadow-lift backdrop-blur-md">
        <Logo />
        <div className="hidden items-center gap-7 text-sm font-medium text-ink-soft md:flex">
          <a href="#features" className="transition-colors hover:text-ink">
            {t('landing.nav_features', 'Features')}
          </a>
          <a href="#app" className="transition-colors hover:text-ink">
            {t('landing.nav_mobile', 'Mobile app')}
          </a>
          <a href="#how" className="transition-colors hover:text-ink">
            {t('landing.nav_how', 'How it works')}
          </a>
          <a href="#privacy" className="transition-colors hover:text-ink">
            {t('landing.nav_privacy', 'Privacy')}
          </a>
        </div>
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <NavCta />
        </div>
      </nav>
    </header>
  );
}

