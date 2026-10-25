import { phaseColors, phaseForDay } from '@cherri/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/lib/theme';

function point(c: number, r: number, degrees: number) {
  const rad = ((degrees - 90) * Math.PI) / 180;
  return { x: c + r * Math.cos(rad), y: c + r * Math.sin(rad) };
}

function arc(c: number, r: number, start: number, end: number) {
  const a = point(c, r, start);
  const b = point(c, r, end);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${end - start > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

/** One bead per cycle day, coloured by phase; today wears a ring. */
export function CycleWheel({ day, cycleLength, periodLength, size = 240, children }: { day: number; cycleLength: number; periodLength: number; size?: number; children?: ReactNode }) {
  const total = Math.max(cycleLength, day);
  const c = 120;
  const r = 98;
  const gap = total > 40 ? 1.6 : 2.4;
  const marker = point(c, r, ((day - 0.5) / total) * 360);
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 240 240">
        <Circle cx={c} cy={c} r={r + 17} fill={colors.paper} stroke={colors.ink} strokeWidth={2.5} />
        {Array.from({ length: total }, (_, i) => {
          const d = i + 1;
          const phase = phaseForDay(d, cycleLength, periodLength);
          return (
            <Path
              key={d}
              d={arc(c, r, (i / total) * 360 + gap / 2, ((i + 1) / total) * 360 - gap / 2)}
              stroke={phaseColors[phase].fill}
              strokeWidth={d === day ? 24 : 18}
              strokeLinecap="round"
              fill="none"
              opacity={d > day ? 0.35 : 1}
            />
          );
        })}
        <Circle cx={marker.x} cy={marker.y} r={14} fill={colors.paper} stroke={colors.ink} strokeWidth={3} />
        <Circle cx={marker.x} cy={marker.y} r={5} fill={colors.ink} />
      </Svg>
      <View style={{ position: 'absolute', top: '24%', bottom: '24%', left: '24%', right: '24%', alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}
