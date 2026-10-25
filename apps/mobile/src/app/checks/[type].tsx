import { bandStyles, SCREENING_TYPES, type ScreeningRecord, type ScreeningType } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ErrorText, Loader, Screen, T, tap } from '@/components/ui';
import { api } from '@/lib/api';
import { keys, useScreening } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';

function Result({ record, onRetake }: { record: ScreeningRecord; onRetake: () => void }) {
  const { result } = record;
  const band = bandStyles[result.band];
  return (
    <View style={{ gap: 12, marginTop: 16 }}>
      <View style={[styles.resultCard, { backgroundColor: band.bg }]}>
        <Text style={[styles.eyebrow, { color: band.ink }]}>RESULT</Text>
        <Text style={[styles.band, { color: band.ink }]}>{band.label}</Text>
        <Text style={[styles.summary, { color: band.ink }]}>{result.summary}</Text>
      </View>
      {result.reasons.length > 0 && (
        <Card style={{ gap: 6 }}>
          <T variant="h3">Why</T>
          {result.reasons.map((r) => (
            <T key={r} variant="small">
              • {r}
            </T>
          ))}
        </Card>
      )}
      <Card tone="matcha" style={{ gap: 6 }}>
        <T variant="h3">What to do next</T>
        {result.nextSteps.map((s) => (
          <T key={s} variant="small">
            → {s}
          </T>
        ))}
      </Card>
      {result.suggestedTests.length > 0 && (
        <Card tone="periwinkle" style={{ gap: 6 }}>
          <T variant="h3">Tests to ask about</T>
          {result.suggestedTests.map((t) => (
            <T key={t} variant="small">
              {t}
            </T>
          ))}
          <T style={{ fontFamily: fonts.bold, marginTop: 4 }}>See: {result.specialist}</T>
        </Card>
      )}
      <T variant="small">{result.disclaimer}</T>
      <Button label="Add to my doctor report" variant="lime" onPress={() => router.push('/report')} />
      <Button label="Retake" variant="ghost" onPress={onRetake} />
    </View>
  );
}

export default function CheckFlow() {
  const params = useLocalSearchParams<{ type: string }>();
  const type = (SCREENING_TYPES as readonly string[]).includes(params.type) ? (params.type as ScreeningType) : 'PCOS';
  const { data, isLoading, error } = useScreening(type);
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<ScreeningRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  useEffect(() => {
    if (data) setAnswers(Object.fromEntries(Object.entries(data.prefill).map(([id, p]) => [id, p.value])));
  }, [data]);

  if (isLoading) return <Screen><Loader /></Screen>;
  if (error || !data) return <Screen><ErrorText error={error} /></Screen>;

  const question = data.questions[index];

  async function answer(value: boolean) {
    if (!question) return;
    tap();
    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    if (index < data!.questions.length - 1) return setIndex(index + 1);
    setSubmitting(true);
    setSubmitError(null);
    try {
      setResult(await api.screenings.submit(type, next));
      void queryClient.invalidateQueries({ queryKey: keys.screenings });
      void queryClient.invalidateQueries({ queryKey: keys.dashboard });
    } catch (e) {
      setSubmitError(e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen bottomInset={40}>
      <T variant="title">{data.title}</T>
      <T variant="small" style={{ marginTop: 4 }}>
        Based on {data.basis}.
      </T>
      {result ? (
        <Result
          record={result}
          onRetake={() => {
            setResult(null);
            setIndex(0);
          }}
        />
      ) : (
        question && (
          <View style={{ marginTop: 20, gap: 12 }}>
            <View style={styles.progress}>
              <View style={[styles.progressFill, { width: `${(index / data.questions.length) * 100}%` }]} />
            </View>
            <T variant="small">
              Question {index + 1} of {data.questions.length}
            </T>
            <Card sticker style={{ gap: 14 }}>
              <T variant="h2">{question.text}</T>
              {question.hint && <T variant="small">{question.hint}</T>}
              {data.prefill[question.id] && <Text style={styles.noticed}>Cherri noticed: {data.prefill[question.id]!.reason}</Text>}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[true, false].map((value) => (
                  <Pressable
                    key={String(value)}
                    disabled={submitting}
                    onPress={() => void answer(value)}
                    style={[styles.answer, answers[question.id] === value && { backgroundColor: colors.ink }]}
                  >
                    <Text style={[styles.answerText, answers[question.id] === value && { color: colors.cream }]}>{value ? 'Yes' : 'No'}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>
            {submitError !== null && <ErrorText error={submitError} />}
            {index > 0 && <Button label="Back" variant="ghost" onPress={() => setIndex(index - 1)} />}
          </View>
        )
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.creamDeep, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.ink },
  noticed: { fontFamily: fonts.medium, fontSize: 13, color: colors.ochreDeep, backgroundColor: '#FFEFC2', borderRadius: 14, padding: 10, overflow: 'hidden' },
  answer: { flex: 1, height: 56, borderRadius: 22, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  answerText: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  resultCard: { borderRadius: 26, padding: 18, borderWidth: 2, borderColor: colors.ink },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2 },
  band: { fontFamily: fonts.display, fontSize: 28, marginTop: 4 },
  summary: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginTop: 6 },
});
