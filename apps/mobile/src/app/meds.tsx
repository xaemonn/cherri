import { MEDICINE_CLASS_LABELS, medicineGuidance, missedPillAdvice, PILL_TYPE_LABELS, PILL_TYPES, type MissedPillInput } from '@cherri/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, Screen, SectionTitle, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

const TRY = ['Thyronorm 50', 'Livogen', 'Shelcal 500', 'Meftal Spas', 'Pan 40', 'Ovral-L'];
const SEVERITY_BG = { DANGER: '#FFE2C6', WARNING: '#FFEFC2', INFO: colors.paper } as const;

function parseHours(text: string): number | null {
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h|ghante?)\b/i);
  if (hours) return Number(hours[1]);
  const days = text.match(/(\d+(?:\.\d+)?)\s*(?:days?|din)\b/i);
  return days ? Number(days[1]) * 24 : null;
}

export default function MedsScreen() {
  const { user } = useAuth();
  const saved = useQuery({ queryKey: ['medications'], queryFn: api.medications.list });
  const [extra, setExtra] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [pill, setPill] = useState<MissedPillInput>({ pillType: 'COMBINED', hoursLate: 12, packWeek: 2, recentSex: false });

  const list = [...(saved.data ?? []).filter((m) => m.active).map((m) => ({ id: m.id, name: m.name })), ...extra.map((n) => ({ name: n }))];
  const guidance = medicineGuidance(list, { pregnant: user?.lifeStage === 'PREGNANCY' });
  const advice = missedPillAdvice(pill);
  const add = (n: string) => n.trim() && !list.some((m) => m.name.toLowerCase() === n.trim().toLowerCase()) && setExtra((cur) => [...cur, n.trim()]);

  return (
    <Screen bottomInset={60}>
      <T variant="title">Medicine guardian</T>
      <T style={{ marginTop: 6 }}>Timing with food, clashes between medicines and a missed-pill helper.</T>

      <Card style={{ gap: 10, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={name} onChangeText={setName} placeholder="Medicine or brand" placeholderTextColor={colors.inkFaint} style={[styles.input, { flex: 1 }]} />
          <Button
            label="Add"
            onPress={() => {
              add(name);
              setName('');
            }}
          />
        </View>
        <View style={styles.wrap}>
          {TRY.map((t) => (
            <Chip key={t} label={t} onPress={() => add(t)} />
          ))}
        </View>
        {list.length > 0 && <T variant="small">Checking: {list.map((m) => m.name).join(', ')}</T>}
      </Card>

      {guidance.conflicts.map((c) => (
        <Card key={`${c.a}-${c.b}`} style={{ marginTop: 12, backgroundColor: SEVERITY_BG[c.severity] }}>
          <T variant="h3">
            {c.severity === 'DANGER' ? '' : ''} {c.a} + {c.b}
          </T>
          <T style={{ marginTop: 4 }}>{c.message}</T>
        </Card>
      ))}

      {guidance.medicines.map((m) => (
        <Card key={m.id ?? m.name} style={{ marginTop: 12, gap: 6 }}>
          <T variant="h3">{m.name}</T>
          {m.classes.length ? (
            <>
              <T variant="eyebrow">{m.classes.map((c) => MEDICINE_CLASS_LABELS[c]).join(' · ')}</T>
              {m.when && <Text style={styles.when}>{m.when}</Text>}
              {m.rules.map((r) => (
                <T key={r.title} variant="small">
                  • <Text style={{ fontFamily: fonts.bold }}>{r.title}.</Text> {r.detail}
                </T>
              ))}
            </>
          ) : (
            <T variant="small">No rules for this one yet. Ask your pharmacist whether to take it with food.</T>
          )}
        </Card>
      ))}

      <SectionTitle eyebrow="Missed-pill helper" title="“I missed my pill by … hours”" />
      <Card tone="sage" style={{ gap: 10 }}>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            const h = parseHours(v);
            if (h !== null) setPill((p) => ({ ...p, hoursLate: h }));
          }}
          placeholder="I missed my pill by 30 hours"
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
        />
        <View style={styles.wrap}>
          {PILL_TYPES.map((p) => (
            <Chip key={p} label={PILL_TYPE_LABELS[p].split(' (')[0]!.split(',')[0]!} selected={pill.pillType === p} onPress={() => setPill({ ...pill, pillType: p })} />
          ))}
        </View>
        {pill.pillType === 'COMBINED' && (
          <View style={styles.wrap}>
            {([1, 2, 3, 'BREAK'] as const).map((w) => (
              <Chip key={w} label={w === 'BREAK' ? 'Break week' : `Week ${w}`} selected={pill.packWeek === w} onPress={() => setPill({ ...pill, packWeek: w })} />
            ))}
          </View>
        )}
        <Chip label="Sex without a condom in the last 7 days" selected={Boolean(pill.recentSex)} onPress={() => setPill({ ...pill, recentSex: !pill.recentSex })} />
        <T variant="small">{pill.hoursLate} hours late</T>
        <View style={styles.advice}>
          <T variant="h3">{advice.headline}</T>
          {advice.steps.map((s, i) => (
            <T key={s}>
              {i + 1}. {s}
            </T>
          ))}
          {advice.emergencyContraception === 'RECOMMENDED' && <Button label="Open the emergency contraception helper" onPress={() => router.push('/ec')} />}
          <T variant="small">{advice.note}</T>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { height: 48, borderRadius: 16, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 14, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  when: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, backgroundColor: '#DCEFE0', borderRadius: 12, padding: 8 },
  advice: { backgroundColor: colors.paper, borderRadius: 18, padding: 14, gap: 6 },
});
