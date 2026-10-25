'use client';

import type { LifeStage } from '@cherri/shared';
import {
  Baby,
  BookOpen,
  CalendarHeart,
  ClipboardCheck,
  FlaskConical,
  Gift,
  House,
  LayoutGrid,
  MapPin,
  MessageCircleHeart,
  NotebookPen,
  QrCode,
  Radar,
  Settings,
  ShieldAlert,
  Stethoscope,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { SunRays } from '@/components/brand/decor';
import { CherryMark, Logo } from '@/components/brand/logo';
import { QuickExitButton } from '@/components/safety/quick-exit';
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

export const SECONDARY_NAV: NavItem[] = [
  { href: '/pregnancy', label: 'Pregnancy & baby', icon: Baby, stages: ['PREGNANCY', 'POSTPARTUM'] },
  { href: '/cycle', label: 'Cycle calendar', icon: CalendarHeart },
  { href: '/checks', label: 'Health checks', icon: ClipboardCheck },
  { href: '/labs', label: 'Lab decoder', icon: FlaskConical },
  { href: '/prep', label: 'Visit prep', icon: Stethoscope },
  { href: '/report', label: 'Doctor report', icon: QrCode },
  { href: '/learn', label: 'Learn & myths', icon: BookOpen },
  { href: '/care', label: 'Find care', icon: MapPin },
  { href: '/safety', label: 'Safety & SOS', icon: ShieldAlert },
  { href: '/wrapped', label: 'Cycle Wrapped', icon: Gift },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

function useSecondaryNav(): NavItem[] {
  const { user } = useAuth();
  return SECONDARY_NAV.filter((item) => !item.stages || (user && item.stages.includes(user.lifeStage)));
}

/** Desktop: a floating linen panel with an olive pill on the current page. */
export function Sidebar() {
  const isActive = useIsActive();
  const secondary = useSecondaryNav();
  const link = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-medium transition-all duration-300 ease-out-soft',
          active ? 'bg-olive-deep text-cream shadow-lift' : 'text-ink-soft hover:translate-x-1 hover:bg-cream-deep/70 hover:text-ink',
        )}
      >
        <item.icon className="size-5 shrink-0" strokeWidth={1.8} />
        {item.label}
      </Link>
    );
  };
  return (
    <aside className="sticky top-4 m-4 hidden h-[calc(100dvh-2rem)] w-64 shrink-0 flex-col rounded-[30px] border border-line bg-paper/85 p-4 shadow-lift backdrop-blur lg:flex">
      <Link href="/home" className="mb-6 px-2 pt-1">
        <Logo />
      </Link>
      <nav className="flex flex-col gap-1">{PRIMARY_NAV.map(link)}</nav>
      <div className="mx-3 my-4 h-px bg-line" />
      <nav className="flex flex-col gap-1 overflow-y-auto">{secondary.map(link)}</nav>
      <div className="relative mt-auto overflow-hidden rounded-arch bg-ochre-soft px-4 pt-10 pb-4 text-center">
        <SunRays className="absolute -top-4 left-1/2 size-20 -translate-x-1/2 text-ochre" count={7} />
        <p className="relative font-display text-[15px] leading-snug italic">Your body is wise. Cherri helps you listen.</p>
      </div>
      <QuickExitButton compact className="mt-3 w-full" />
    </aside>
  );
}

/** Phones: a bottom tab bar with a raised cherry "Ask" button and a "More" sheet. */
export function BottomNav() {
  const isActive = useIsActive();
  const secondary = useSecondaryNav();
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
          <div className="absolute inset-x-3 bottom-24 animate-pop rounded-[28px] border border-line bg-paper p-3 shadow-lift-lg" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-2">
              {secondary.map((item) => (
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
            <QuickExitButton className="mt-3 w-full" />
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
