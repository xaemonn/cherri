import { severityStyles, type PatternInsight, type PatternWindow, type RedFlag } from '@cherri/shared';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card, Pill, T } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

const WINDOW: Record<PatternWindow, { label: string; bg: string }> = {
  MENSTRUAL: { label: '🩸 During period', bg: '#FFE2C6' },
  FOLLICULAR: { label: '🌱 After period', bg: '#E6F3C8' },
  OVULATORY: { label: '✨ Around ovulation', bg: '#FFEFC2' },
  LUTEAL: { label: '🌙 Second half', bg: '#E1E4FF' },
  PREMENSTRUAL: { label: '⏳ Week before period', bg: '#E1E4FF' },
};

export function PatternCard({ pattern }: { pattern: PatternInsight }) {
  const w = WINDOW[pattern.window];
  return (
    <Card style={{ gap: 8, marginBottom: 12 }}>
      <Pill label={w.label} bg={w.bg} fg={colors.ink} />
      <T variant="h3">{pattern.label}</T>
      <T variant="small">{pattern.message}</T>
      {pattern.hint?.screening && (
        <Pressable onPress={() => router.push(`/checks/${pattern.hint!.screening}`)} style={{ backgroundColor: '#FFEFC2', borderRadius: 16, padding: 12 }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.ink }}>{pattern.hint.note}</Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.ink, marginTop: 6, textDecorationLine: 'underline' }}>Take the check →</Text>
        </Pressable>
      )}
    </Card>
  );
}

export function FlagCard({ flag }: { flag: RedFlag }) {
  const s = severityStyles[flag.severity];
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 24, padding: 16, marginBottom: 12, gap: 4 }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5, color: s.ink, textTransform: 'uppercase' }}>
        {s.emoji} {s.label}
      </Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 18, color: s.ink }}>{flag.title}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: s.ink }}>{flag.detail}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: s.ink, marginTop: 4 }}>{flag.action}</Text>
    </View>
  );
}
