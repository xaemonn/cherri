import {
  ApiError,
  CONSULT_CATEGORIES,
  CONSULT_CATEGORY_LABELS,
  CONSULT_STATUS_LABELS,
  detectConsultEmergency,
  EXPECTED_REPLY_TIME,
  SAFETY_GATE_TEXT,
  type ConsultCategory,
  type ConsultEmergency,
} from '@cherri/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmergencyBox } from '@/components/consult';
import { Button, Card, Chip, ErrorText, Loader, Screen, SectionTitle, T } from '@/components/ui';
import { api } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';

/** Ask a verified doctor. Safety box first, the emergency trap while typing, then the snapshot and consent. */
export default function ConsultScreen() {
  const queryClient = useQueryClient();
  const consults = useQuery({ queryKey: ['consults'], queryFn: api.consults.list });
  const [safe, setSafe] = useState(false);
  const [category, setCategory] = useState<ConsultCategory | null>(null);
  const [message, setMessage] = useState('');
  const [review, setReview] = useState(false);
  const [consent, setConsent] = useState(false);
  const [serverEmergency, setServerEmergency] = useState<ConsultEmergency | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = useQuery({ queryKey: ['consultPreview'], queryFn: api.consults.preview, enabled: review });
  const emergency = detectConsultEmergency(message) ?? serverEmergency;

  async function send() {
    if (!category) return;
    setError(null);
    try {
      const created = await api.consults.create({ category, message: message.trim(), consent: true, safetyConfirmed: true });
      await queryClient.invalidateQueries({ queryKey: ['consults'] });
      router.push(`/consult/${created.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMERGENCY_SYMPTOMS') {
        setServerEmergency((e.details as { emergency: ConsultEmergency }).emergency);
        setReview(false);
      } else setError(e instanceof Error ? e.message : 'Could not send.');
    }
  }

  const snap = preview.data;
  return (
    <Screen bottomInset={60}>
      <T variant="title">Consult a doctor</T>
      <T style={{ marginTop: 6 }}>For non-urgent questions. {EXPECTED_REPLY_TIME}</T>

      <Card style={{ gap: 12, marginTop: 16 }}>
        <Pressable onPress={() => setSafe(!safe)} style={[styles.gate, { borderColor: safe ? '#4A5A2B' : colors.cherry }]}>
          <Text style={styles.box}>{safe ? '' : ''}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.gateTitle}>Safety check (required)</Text>
            <T variant="small">{SAFETY_GATE_TEXT}</T>
          </View>
        </Pressable>
        {safe && (
          <View style={styles.wrap}>
            {CONSULT_CATEGORIES.map((c) => (
              <Chip key={c} label={CONSULT_CATEGORY_LABELS[c].label} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>
        )}
        {safe && category && (
          <>
            <TextInput
              multiline
              value={message}
              onChangeText={(v) => {
                setMessage(v);
                setServerEmergency(null);
              }}
              placeholder="English or Hinglish, e.g. “Period 12 din late hai”"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
            />
            {emergency && <EmergencyBox emergency={emergency} />}
            {!review && <Button label="Review & share" disabled={!message.trim() || Boolean(emergency)} onPress={() => setReview(true)} />}
          </>
        )}
        {review && (
          <>
            <T variant="h3">Your clinical snapshot (last 90 days)</T>
            {preview.isPending ? (
              <Loader />
            ) : snap ? (
              <View style={{ gap: 4 }}>
                {snap.cycle && <T variant="small">Cycle: {snap.cycle.averageCycleLength ?? '—'} days avg, {snap.cycle.regularity.toLowerCase()}</T>}
                {snap.bloodLoss && <T variant="small">PBAC: {snap.bloodLoss.score} points{snap.bloodLoss.heavy ? ' (heavy)' : ''}</T>}
                {snap.labs.filter((l) => l.flag === 'LOW' || l.flag === 'HIGH').map((l) => (
                  <T key={l.name} variant="small">
                    Lab: {l.name} {l.value} {l.unit} ({l.flag.toLowerCase()})
                  </T>
                ))}
                {snap.medications.length > 0 && <T variant="small">Medicines: {snap.medications.map((m) => m.name).join(', ')}</T>}
                {snap.symptoms.slice(0, 4).map((s) => (
                  <T key={s.label} variant="small">
                    Symptom: {s.label}, {s.days} days
                  </T>
                ))}
              </View>
            ) : null}
            <Pressable onPress={() => setConsent(!consent)} style={styles.consent}>
              <Text style={styles.box}>{consent ? '' : ''}</Text>
              <T style={{ flex: 1 }}>I agree to share this snapshot with a verified Cherri doctor.</T>
            </Pressable>
            {error && <ErrorText error={new Error(error)} />}
            <Button label="Send to a doctor" variant="lime" disabled={!consent} onPress={() => void send()} />
          </>
        )}
      </Card>

      <SectionTitle eyebrow="History" title="Your consultations" />
      {consults.data?.length === 0 && <T variant="small">No consultations yet.</T>}
      {consults.data?.map((c) => (
        <Pressable key={c.id} onPress={() => router.push(`/consult/${c.id}`)}>
          <Card style={{ marginBottom: 10 }}>
            <T variant="h3">
              {CONSULT_CATEGORY_LABELS[c.category].label}
            </T>
            <T variant="small">
              {CONSULT_STATUS_LABELS[c.status]} · {c.doctor?.name ?? 'Waiting for a doctor'}
            </T>
            {c.lastMessage && <T numberOfLines={2}>{c.lastMessage.preview}</T>}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gate: { flexDirection: 'row', gap: 10, borderWidth: 2, borderRadius: 18, padding: 12 },
  gateTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  box: { fontSize: 22, color: colors.ink },
  consent: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  input: { minHeight: 110, borderRadius: 16, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, padding: 14, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, textAlignVertical: 'top' },
});
