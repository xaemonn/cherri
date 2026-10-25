import { assessDangerSigns, dangerQuestionsFor, formatDay, isISODate, type DangerAnswer, type DangerLevel } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, ErrorText, Loader, Screen, SectionTitle, T, tap } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useMotherhood } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';

const RESULT_STYLE: Record<DangerLevel, { shape: string; bg: string; fg: string }> = {
  RED: { shape: '🛑', bg: colors.cherry, fg: colors.cream },
  AMBER: { shape: '⚠️', bg: '#FFEFC2', fg: colors.ochreDeep },
  GREEN: { shape: '🟢', bg: '#E6F3C8', fg: colors.oliveDeep },
};

const ANSWERS: Array<{ value: DangerAnswer; label: string }> = [
  { value: 'YES', label: '✓ Yes' },
  { value: 'NO', label: '✗ No' },
  { value: 'UNSURE', label: '? Not sure' },
];

function DateSetup({ stage }: { stage: 'PREGNANCY' | 'POSTPARTUM' }) {
  const { setUser } = useAuth();
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Card sticker style={{ gap: 10, marginTop: 12 }}>
      <T variant="h3">{stage === 'PREGNANCY' ? 'When is your baby due?' : 'When was your baby born?'}</T>
      <T variant="small">Type the date as YYYY-MM-DD. Your week-by-week plan is built from it.</T>
      <TextInput value={value} onChangeText={setValue} placeholder="2027-01-15" placeholderTextColor={colors.inkFaint} style={styles.input} autoCapitalize="none" />
      {error && <ErrorText error={new Error(error)} />}
      <Button
        label="Save"
        disabled={!isISODate(value.trim())}
        onPress={async () => {
          try {
            setUser(await api.me.update(stage === 'PREGNANCY' ? { dueDate: value.trim() } : { deliveryDate: value.trim() }));
            await queryClient.invalidateQueries();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not save.');
          }
        }}
      />
    </Card>
  );
}

/** Pregnancy and postnatal care on the phone: where she is, the danger-sign check, and what's next. */
export default function PregnancyScreen() {
  const { user } = useAuth();
  const care = useMotherhood();
  const [answers, setAnswers] = useState<Record<string, DangerAnswer>>({});

  if (!user || care.isLoading) return <Screen><Loader label="Getting your care plan…" /></Screen>;
  if (care.error || !care.data) return <Screen><ErrorText error={care.error} /></Screen>;
  if (user.lifeStage !== 'PREGNANCY' && user.lifeStage !== 'POSTPARTUM') {
    return (
      <Screen>
        <T variant="title">Pregnancy & baby</T>
        <T style={{ marginTop: 8 }}>Set your life stage to pregnant or postpartum to use the weekly care plan and danger-sign check.</T>
      </Screen>
    );
  }

  const { status, bloodPressure, schemes } = care.data;
  const stage = user.lifeStage;
  const weeks = status?.stage === 'PREGNANCY' ? status.age.weeks : null;
  const questions = dangerQuestionsFor(stage, weeks);
  const result = assessDangerSigns(stage, answers, weeks);
  const answered = questions.filter((q) => answers[q.id]).length;
  const showResult = answered > 0 && (answered === questions.length || result.level === 'RED');
  const style = RESULT_STYLE[result.level];
  const latest = bloodPressure.at(-1);

  return (
    <Screen bottomInset={60}>
      <T variant="eyebrow">{stage === 'PREGNANCY' ? 'Pregnancy care' : 'After birth'}</T>
      {status?.stage === 'PREGNANCY' ? (
        <Card sticker tone="matcha" style={{ gap: 6, marginTop: 8 }}>
          <T variant="eyebrow">Trimester {status.age.trimester}</T>
          <Text style={styles.big}>
            {status.age.weeks} weeks {status.age.days > 0 ? `${status.age.days} days` : ''}
          </Text>
          {status.baby && <T variant="h3">{status.baby.emoji} About the size of {status.baby.name}</T>}
          <T variant="small">
            {status.age.daysToGo} days to go · due {formatDay(status.age.dueDate, { year: true })}
          </T>
          {status.age.weeks >= 13 && <T variant="small">Free doctor check-up (PMSMA) on {formatDay(status.nextPmsma, { weekday: true })}</T>}
        </Card>
      ) : status?.stage === 'POSTPARTUM' ? (
        <Card sticker tone="matcha" style={{ gap: 6, marginTop: 8 }}>
          <Text style={styles.big}>Week {status.age.weeks + 1} after birth</Text>
          <T variant="small">{status.age.postnatal ? `Day ${status.age.days} of your first 42 days` : 'Past the first six weeks'}</T>
        </Card>
      ) : (
        <DateSetup stage={stage} />
      )}

      <SectionTitle eyebrow="1 minute" title="Danger-sign check" />
      {showResult && (
        <View style={[styles.result, { backgroundColor: style.bg }]} accessibilityRole="alert">
          <Text style={[styles.resultTitle, { color: style.fg }]}>
            {style.shape} {result.headline}
          </Text>
          <Text style={[styles.resultText, { color: style.fg }]}>{result.action}</Text>
          <View style={styles.wrap}>
            {result.call.map((number) => (
              <Pressable key={number} onPress={() => void Linking.openURL(`tel:${number}`)} style={styles.call}>
                <Text style={styles.callText}>📞 {number}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => setAnswers({})}>
            <Text style={[styles.resultText, { color: style.fg, textDecorationLine: 'underline' }]}>Start again</Text>
          </Pressable>
        </View>
      )}
      <View style={{ gap: 10 }}>
        {questions.map((q, i) => (
          <Card key={q.id} style={{ gap: 10, padding: 14 }}>
            <T>
              {i + 1}. {q.text}
            </T>
            <View style={styles.wrap}>
              {ANSWERS.map((a) => {
                const selected = answers[q.id] === a.value;
                return (
                  <Pressable
                    key={a.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      tap();
                      setAnswers({ ...answers, [q.id]: a.value });
                    }}
                    style={[styles.answer, selected && { backgroundColor: a.value === 'YES' ? colors.cherry : colors.ink, borderColor: a.value === 'YES' ? colors.cherry : colors.ink }]}
                  >
                    <Text style={[styles.answerText, selected && { color: colors.cream }]}>{a.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ))}
      </View>
      <T variant="small" style={{ marginTop: 8 }}>
        Based on the MoHFW Mother and Child Protection card and WHO guidance. Not a diagnosis: if something feels wrong, get checked.
      </T>

      {latest && (
        <>
          <SectionTitle eyebrow="Pre-eclampsia watch" title="Blood pressure" />
          <Card style={{ gap: 4 }}>
            <Text style={styles.big}>
              {latest.systolic}/{latest.diastolic}
            </Text>
            <T variant="small">
              Latest, on {formatDay(latest.date)} · {bloodPressure.length} readings. 140/90 or more needs a doctor the same day.
            </T>
          </Card>
        </>
      )}

      {status && (
        <>
          <SectionTitle eyebrow="Your care plan" title="Right now and next" />
          <View style={{ gap: 10 }}>
            {status.steps
              .filter((s) => s.status !== 'DONE')
              .sort((a, b) => (a.status === b.status ? a.from - b.from : a.status === 'NOW' ? -1 : 1))
              .slice(0, 6)
              .map((step) => (
                <Card key={step.id} tone={step.status === 'NOW' ? 'sunshine' : 'paper'} style={{ gap: 4, padding: 14 }}>
                  <T variant="eyebrow">{step.status === 'NOW' ? 'Now' : `From ${stage === 'PREGNANCY' ? `week ${step.from}` : `day ${step.from}`}`}</T>
                  <T variant="h3">{step.title}</T>
                  <T variant="small">{step.detail}</T>
                </Card>
              ))}
          </View>
        </>
      )}

      <SectionTitle eyebrow="Free for you" title="Schemes and transport" />
      <View style={{ gap: 10 }}>
        {schemes.map((scheme) => (
          <Pressable key={scheme.short} onPress={() => void Linking.openURL(scheme.url)}>
            <Card style={{ gap: 4, padding: 14 }}>
              <T variant="h3">{scheme.short}</T>
              <T variant="small">{scheme.description}</T>
            </Card>
          </Pressable>
        ))}
        <Button label="Call 102: free pregnancy transport" variant="lime" onPress={() => void Linking.openURL('tel:102')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  answer: { borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  answerText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  result: { borderRadius: 24, padding: 16, gap: 10, marginBottom: 12 },
  resultTitle: { fontFamily: fonts.display, fontSize: 24 },
  resultText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  call: { backgroundColor: colors.cream, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  callText: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.cherryDeep },
  input: { height: 50, borderRadius: 16, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 14, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, outlineWidth: 0 },
});
