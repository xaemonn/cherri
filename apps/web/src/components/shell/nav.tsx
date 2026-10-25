'use client';

import type { LifeStage } from '@cherri/shared';
import {
  Baby,
  BookOpen,
  CalendarHeart,
  ClipboardCheck,
  ClipboardList,
  FlaskConical,
  Gift,
  House,
  LayoutGrid,
  MapPin,
  MessageCircleHeart,
  NotebookPen,
  Pill,
  QrCode,
  Radar,
  Settings,
  ShieldQuestion,
  Stethoscope,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { CherryMark, Logo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/lib/i18n';

interface NavItemDef {
  href: string;
  key: string;
  fallback: string;
  icon: LucideIcon;
  stages?: readonly LifeStage[];
}

export const PRIMARY_NAV_DEFS: NavItemDef[] = [
  { href: '/home', key: 'nav.home', fallback: 'Home', icon: House },
  { href: '/log', key: 'nav.log', fallback: 'Log', icon: NotebookPen },
  { href: '/chat', key: 'nav.chat', fallback: 'Ask Cherri', icon: MessageCircleHeart },
  { href: '/insights', key: 'nav.insights', fallback: 'Insights', icon: Radar },
];

interface NavGroupDef {
  titleKey: string;
  titleFallback: string;
  items: NavItemDef[];
}

export const NAV_GROUP_DEFS: NavGroupDef[] = [
  {
    titleKey: 'nav.care_group',
    titleFallback: 'Care',
    items: [
      { href: '/consult', key: 'nav.consult', fallback: 'Consult a doctor', icon: Stethoscope },
      { href: '/report', key: 'nav.report', fallback: 'Doctor report', icon: QrCode },
      { href: '/labs', key: 'nav.labs', fallback: 'Lab decoder', icon: FlaskConical },
      { href: '/prep', key: 'nav.prep', fallback: 'Visit prep', icon: ClipboardList },
      { href: '/care', key: 'nav.find_care', fallback: 'Find care', icon: MapPin },
    ],
  },
  {
    titleKey: 'nav.track_group',
    titleFallback: 'Track',
    items: [
      { href: '/pregnancy', key: 'nav.pregnancy', fallback: 'Pregnancy & baby', icon: Baby, stages: ['PREGNANCY', 'POSTPARTUM'] },
      { href: '/cycle', key: 'nav.cycle', fallback: 'Cycle calendar', icon: CalendarHeart },
      { href: '/checks', key: 'nav.checks', fallback: 'Health checks', icon: ClipboardCheck },
      { href: '/meds', key: 'nav.meds', fallback: 'Medicine guardian', icon: Pill },
      { href: '/learn', key: 'nav.learn', fallback: 'Learn & myths', icon: BookOpen },
      { href: '/wrapped', key: 'nav.wrapped', fallback: 'Cycle Wrapped', icon: Gift },
    ],
  },
  {
    titleKey: 'nav.safety_group',
    titleFallback: 'Safety',
    items: [
      { href: '/ec', key: 'nav.ec', fallback: 'Accident help', icon: ShieldQuestion },
    ],
  },
];

const SETTINGS_DEF: NavItemDef = { href: '/settings', key: 'nav.settings', fallback: 'Settings', icon: Settings };

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

function useFilteredGroups() {
  const { user } = useAuth();
  return NAV_GROUP_DEFS.map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.stages || (user && item.stages.includes(user.lifeStage))),
  }));
}

/** Desktop: one calm column that scrolls as a whole, with Settings and Language Switcher pinned at the bottom. */
export function Sidebar() {
  const isActive = useIsActive();
  const groups = useFilteredGroups();
  const { t } = useLanguage();

  const link = (item: NavItemDef) => {
    const active = isActive(item.href);
    const label = t(item.key, item.fallback);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2 text-[14.5px] font-medium transition-colors',
          active ? 'bg-olive-deep text-cream' : 'text-ink-soft hover:bg-cream-deep hover:text-ink',
        )}
      >
        <item.icon className="size-[18px] shrink-0" strokeWidth={1.8} />
        {label}
      </Link>
    );
  };

  return (
    <aside className="sticky top-4 m-4 hidden h-[calc(100dvh-2rem)] w-60 shrink-0 flex-col rounded-[24px] border border-line bg-paper/90 shadow-lift backdrop-blur lg:flex">
      <Link href="/home" className="px-5 pt-5 pb-4">
        <Logo />
      </Link>
      <nav aria-label="Main" className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex flex-col gap-0.5">{PRIMARY_NAV_DEFS.map(link)}</div>
        {groups.map((g) => (
          <div key={g.titleKey} className="mt-5">
            <p className="mb-1 px-3 text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
              {t(g.titleKey, g.titleFallback)}
            </p>
            <div className="flex flex-col gap-0.5">{g.items.map(link)}</div>
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-2 border-t border-line p-3">
        <div className="flex justify-center pb-1">
          <LanguageSwitcher />
        </div>
        {link(SETTINGS_DEF)}
      </div>
    </aside>
  );
}

/** Phones: a bottom tab bar with a raised cherry "Ask" button and a "More" sheet. */
export function BottomNav() {
  const isActive = useIsActive();
  const groups = useFilteredGroups();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [home, log, chat, insights] = PRIMARY_NAV_DEFS;

  const tab = (item: NavItemDef) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      className={cn(
        'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold',
        isActive(item.href) ? 'text-olive-deep' : 'text-ink-faint',
      )}
    >
      <item.icon className="size-6" strokeWidth={isActive(item.href) ? 2.2 : 1.7} />
      {t(item.key, item.fallback)}
    </Link>
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-x-3 bottom-24 max-h-[70dvh] animate-pop overflow-y-auto rounded-[28px] border border-line bg-paper p-3 shadow-lift-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-line px-2 pb-2.5">
              <span className="text-xs font-semibold text-ink-faint uppercase tracking-wider">{t('common.language', 'Language')}</span>
              <LanguageSwitcher />
            </div>

            {[...groups, { titleKey: 'nav.account', titleFallback: 'Account', items: [SETTINGS_DEF] }].map((g) => (
              <div key={g.titleKey} className="mb-3 last:mb-0">
                <p className="mb-1.5 px-1 text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
                  {t(g.titleKey, g.titleFallback)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-2xl px-3 py-3 text-sm font-medium',
                        isActive(item.href) ? 'bg-olive-deep text-cream' : 'bg-cream text-ink',
                      )}
                    >
                      <item.icon className="size-5" strokeWidth={1.8} />
                      {t(item.key, item.fallback)}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-end rounded-[26px] border border-line bg-paper/90 px-2 shadow-lift-lg backdrop-blur lg:hidden">
        {tab(home!)}
        {tab(log!)}
        <Link href={chat!.href} onClick={() => setOpen(false)} className="-mt-6 flex flex-1 flex-col items-center" aria-label="Ask Cherri">
          <span
            className={cn(
              'grid size-14 place-items-center rounded-full shadow-lift-lg ring-4 ring-cream transition-colors',
              isActive('/chat') ? 'bg-olive-deep' : 'bg-ochre-soft',
            )}
          >
            <CherryMark className="size-9" />
          </span>
          <span className={cn('py-1 text-[11px] font-semibold', isActive('/chat') ? 'text-olive-deep' : 'text-ink-faint')}>
            {t('nav.chat', 'Ask')}
          </span>
        </Link>
        {tab(insights!)}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold',
            open ? 'text-olive-deep' : 'text-ink-faint',
          )}
        >
          {open ? <X className="size-6" strokeWidth={1.8} /> : <LayoutGrid className="size-6" strokeWidth={1.8} />}
          {t('common.more', 'More')}
        </button>
      </nav>
    </>
  );
}

/** Static stand-in used while the current path is resolving. */
export function NavFallback() {
  return <aside className="m-4 hidden h-[calc(100dvh-2rem)] w-60 shrink-0 rounded-[24px] border border-line bg-paper/85 lg:block" />;
}
