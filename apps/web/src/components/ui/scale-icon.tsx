import { Angry, Annoyed, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning, Frown, Laugh, Meh, Smile, Zap, type LucideIcon } from 'lucide-react';

const ICONS: Record<'mood' | 'energy', LucideIcon[]> = {
  mood: [Angry, Frown, Meh, Smile, Laugh],
  energy: [BatteryWarning, BatteryLow, BatteryMedium, BatteryFull, Zap],
};

/** Line icons for the 1–5 mood and energy scales. */
export function ScaleIcon({ kind, value, className }: { kind: 'mood' | 'energy'; value: number; className?: string }) {
  const Icon = ICONS[kind][Math.min(4, Math.max(0, value - 1))] ?? Annoyed;
  return <Icon className={className} strokeWidth={1.6} aria-hidden="true" />;
}
