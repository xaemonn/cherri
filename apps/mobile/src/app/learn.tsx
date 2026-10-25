import { evidenceStyles, MYTHS, verdictStyles, type MythCheck } from '@cherri/shared';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, ErrorText, Screen, SectionTitle, T } from '@/components/ui';
import { api } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';

const TONES = ['#E6F3C8', '#FFEFC2', '#E1E4FF', '#FFE7C2', '#DCEFE0'];

export default function Learn() {
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState<'fact' | 'myth' | null>(null);
  const [score, setScore] = useState(0);
  const [claim, setClaim] = useState('');
  const [result, setResult] = useState<MythCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const myth = MYTHS[index % MYTHS.length]!;
  const isFact = myth.verdict === 'TRUE';
  const verdict = verdictStyles[myth.verdict];

  function choose(choice: 'fact' | 'myth') {
    if (guess) return;
    setGuess(choice);
    if ((choice === 'fact') === isFact) setScore((s) => s + 1);
  }

  async function check() {
    if (claim.trim().length < 3) return;
    setChecking(true);
    setError(null);
    try {
      setResult(await api.ai.mythCheck({ claim }));
    } catch (e) {
      setError(e);
    } finally {
      setChecking(false);
    }
  }

  return (
    <Screen bottomInset={40}>
      <T variant="title">Myth or fact?</T>
      <T variant="small" style={{ marginTop: 4 }}>
        Score: {score} 🍒 · card {(index % MYTHS.length) + 1} of {MYTHS.length}
      </T>
      <Card sticker style={{ marginTop: 16, gap: 14, backgroundColor: TONES[index % TONES.length] }}>
        <T variant="eyebrow">Myth or fact?</T>
        <T variant="h2">“{myth.claim}”</T>
        {guess ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.verdict, { backgroundColor: verdict.bg, color: verdict.ink }]}>
              {verdict.emoji} {verdict.label} · {(guess === 'fact') === isFact ? 'You got it! 🎉' : 'Not quite!'}
            </Text>
            <T>{myth.explanation}</T>
            <T variant="small">{evidenceStyles[myth.evidence].label}</T>
            <Button
              label="Next card"
              variant="lime"
              onPress={() => {
                setGuess(null);
                setIndex(index + 1);
              }}
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="❌ Myth" variant="outline" onPress={() => choose('myth')} style={{ flex: 1 }} />
            <Button label="✅ Fact" onPress={() => choose('fact')} style={{ flex: 1 }} />
          </View>
        )}
      </Card>

      <SectionTitle eyebrow="Fact-checker" title="Saw something online?" />
      <Card tone="ink" style={{ gap: 10 }}>
        <TextInput value={claim} onChangeText={setClaim} placeholder="e.g. jeera water cures PCOS" placeholderTextColor={colors.inkFaint} style={styles.input} />
        <Button label={checking ? 'Checking…' : 'Check it'} variant="lime" onPress={() => void check()} loading={checking} />
        {error !== null && <ErrorText error={error} />}
        {result && (
          <View style={styles.result}>
            <Text style={[styles.verdict, { backgroundColor: verdictStyles[result.verdict].bg, color: verdictStyles[result.verdict].ink }]}>
              {verdictStyles[result.verdict].emoji} {verdictStyles[result.verdict].label}
            </Text>
            <T>{result.explanation.replace(/\s*\[\d+\]/g, '')}</T>
            <T variant="small">{evidenceStyles[result.evidence].label}</T>
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  verdict: { alignSelf: 'flex-start', fontFamily: fonts.bold, fontSize: 14, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, overflow: 'hidden' },
  input: { height: 52, borderRadius: 18, backgroundColor: colors.paper, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 15, color: colors.ink, outlineWidth: 0 },
  result: { backgroundColor: colors.paper, borderRadius: 20, padding: 14, gap: 8 },
});
