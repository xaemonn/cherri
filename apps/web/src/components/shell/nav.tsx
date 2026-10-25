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
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only shown in these life stages. */
  stages?: readonly LifeStage[];
}

export const PRIMARY_NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/log', label: 'Log', icon: NotebookPen },
  { href: '/chat', label: 'Ask Cherri', icon: MessageCircleHeart },
  { href: '/insights', label: 'Insights', icon: Radar },
];

interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Everything beyond the four main tabs, in small labelled groups. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Care',
    items: [
      { href: '/consult', label: 'Consult a doctor', icon: Stethoscope },
      { href: '/report', label: 'Doctor report', icon: QrCode },
      { href: '/labs', label: 'Lab decoder', icon: FlaskConical },
      { href: '/prep', label: 'Visit prep', icon: ClipboardList },
      { href: '/care', label: 'Find care', icon: MapPin },
    ],
  },
  {
    title: 'Track',
    items: [
      { href: '/pregnancy', label: 'Pregnancy & baby', icon: Baby, stages: ['PREGNANCY', 'POSTPARTUM'] },
      { href: '/cycle', label: 'Cycle calendar', icon: CalendarHeart },
      { href: '/checks', label: 'Health checks', icon: ClipboardCheck },
      { href: '/meds', label: 'Medicine guardian', icon: Pill },
      { href: '/learn', label: 'Learn & myths', icon: BookOpen },
      { href: '/wrapped', label: 'Cycle Wrapped', icon: Gift },
    ],
  },
  {
    title: 'Safety',
    items: [
      { href: '/ec', label: 'Accident help', icon: ShieldQuestion },
    ],
  },
];

const SETTINGS: NavItem = { href: '/settings', label: 'Settings', icon: Settings };

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

function useNavGroups(): NavGroup[] {
  const { user } = useAuth();
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((item) => !item.stages || (user && item.stages.includes(user.lifeStage))) }));
}

/** Desktop: one calm column that scrolls as a whole, with Settings pinned at the bottom. */
export function Sidebar() {
  const isActive = useIsActive();
  const groups = useNavGroups();
  const link = (item: NavItem) => {
    const active = isActive(item.href);
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
        {item.label}
      </Link>
    );
  };
  return (
    <aside className="sticky top-4 m-4 hidden h-[calc(100dvh-2rem)] w-60 shrink-0 flex-col rounded-[24px] border border-line bg-paper/90 shadow-lift backdrop-blur lg:flex">
      <Link href="/home" className="px-5 pt-5 pb-4">
        <Logo />
      </Link>
      <nav aria-label="Main" className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex flex-col gap-0.5">{PRIMARY_NAV.map(link)}</div>
        {groups.map((g) => (
          <div key={g.title} className="mt-5">
            <p className="mb-1 px-3 text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">{g.title}</p>
            <div className="flex flex-col gap-0.5">{g.items.map(link)}</div>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-3">{link(SETTINGS)}</div>
    </aside>
  );
}

/** Phones: a bottom tab bar with a raised cherry "Ask" button and a "More" sheet. */
export function BottomNav() {
  const isActive = useIsActive();
  const groups = useNavGroups();
  const [open, setOpen] = useState(false);
  const [home, log, chat, insights] = PRIMARY_NAV;

  const tab = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', isActive(item.href) ? 'text-olive-deep' : 'text-ink-faint')}
    >
      <item.icon className="size-6" strokeWidth={isActive(item.href) ? 2.2 : 1.7} />
      {item.label}
    </Link>
  );

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-3 bottom-24 max-h-[70dvh] animate-pop overflow-y-auto rounded-[28px] border border-line bg-paper p-3 shadow-lift-lg" onClick={(e) => e.stopPropagation()}>
            {[...groups, { title: 'Account', items: [SETTINGS] }].map((g) => (
              <div key={g.title} className="mb-3 last:mb-0">
                <p className="mb-1.5 px-1 text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">{g.title}</p>
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
                      {item.label}
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
          <span className={cn('py-1 text-[11px] font-semibold', isActive('/chat') ? 'text-olive-deep' : 'text-ink-faint')}>Ask</span>
        </Link>
        {tab(insights!)}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', open ? 'text-olive-deep' : 'text-ink-faint')}
        >
          {open ? <X className="size-6" strokeWidth={1.8} /> : <LayoutGrid className="size-6" strokeWidth={1.8} />}
          More
        </button>
      </nav>
    </>
  );
}

/** Static stand-in used while the current path is resolving. */
export function NavFallback() {
  return <aside className="m-4 hidden h-[calc(100dvh-2rem)] w-64 shrink-0 rounded-[30px] border border-line bg-paper/85 lg:block" />;
}
