import { ApiError, CONSULT_STATUS_LABELS, detectConsultEmergency, INDIA_HELPLINES, type ConsultEmergency } from '@cherri/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { EmergencyBox } from '@/components/consult';
import { Button, Card, ErrorText, Loader, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';

const PAUSED: ConsultEmergency = {
  kind: 'MEDICAL',
  title: 'CRITICAL SYMPTOMS DETECTED',
  message: 'This requires immediate physical emergency care. Do not wait for a chat reply. Call 112 / 108 or go to the nearest emergency room immediately.',
  helplines: INDIA_HELPLINES.filter((h) => ['112', '108'].includes(h.number)),
};

export default function ConsultThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const consult = useQuery({ queryKey: ['consult', id], queryFn: () => api.consults.get(id), refetchInterval: 20_000 });
  const [body, setBody] = useState('');
  const [alert, setAlert] = useState<ConsultEmergency | null>(null);

  if (consult.isPending) return <Screen><Loader /></Screen>;
  if (consult.error) return <Screen><ErrorText error={consult.error} /></Screen>;
  const c = consult.data;
  const typed = detectConsultEmergency(body);
  const shown = alert ?? typed ?? (c.frozen ? PAUSED : null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['consult', id] });

  return (
    <Screen bottomInset={60}>
      <T variant="eyebrow">{CONSULT_STATUS_LABELS[c.status]}</T>
      <T variant="h2">{c.doctor ? `${c.doctor.name} ✓` : 'Waiting for a doctor (4–12 h)'}</T>
      <View style={{ gap: 10, marginTop: 14 }}>
        {c.messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.sender === 'PATIENT' ? styles.mine : m.sender === 'SYSTEM' ? styles.system : styles.theirs,
              m.kind === 'EMERGENCY' && { backgroundColor: '#FEE4E2' },
              m.kind === 'IN_PERSON' && { backgroundColor: '#FFEFC2', borderColor: '#D9AA55', borderWidth: 2 },
            ]}
          >
            {m.kind === 'IN_PERSON' && <Text style={styles.label}>In-person visit recommended</Text>}
            <Text style={[styles.text, m.sender === 'PATIENT' && { color: colors.cream }]}>{m.body}</Text>
            {m.tests.length > 0 && <Text style={styles.label}>{m.tests.join(' · ')}</Text>}
          </View>
        ))}
      </View>
      {shown && (
        <View style={{ marginTop: 14 }}>
          <EmergencyBox
            emergency={shown}
            onAcknowledge={
              c.frozen
                ? async () => {
                    await api.consults.acknowledgeEmergency(id);
                    setAlert(null);
                    await refresh();
                  }
                : undefined
            }
          />
        </View>
      )}
      {c.status !== 'RESOLVED' && !c.frozen && (
        <Card style={{ marginTop: 14, gap: 8 }}>
          <TextInput multiline value={body} onChangeText={setBody} placeholder="Add a follow-up…" placeholderTextColor={colors.inkFaint} style={styles.input} />
          <Button
            label="Send"
            disabled={!body.trim() || Boolean(typed)}
            onPress={async () => {
              try {
                await api.consults.send(id, { body: body.trim() });
                setBody('');
              } catch (e) {
                if (e instanceof ApiError && e.code === 'EMERGENCY_SYMPTOMS') setAlert((e.details as { emergency: ConsultEmergency }).emergency);
              }
              await refresh();
            }}
          />
        </Card>
      )}
      {c.status === 'RESOLVED' && <T style={{ marginTop: 14 }}>This consultation is resolved and saved here.</T>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: { borderRadius: 20, padding: 12, maxWidth: '88%' },
  mine: { alignSelf: 'flex-end', backgroundColor: '#4A5A2B' },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  system: { alignSelf: 'center', backgroundColor: colors.creamDeep },
  text: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, marginVertical: 2 },
  input: { minHeight: 70, borderRadius: 16, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, padding: 12, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, textAlignVertical: 'top' },
});
