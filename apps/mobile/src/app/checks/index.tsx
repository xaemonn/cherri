import { bandStyles } from '@cherri/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ErrorText, Loader, Pill, Screen, T } from '@/components/ui';
import { useScreenings } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';

const TONES = ['#E6F3C8', '#FFEFC2', '#E1E4FF', '#FFE7C2', '#DCEFE0'];
const EMOJIS: Record<string, string> = { PCOS: '🌀', ENDOMETRIOSIS: '⚡', PMDD: '🎢', ANEMIA: '🩸', THYROID: '🦋' };

export default function Checks() {
  const { data, isLoading, error } = useScreenings();
  if (isLoading) return <Screen><Loader /></Screen>;
  if (error || !data) return <Screen><ErrorText error={error} /></Screen>;
  return (
    <Screen bottomInset={40}>
      <T variant="title">Is it normal? Let’s check.</T>
      <T variant="small" style={{ marginTop: 6 }}>
        Built on the criteria doctors use. Cherri pre-fills answers from your logs. Not a diagnosis, but it tells you when to see a doctor.
      </T>
      <View style={{ gap: 12, marginTop: 18 }}>
        {data.map((c, i) => (
          <Pressable key={c.type} onPress={() => router.push(`/checks/${c.type}`)} style={[styles.card, { backgroundColor: TONES[i % TONES.length] }]}>
            <View style={styles.row}>
              <Text style={{ fontSize: 30 }}>{EMOJIS[c.type]}</Text>
              {c.latest && <Pill label={bandStyles[c.latest.band].label} bg={bandStyles[c.latest.band].bg} fg={bandStyles[c.latest.band].ink} />}
            </View>
            <Text style={styles.title}>{c.title}</Text>
            <Text style={styles.text}>{c.tagline}</Text>
            <Text style={styles.meta}>
              {c.minutes} min · {c.questionCount} questions →
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderColor: colors.ink, borderRadius: 26, padding: 16, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 21, color: colors.ink, marginTop: 6 },
  text: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft },
  meta: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, marginTop: 6 },
});
