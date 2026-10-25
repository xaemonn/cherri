import { EMPTY_PBAC, PBAC_POINTS, pbacDayScore, type PbacEntry } from '@cherri/shared';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, T, tap } from '@/components/ui';
import { colors, fonts } from '@/lib/theme';

type CountKey = Exclude<keyof PbacEntry, 'cupMl'>;

const ROWS: Array<{ key: CountKey; label: string; points: number; icon: string }> = [
  { key: 'padsLight', label: 'Pad, lightly stained', points: PBAC_POINTS.pad.light, icon: '▫️' },
  { key: 'padsModerate', label: 'Pad, half soaked', points: PBAC_POINTS.pad.moderate, icon: '' },
  { key: 'padsSoaked', label: 'Pad, fully soaked', points: PBAC_POINTS.pad.soaked, icon: '' },
  { key: 'tamponsLight', label: 'Tampon, light', points: PBAC_POINTS.tampon.light, icon: '▫️' },
  { key: 'tamponsModerate', label: 'Tampon, half', points: PBAC_POINTS.tampon.moderate, icon: '' },
  { key: 'tamponsSoaked', label: 'Tampon, soaked', points: PBAC_POINTS.tampon.soaked, icon: '' },
  { key: 'clotsSmall', label: 'Small clot (₹1 coin)', points: PBAC_POINTS.clot.small, icon: '' },
  { key: 'clotsLarge', label: 'Large clot (₹5 coin)', points: PBAC_POINTS.clot.large, icon: '' },
  { key: 'flooding', label: 'Flooding episode', points: PBAC_POINTS.flooding, icon: '' },
];

/** PBAC counters: what she used today and how soaked it was. Over 100 per period is heavy. */
export function PbacCard({ value, onChange }: { value: PbacEntry; onChange: (next: PbacEntry) => void }) {
  const e = { ...EMPTY_PBAC, ...value };
  const score = pbacDayScore(value);
  return (
    <Card tone="apricot" style={{ gap: 8 }}>
      <T variant="h3">Blood loss (PBAC)</T>
      <T variant="small">Doctors use this score to measure heavy periods. Over 100 points (about 80 mL) in one period is heavy.</T>
      {ROWS.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={{ fontSize: 18 }}>{row.icon}</Text>
          <Text style={styles.label}>
            {row.label} <Text style={styles.points}>×{row.points}</Text>
          </Text>
          <Pressable
            accessibilityLabel={`One less: ${row.label}`}
            onPress={() => {
              tap();
              onChange({ ...value, [row.key]: Math.max(0, e[row.key] - 1) });
            }}
            style={styles.step}
          >
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.count}>{e[row.key]}</Text>
          <Pressable
            accessibilityLabel={`One more: ${row.label}`}
            onPress={() => {
              tap();
              onChange({ ...value, [row.key]: Math.min(30, e[row.key] + 1) });
            }}
            style={[styles.step, { backgroundColor: colors.ink }]}
          >
            <Text style={[styles.stepText, { color: colors.cream }]}>+</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.row}>
        <Text style={{ fontSize: 18 }}></Text>
        <Text style={styles.label}>Menstrual cup (mL today)</Text>
        <TextInput
          keyboardType="number-pad"
          value={e.cupMl ? String(e.cupMl) : ''}
          placeholder="0"
          placeholderTextColor={colors.inkFaint}
          onChangeText={(v) => onChange({ ...value, cupMl: Math.min(500, Number(v.replace(/\D/g, '')) || 0) })}
          style={styles.cup}
        />
      </View>
      <Text style={styles.total}>
        Today: {score} points · ≈{Math.round(e.cupMl + score * 0.8)} mL
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  points: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkFaint },
  step: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  count: { width: 24, textAlign: 'center', fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  cup: { width: 72, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, textAlign: 'center', fontFamily: fonts.semibold, color: colors.ink },
  total: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.ink, marginTop: 4 },
});
