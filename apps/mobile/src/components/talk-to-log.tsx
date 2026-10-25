import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Sticker, tap } from '@/components/ui';
import { api } from '@/lib/api';
import { useInvalidateHealth } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';
import { useVoiceNote } from '@/lib/voice';

/** Type or say how you feel ("cramps 7/10, bahut thakaan") and it becomes a log. */
export function TalkToLog({ date, onLogged }: { date?: string; onLogged?: (summary: string) => void }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const invalidate = useInvalidateHealth();
  const voice = useVoiceNote();

  async function save(input: string, source: 'CHAT' | 'VOICE') {
    if (!input.trim()) return;
    setSaving(true);
    try {
      const result = await api.ai.parseLog({ text: input, commit: true, source, ...(date && { date }) });
      setText('');
      await invalidate();
      onLogged?.(result.summary || 'your note');
    } catch (error) {
      Alert.alert('Could not log that', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleVoice() {
    tap();
    try {
      if (voice.state === 'recording') {
        const transcript = await voice.stop();
        setText(transcript);
        await save(transcript, 'VOICE');
      } else {
        await voice.start();
      }
    } catch (error) {
      Alert.alert('Voice note', error instanceof Error ? error.message : 'Could not record.');
    }
  }

  const busy = saving || voice.state === 'transcribing';
  return (
    <Sticker radius={30} offset={3}>
      <View style={styles.box}>
        <TextInput
          value={voice.state === 'recording' ? 'Listening… tap stop' : text}
          onChangeText={setText}
          editable={voice.state === 'idle'}
          placeholder="cramps 7/10, bahut thakaan…"
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
          onSubmitEditing={() => void save(text, 'CHAT')}
          returnKeyType="send"
        />
        <Pressable onPress={() => void toggleVoice()} disabled={busy} style={[styles.round, { backgroundColor: voice.state === 'recording' ? colors.cherry : colors.creamDeep }]}>
          <Ionicons name={voice.state === 'recording' ? 'stop' : 'mic'} size={20} color={voice.state === 'recording' ? colors.white : colors.ink} />
        </Pressable>
        <Pressable onPress={() => void save(text, 'CHAT')} disabled={busy || !text.trim()} style={[styles.round, { backgroundColor: colors.ink, opacity: busy || !text.trim() ? 0.5 : 1 }]}>
          {busy ? <ActivityIndicator color={colors.cream} /> : <Ionicons name="send" size={18} color={colors.cream} />}
        </Pressable>
      </View>
    </Sticker>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, borderRadius: 30, padding: 6, paddingLeft: 16 },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.ink, paddingVertical: 8, outlineWidth: 0 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
