import {
  addDays,
  classifyBloodPressure,
  energyScale,
  FLOW_LEVELS,
  flowStyles,
  formatDay,
  isEmptyPbac,
  moodScale,
  symptomCategoriesFor,
  SYMPTOMS,
  todayIn,
  type FlowLevel,
  type PbacEntry,
  type SymptomCategory,
  type SymptomCode,
} from '@cherri/shared';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScaleIcon } from '@/components/scale-icon';
import { PbacCard } from '@/components/pbac';
import { TalkToLog } from '@/components/talk-to-log';
import { Button, Card, Chip, Loader, Screen, T, tap } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useLog, useSaveLog } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';

const CATEGORY_LABELS: Record<SymptomCategory, string> = {
  PAIN: 'Pain',
  BLEEDING: 'Bleeding & discharge',
  DIGESTION: 'Tummy',
  SKIN_HAIR: 'Skin & hair',
  MOOD: 'Mind & mood',
  ENERGY_SLEEP: 'Energy & sleep',
  BODY: 'Body',
  PREGNANCY: 'Pregnancy signs',
};

interface FormState {
  flow: FlowLevel | null;
  painLevel: number | null;
  mood: number | null;
  energy: number | null;
  sleepHours: number | null;
  /** Typed text, so half-entered numbers aren't rewritten. */
  systolic: string;
  diastolic: string;
  weightKg: string;
  symptoms: Map<SymptomCode, number>;
  notes: string;
  pbac: PbacEntry;
}

const EMPTY: FormState = { flow: null, painLevel: null, mood: null, energy: null, sleepHours: null, systolic: '', diastolic: '', weightKg: '', symptoms: new Map(), notes: '', pbac: {} };

const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

function ScaleRow({ items, kind, value, onChange }: { items: ReadonlyArray<{ value: number; label: string }>; kind: 'mood' | 'energy'; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <View style={styles.scale}>
      {items.map((item) => (
        <Pressable
          key={item.value}
          onPress={() => {
            tap();
            onChange(value === item.value ? null : item.value);
          }}
          style={[styles.scaleItem, value === item.value && styles.scaleSelected]}
        >
          <ScaleIcon kind={kind} value={item.value} color={colors.ink} />
          <Text style={styles.scaleLabel}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function LogScreen() {
  const { user } = useAuth();
  const today = useMemo(() => todayIn(user?.timezone ?? 'Asia/Kolkata'), [user?.timezone]);
  const [date, setDate] = useState(today);
  const { data, isLoading } = useLog(date);
  const save = useSaveLog(date);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    const log = data?.log;
    setForm(
      log
        ? {
            flow: log.flow,
            painLevel: log.painLevel,
            mood: log.mood,
            energy: log.energy,
            sleepHours: log.sleepHours,
            systolic: log.systolic?.toString() ?? '',
            diastolic: log.diastolic?.toString() ?? '',
            weightKg: log.weightKg?.toString() ?? '',
            symptoms: new Map(log.symptoms.map((s) => [s.code as SymptomCode, s.severity])),
            notes: log.notes ?? '',
            pbac: log.pbac ?? {},
          }
        : EMPTY,
    );
  }, [data, date]);

  const categories = symptomCategoriesFor(user?.lifeStage ?? 'CYCLE');
  const systolic = numberOrNull(form.systolic);
  const diastolic = numberOrNull(form.diastolic);
  const bpLevel = systolic && diastolic && systolic > diastolic ? classifyBloodPressure(systolic, diastolic) : null;

  function toggleSymptom(code: SymptomCode) {
    setForm((f) => {
      const symptoms = new Map(f.symptoms);
      if (symptoms.has(code)) symptoms.delete(code);
      else symptoms.set(code, 2);
      return { ...f, symptoms };
    });
  }

  function submit() {
    if ((systolic === null) !== (diastolic === null)) {
      setSaved('Add both blood pressure numbers, like 120 / 80.');
      return;
    }
    save.mutate(
      {
        flow: form.flow,
        painLevel: form.painLevel,
        mood: form.mood,
        energy: form.energy,
        sleepHours: form.sleepHours,
        systolic,
        diastolic,
        weightKg: numberOrNull(form.weightKg),
        notes: form.notes.trim() || null,
        pbac: isEmptyPbac(form.pbac) ? null : form.pbac,
        symptoms: [...form.symptoms.entries()].map(([code, severity]) => ({ code, severity })),
      },
      {
        onSuccess: () => {
          setSaved(date === today ? 'Today is logged. Proud of you!' : `Saved ${formatDay(date)}`);
          setTimeout(() => setSaved(null), 3000);
        },
      },
    );
  }

  return (
    <Screen>
      <T variant="eyebrow">Daily log</T>
      <T variant="title">How’s your body today?</T>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 16 }} contentContainerStyle={{ gap: 8 }}>
        {Array.from({ length: 14 }, (_, i) => addDays(today, -i)).map((d, i) => (
          <Pressable key={d} onPress={() => setDate(d)} style={[styles.dateChip, d === date && styles.dateChipSelected]}>
            <Text style={[styles.dateLabel, d === date && { color: colors.cream }]}>{i === 0 ? 'Today' : formatDay(d, { weekday: true }).split(',')[0]}</Text>
            <Text style={[styles.dateNum, d === date && { color: colors.cream }]}>{Number(d.slice(8))}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <TalkToLog date={date} onLogged={(summary) => setSaved(`Logged ${summary}`)} />

      {isLoading ? (
        <Loader />
      ) : (
        <View style={{ gap: 14, marginTop: 16 }}>
          <Card tone="apricot" style={{ gap: 10 }}>
            <T variant="h3">Period flow</T>
            <View style={styles.wrap}>
              {FLOW_LEVELS.map((flow) => (
                <Chip
                  key={flow}
                  label={`${flow === 'NONE' ? '' : ''.repeat(Math.max(1, flowStyles[flow].drops))} ${flowStyles[flow].label}`}
                  selected={form.flow === flow}
                  onPress={() => setForm({ ...form, flow: form.flow === flow ? null : flow })}
                />
              ))}
            </View>
          </Card>

          <PbacCard value={form.pbac} onChange={(pbac) => setForm((f) => ({ ...f, pbac }))} />

          <Card tone="tangerine" style={{ gap: 10 }}>
            <T variant="h3">Pain {form.painLevel !== null ? `· ${form.painLevel}/10` : ''}</T>
            <View style={styles.painRow}>
              {Array.from({ length: 11 }, (_, n) => (
                <Pressable
                  key={n}
                  onPress={() => {
                    tap();
                    setForm({ ...form, painLevel: form.painLevel === n ? null : n });
                  }}
                  style={[styles.painDot, form.painLevel !== null && n <= form.painLevel && { backgroundColor: n >= 7 ? colors.cherry : colors.clay }]}
                >
                  <Text style={styles.painNum}>{n}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card tone="periwinkle" style={{ gap: 8 }}>
            <T variant="h3">Mood</T>
            <ScaleRow kind="mood" items={moodScale} value={form.mood} onChange={(mood) => setForm({ ...form, mood })} />
            <T variant="h3">Energy</T>
            <ScaleRow kind="energy" items={energyScale} value={form.energy} onChange={(energy) => setForm({ ...form, energy })} />
          </Card>

          <Card tone="sage" style={{ gap: 10 }}>
            <T variant="h3">Sleep</T>
            <View style={styles.sleepRow}>
              <Button label="−" variant="outline" onPress={() => setForm({ ...form, sleepHours: Math.max(0, (form.sleepHours ?? 7) - 0.5) })} />
              <Text style={styles.sleepValue}>{form.sleepHours ?? '—'} h</Text>
              <Button label="+" variant="outline" onPress={() => setForm({ ...form, sleepHours: Math.min(16, (form.sleepHours ?? 7) + 0.5) })} />
            </View>
          </Card>

          <Card tone={user?.lifeStage === 'PREGNANCY' || user?.lifeStage === 'POSTPARTUM' ? 'sunshine' : 'paper'} style={{ gap: 10 }}>
            <T variant="h3">Vitals</T>
            <View style={styles.vitalsRow}>
              <TextInput
                value={form.systolic}
                onChangeText={(value) => setForm({ ...form, systolic: value })}
                keyboardType="number-pad"
                placeholder="120"
                placeholderTextColor={colors.inkFaint}
                accessibilityLabel="Systolic (top number)"
                style={styles.vitalInput}
              />
              <Text style={styles.sleepValue}>/</Text>
              <TextInput
                value={form.diastolic}
                onChangeText={(value) => setForm({ ...form, diastolic: value })}
                keyboardType="number-pad"
                placeholder="80"
                placeholderTextColor={colors.inkFaint}
                accessibilityLabel="Diastolic (bottom number)"
                style={styles.vitalInput}
              />
              <T variant="small">mmHg</T>
            </View>
            {bpLevel && (
              <T variant="small" style={{ fontFamily: fonts.bold, color: bpLevel === 'HIGH' || bpLevel === 'SEVERE' ? colors.cherryDeep : colors.oliveDeep }}>
                {bpLevel === 'SEVERE' ? 'Very high: get help now' : bpLevel === 'HIGH' ? 'High: 140/90 or more' : bpLevel === 'ELEVATED' ? 'A little high' : 'In the healthy range'}
              </T>
            )}
            <View style={styles.vitalsRow}>
              <TextInput
                value={form.weightKg}
                onChangeText={(value) => setForm({ ...form, weightKg: value })}
                keyboardType="decimal-pad"
                placeholder="60"
                placeholderTextColor={colors.inkFaint}
                accessibilityLabel="Weight in kilograms"
                style={styles.vitalInput}
              />
              <T variant="small">kg</T>
            </View>
          </Card>

          <Card style={{ gap: 12 }}>
            <T variant="h3">Symptoms</T>
            {categories.map((category) => (
              <View key={category} style={{ gap: 8 }}>
                <T variant="eyebrow">{CATEGORY_LABELS[category]}</T>
                <View style={styles.wrap}>
                  {SYMPTOMS.filter((s) => s.category === category).map((s) => (
                    <Chip key={s.code} label={s.label} selected={form.symptoms.has(s.code)} onPress={() => toggleSymptom(s.code)} />
                  ))}
                </View>
              </View>
            ))}
          </Card>

          <Card style={{ gap: 8 }}>
            <T variant="h3">Notes</T>
            <TextInput
              multiline
              value={form.notes}
              onChangeText={(notes) => setForm({ ...form, notes })}
              placeholder="Anything else? Your doctor report can include these."
              placeholderTextColor={colors.inkFaint}
              style={styles.notes}
            />
          </Card>

          {saved && <Text style={styles.saved}>{saved}</Text>}
          <Button label={save.isPending ? 'Saving…' : `Save ${date === today ? 'today' : formatDay(date)}`} variant="lime" onPress={submit} loading={save.isPending} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateChip: { minWidth: 58, alignItems: 'center', borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 10 },
  dateChipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  dateLabel: { fontFamily: fonts.bold, fontSize: 10, textTransform: 'uppercase', color: colors.inkSoft },
  dateNum: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  painRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  painDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  painNum: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleItem: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 16 },
  scaleSelected: { backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink },
  scaleLabel: { fontFamily: fonts.bold, fontSize: 10, color: colors.ink },
  sleepRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  sleepValue: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, minWidth: 80, textAlign: 'center' },
  notes: { minHeight: 90, borderRadius: 18, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.cream, padding: 12, fontFamily: fonts.body, fontSize: 15, color: colors.ink, textAlignVertical: 'top', outlineWidth: 0 },
  saved: { fontFamily: fonts.bold, fontSize: 14, color: colors.oliveDeep, textAlign: 'center' },
  vitalsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vitalInput: { width: 84, height: 48, borderRadius: 16, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, textAlign: 'center', fontFamily: fonts.display, fontSize: 20, color: colors.ink, outlineWidth: 0 },
});
