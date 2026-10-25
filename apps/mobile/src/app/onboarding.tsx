import { addDays, todayIn, type CompanionTone, type Language, type LifeStage } from '@cherri/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { CherryMark } from '@/components/cherry';
import { Button, Card, ErrorText, Screen, T, tap } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

const STAGES: Array<{ value: LifeStage; label: string; emoji: string }> = [
  { value: 'CYCLE', label: 'Tracking my cycle', emoji: '' },
  { value: 'TTC', label: 'Trying to conceive', emoji: '' },
  { value: 'PREGNANCY', label: 'Pregnant', emoji: '' },
  { value: 'POSTPARTUM', label: 'Postpartum', emoji: '' },
  { value: 'PERIMENOPAUSE', label: 'Perimenopause', emoji: '' },
  { value: 'MENOPAUSE', label: 'Menopause', emoji: '' },
];
const TONES: Array<{ value: CompanionTone; label: string; emoji: string }> = [
  { value: 'BESTIE', label: 'Bestie', emoji: '' },
  { value: 'BIG_SIS', label: 'Big sis', emoji: '' },
  { value: 'CLINICAL', label: 'Straight facts', emoji: '' },
];
const LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'hinglish', label: 'Hinglish' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'kn', label: 'ಕನ್ನಡ' },
];

function Stepper({ value, onChange, min, max, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; suffix: string }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepBtn} onPress={() => {
          tap();
          onChange(Math.max(min, value - 1));
        }}>
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>
        {value} <Text style={styles.stepSuffix}>{suffix}</Text>
      </Text>
      <Pressable style={styles.stepBtn} onPress={() => {
          tap();
          onChange(Math.min(max, value + 1));
        }}>
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

function Option({ selected, onPress, children }: { selected: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.option, selected && styles.optionSelected]}
    >
      {children}
    </Pressable>
  );
}

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<'save' | 'demo' | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [form, setForm] = useState({
    name: user?.name ?? '',
    lifeStage: 'CYCLE' as LifeStage,
    knowsLastPeriod: true,
    daysAgo: 7,
    avgCycleLength: 28,
    companionTone: 'BESTIE' as CompanionTone,
    language: 'en' as Language,
    consent: false,
  });

  const tracksPeriods = form.lifeStage === 'CYCLE' || form.lifeStage === 'TTC' || form.lifeStage === 'PERIMENOPAUSE';
  const steps = ['name', 'stage', ...(tracksPeriods ? ['cycle'] : []), 'vibe', 'consent'];
  const current = steps[step];
  const last = step === steps.length - 1;

  async function finish() {
    setBusy('save');
    setError(null);
    try {
      const today = todayIn(user?.timezone ?? 'Asia/Kolkata');
      const updated = await api.me.onboard({
        name: form.name.trim() || undefined,
        lifeStage: form.lifeStage,
        language: form.language,
        companionTone: form.companionTone,
        consent: true,
        ...(tracksPeriods && { avgCycleLength: form.avgCycleLength }),
        ...(tracksPeriods && form.knowsLastPeriod && { lastPeriodStart: addDays(today, -form.daysAgo) }),
      });
      setUser(updated);
      router.replace('/home');
    } catch (e) {
      setError(e);
      setBusy(null);
    }
  }

  async function loadDemo() {
    setBusy('demo');
    try {
      await api.demo.load();
      setUser(await api.me.get());
      router.replace('/home');
    } catch (e) {
      setError(e);
      setBusy(null);
    }
  }

  return (
    <Screen bottomInset={40}>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${((step + 1) / steps.length) * 100}%` }]} />
      </View>

      {current === 'name' && (
        <View style={{ gap: 16 }}>
          <CherryMark size={70} wink />
          <T variant="title">Hi! What should Cherri call you?</T>
          <TextInput style={styles.input} placeholder="Your first name" placeholderTextColor={colors.inkFaint} value={form.name} onChangeText={(name) => setForm({ ...form, name })} />
          {user?.isGuest && (
            <Card tone="cream">
              <T variant="h3">Just exploring?</T>
              <T variant="small" style={{ marginVertical: 6 }}>
                Load 7 months of demo data for “Ananya” and see every feature light up.
              </T>
              <Button label={busy === 'demo' ? 'Loading…' : 'Explore with demo data'} variant="outline" onPress={() => void loadDemo()} disabled={busy !== null} />
            </Card>
          )}
        </View>
      )}

      {current === 'stage' && (
        <View style={{ gap: 12 }}>
          <T variant="title">Where are you in life right now?</T>
          <View style={styles.grid}>
            {STAGES.map((s) => (
              <Option key={s.value} selected={form.lifeStage === s.value} onPress={() => setForm({ ...form, lifeStage: s.value })}>
                <Text style={styles.optionLabel}>{s.label}</Text>
              </Option>
            ))}
          </View>
        </View>
      )}

      {current === 'cycle' && (
        <View style={{ gap: 16 }}>
          <T variant="title">When did your last period start?</T>
          <T variant="small">A rough guess is fine. Cherri learns your real rhythm every cycle.</T>
          {form.knowsLastPeriod && <Stepper value={form.daysAgo} onChange={(daysAgo) => setForm({ ...form, daysAgo })} min={0} max={90} suffix={form.daysAgo === 1 ? 'day ago' : 'days ago'} />}
          <View style={styles.row}>
            <Text style={styles.optionLabel}>I don’t remember</Text>
            <Switch value={!form.knowsLastPeriod} onValueChange={(v) => setForm({ ...form, knowsLastPeriod: !v })} trackColor={{ true: colors.ink, false: colors.line }} />
          </View>
          <T variant="h3">My cycle usually lasts</T>
          <Stepper value={form.avgCycleLength} onChange={(avgCycleLength) => setForm({ ...form, avgCycleLength })} min={18} max={60} suffix="days" />
        </View>
      )}

      {current === 'vibe' && (
        <View style={{ gap: 12 }}>
          <T variant="title">How should Cherri talk to you?</T>
          {TONES.map((t) => (
            <Option key={t.value} selected={form.companionTone === t.value} onPress={() => setForm({ ...form, companionTone: t.value })}>
              <Text style={styles.optionLabel}>
                {t.label}
              </Text>
            </Option>
          ))}
          <T variant="h3" style={{ marginTop: 8 }}>
            Language
          </T>
          <View style={styles.rowWrap}>
            {LANGUAGES.map((l) => (
              <Option key={l.value} selected={form.language === l.value} onPress={() => setForm({ ...form, language: l.value })}>
                <Text style={styles.optionLabel}>{l.label}</Text>
              </Option>
            ))}
          </View>
        </View>
      )}

      {current === 'consent' && (
        <View style={{ gap: 12 }}>
          <T variant="title">Your data, your rules</T>
          {[
            'Your notes and chats are encrypted before they are stored.',
            'Cherri never sells your data or shows ads.',
            'AI only sees summaries, never your phone or email.',
            'Export or delete everything anytime.',
          ].map((line) => (
            <Card key={line} style={{ padding: 14 }}>
              <T>{line}</T>
            </Card>
          ))}
          <View style={[styles.row, styles.consent]}>
            <Text style={[styles.optionLabel, { flex: 1 }]}>I agree Cherri can store my health data securely. It gives information, not a diagnosis.</Text>
            <Switch value={form.consent} onValueChange={(consent) => setForm({ ...form, consent })} trackColor={{ true: colors.ink, false: colors.line }} />
          </View>
        </View>
      )}

      {error !== null && <ErrorText error={error} />}

      <View style={styles.nav}>
        {step > 0 ? <Button label="Back" variant="ghost" onPress={() => setStep(step - 1)} /> : <View />}
        {last ? (
          <Button label={busy === 'save' ? 'Saving…' : 'Start my Cherri'} variant="lime" onPress={() => void finish()} disabled={!form.consent || busy !== null} />
        ) : (
          <Button label="Next" onPress={() => setStep(step + 1)} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.creamDeep, overflow: 'hidden', marginBottom: 28 },
  progressFill: { height: '100%', backgroundColor: colors.ink, borderRadius: 4 },
  input: { height: 56, borderRadius: 18, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 18, color: colors.ink, outlineWidth: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: { borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, borderRadius: 22, padding: 14, gap: 6, flexGrow: 1, minWidth: '45%' },
  optionSelected: { borderColor: colors.ink, backgroundColor: colors.olive },
  optionLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  stepValue: { fontFamily: fonts.display, fontSize: 34, color: colors.ink, minWidth: 140, textAlign: 'center' },
  stepSuffix: { fontFamily: fonts.semibold, fontSize: 15, color: colors.inkSoft },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  consent: { borderWidth: 2, borderColor: colors.ink, backgroundColor: '#E6F3C8', borderRadius: 22, padding: 14 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 },
});
