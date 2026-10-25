import { SCREENINGS, type ChatAction, type ChatSafety, type Citation, type ScreeningType } from '@cherri/shared';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CherryMark } from '@/components/cherry';
import { RichText } from '@/components/rich-text';
import { T, tap } from '@/components/ui';
import { api } from '@/lib/api';
import { useInvalidateHealth } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';
import { useVoiceNote } from '@/lib/voice';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  citations: Citation[];
  actions: ChatAction[];
  safety: ChatSafety | null;
}

const STARTERS = ['Why am I so tired lately?', 'Is my cycle normal?', 'Aaj bahut cramps hain, kya karun?', 'Explain my blood report'];

function Action({ action }: { action: ChatAction }) {
  if (action.kind === 'LOGGED') return <Text style={styles.logged}>✅ Logged {action.summary}</Text>;
  if (action.kind === 'SHOW_CYCLE') return null;
  return (
    <Pressable onPress={() => router.push(`/checks/${action.screening}`)} style={styles.suggest}>
      <Text style={styles.suggestTitle}>🩺 Take the {SCREENINGS[action.screening as ScreeningType]?.title ?? 'health check'}</Text>
      <Text style={styles.suggestText}>{action.reason}</Text>
    </Pressable>
  );
}

export default function Chat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const invalidateHealth = useInvalidateHealth();
  const voice = useVoiceNote();

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    tap();
    setInput('');
    setBusy(true);
    const replyId = `reply-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: `me-${Date.now()}`, role: 'USER', content: message, citations: [], actions: [], safety: null },
      { id: replyId, role: 'ASSISTANT', content: '', citations: [], actions: [], safety: null },
    ]);
    const update = (fn: (r: Message) => Message) => setMessages((m) => m.map((msg) => (msg.id === replyId ? fn(msg) : msg)));
    let logged = false;
    try {
      await api.ai.chat({ message, ...(sessionId && { sessionId }) }, (event) => {
        if (event.type === 'session') setSessionId(event.sessionId);
        else if (event.type === 'token') update((r) => ({ ...r, content: r.content + event.text }));
        else if (event.type === 'action') {
          if (event.action.kind === 'LOGGED') logged = true;
          update((r) => ({ ...r, actions: [...r.actions, event.action] }));
        } else if (event.type === 'citations') update((r) => ({ ...r, citations: event.citations }));
        else if (event.type === 'safety') update((r) => ({ ...r, safety: { category: event.category, message: event.message, helplines: event.helplines } }));
        else if (event.type === 'error') update((r) => ({ ...r, content: r.content || event.message }));
      });
    } catch (error) {
      update((r) => ({ ...r, content: error instanceof Error ? error.message : 'Cherri could not reply.' }));
    } finally {
      setBusy(false);
      if (logged) void invalidateHealth();
    }
  }

  async function toggleVoice() {
    tap();
    try {
      if (voice.state === 'recording') await send(await voice.stop());
      else await voice.start();
    } catch (error) {
      Alert.alert('Voice', error instanceof Error ? error.message : 'Could not record.');
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <T variant="title">Ask Cherri</T>
        {messages.length > 0 && (
          <Pressable
            onPress={() => {
              setMessages([]);
              setSessionId(null);
            }}
            style={styles.newChat}
          >
            <Ionicons name="add" size={18} color={colors.ink} />
            <Text style={styles.newChatText}>New</Text>
          </Pressable>
        )}
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={10}>
        <ScrollView ref={scroll} contentContainerStyle={styles.list} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <CherryMark size={90} wink />
              <T variant="h2" style={{ textAlign: 'center', marginTop: 10 }}>
                Ask Cherri anything
              </T>
              <T variant="small" style={{ textAlign: 'center' }}>
                English, Hindi or Hinglish. Cherri knows your cycle and labs, and can log symptoms for you.
              </T>
              <View style={styles.starters}>
                {STARTERS.map((s) => (
                  <Pressable key={s} onPress={() => void send(s)} style={styles.starter}>
                    <Text style={styles.starterText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m) =>
              m.role === 'USER' ? (
                <View key={m.id} style={styles.userBubble}>
                  <Text style={styles.userText}>{m.content}</Text>
                </View>
              ) : (
                <View key={m.id} style={styles.botRow}>
                  <CherryMark size={30} />
                  <View style={{ flex: 1, gap: 6 }}>
                    {m.safety && (
                      <View style={styles.safety}>
                        <Text style={styles.safetyTitle}>You’re not alone 💛</Text>
                        <Text style={styles.safetyText}>{m.safety.message}</Text>
                        {m.safety.helplines.map((h) => (
                          <Pressable key={h.number} onPress={() => void Linking.openURL(`tel:${h.number}`)} style={styles.callBtn}>
                            <Text style={styles.callText}>📞 {h.name} · {h.number}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    <View style={styles.botBubble}>{m.content ? <RichText text={m.content} citations={m.citations} /> : <ActivityIndicator color={colors.ink} />}</View>
                    {m.actions.map((a, i) => (
                      <Action key={i} action={a} />
                    ))}
                  </View>
                </View>
              ),
            )
          )}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            value={voice.state === 'recording' ? 'Listening… tap stop' : input}
            onChangeText={setInput}
            editable={voice.state === 'idle'}
            placeholder="Message Cherri…"
            placeholderTextColor={colors.inkFaint}
            style={styles.input}
            multiline
          />
          <Pressable onPress={() => void toggleVoice()} disabled={busy || voice.state === 'transcribing'} style={[styles.round, { backgroundColor: voice.state === 'recording' ? colors.cherry : colors.creamDeep }]}>
            {voice.state === 'transcribing' ? <ActivityIndicator color={colors.ink} /> : <Ionicons name={voice.state === 'recording' ? 'stop' : 'mic'} size={20} color={voice.state === 'recording' ? colors.white : colors.ink} />}
          </Pressable>
          <Pressable onPress={() => void send(input)} disabled={busy || !input.trim()} style={[styles.round, { backgroundColor: colors.ink, opacity: busy || !input.trim() ? 0.5 : 1 }]}>
            {busy ? <ActivityIndicator color={colors.cream} /> : <Ionicons name="send" size={18} color={colors.cream} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 6 },
  newChat: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 2, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  newChatText: { fontFamily: fonts.bold, color: colors.ink },
  list: { paddingHorizontal: 18, paddingBottom: 20, gap: 14 },
  empty: { alignItems: 'center', paddingTop: 30, gap: 8 },
  starters: { gap: 8, marginTop: 16, alignItems: 'center' },
  starter: { borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  starterText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  userBubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.ink, borderRadius: 22, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  userText: { fontFamily: fonts.body, fontSize: 15, color: colors.cream },
  botRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  botBubble: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 22, borderTopLeftRadius: 6, padding: 12 },
  logged: { alignSelf: 'flex-start', backgroundColor: '#E6F3C8', color: colors.oliveDeep, fontFamily: fonts.bold, fontSize: 12, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden' },
  suggest: { backgroundColor: colors.ochre, borderWidth: 2, borderColor: colors.ink, borderRadius: 18, padding: 12 },
  suggestTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  suggestText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink, marginTop: 2 },
  safety: { backgroundColor: '#FFE2C6', borderWidth: 2, borderColor: colors.cherry, borderRadius: 20, padding: 12, gap: 6 },
  safetyTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.cherryDeep },
  safetyText: { fontFamily: fonts.body, fontSize: 14, color: colors.cherryDeep },
  callBtn: { backgroundColor: colors.cherry, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' },
  callText: { fontFamily: fonts.bold, color: colors.white },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginHorizontal: 12, marginBottom: 96, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, borderRadius: 28, padding: 6 },
  input: { flex: 1, maxHeight: 120, minHeight: 42, paddingHorizontal: 12, paddingTop: 10, fontFamily: fonts.body, fontSize: 15, color: colors.ink, outlineWidth: 0 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
