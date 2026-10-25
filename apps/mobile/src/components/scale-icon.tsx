import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<'mood' | 'energy', IconName[]> = {
  mood: ['sad-outline', 'cloudy-outline', 'remove-circle-outline', 'happy-outline', 'sunny-outline'],
  energy: ['battery-dead-outline', 'battery-half-outline', 'battery-half-outline', 'battery-full-outline', 'flash-outline'],
};

/** Line icons for the 1–5 mood and energy scales. */
export function ScaleIcon({ kind, value, size = 26, color }: { kind: 'mood' | 'energy'; value: number; size?: number; color: string }) {
  return <Ionicons name={ICONS[kind][Math.min(4, Math.max(0, value - 1))]!} size={size} color={color} />;
}
