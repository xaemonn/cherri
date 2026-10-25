import type { ShareCreated } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Screen, SectionTitle, T } from '@/components/ui';
import { api } from '@/lib/api';
import { keys, useShares } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';

const DURATIONS = [
  { hours: 1, label: '1 hour' },
  { hours: 24, label: '24 hours' },
  { hours: 168, label: '7 days' },
];

export default function Report() {
  const shares = useShares();
  const queryClient = useQueryClient();
  const [hours, setHours] = useState(24);
  const [created, setCreated] = useState<ShareCreated | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      setCreated(await api.reports.create({ expiresInHours: hours, rangeDays: 180, includeNotes: true }));
      void queryClient.invalidateQueries({ queryKey: keys.shares });
    } catch (error) {
      Alert.alert('Could not create link', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen bottomInset={40}>
      <T variant="title">Walk in with evidence</T>
      <T variant="small" style={{ marginTop: 6 }}>
        Your doctor scans a QR code and sees one clinical page: cycle stats, pain, patterns, flags, labs and your questions. No app needed, and the link expires on its own.
      </T>

      <Card sticker tone="sunshine" style={{ marginTop: 18, gap: 12 }}>
        <T variant="h3">Link works for</T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {DURATIONS.map((d) => (
            <Chip key={d.hours} label={d.label} selected={hours === d.hours} onPress={() => setHours(d.hours)} />
          ))}
        </View>
        <Button label={busy ? 'Creating…' : 'Create QR link'} onPress={() => void create()} loading={busy} />
      </Card>

      {created && (
        <Card style={{ marginTop: 16, alignItems: 'center', gap: 10 }}>
          <Image source={{ uri: created.qrCode }} style={styles.qr} contentFit="contain" />
          <T variant="h3">Show this to your doctor</T>
          <T variant="small" style={{ textAlign: 'center' }}>
            {created.url}
          </T>
          <Button label="Share link" variant="outline" onPress={() => void Share.share({ message: `My Cherri health summary: ${created.url}` })} />
        </Card>
      )}

      {created?.report && (
        <>
          <SectionTitle eyebrow="Preview" title="What your doctor sees" />
          <Card style={{ gap: 6 }}>
            <Text style={styles.line}>
              <Text style={styles.bold}>Cycle: </Text>
              {created.report.cycle?.averageCycleLength ?? '—'} d avg · {created.report.cycle?.regularity.toLowerCase() ?? '—'}
            </Text>
            <Text style={styles.line}>
              <Text style={styles.bold}>Pain: </Text>
              avg {created.report.pain.averageDuringPeriod ?? '—'}/10 during periods, max {created.report.pain.maximum ?? '—'}/10
            </Text>
            {created.report.redFlags.slice(0, 4).map((f) => (
              <Text key={f.title} style={styles.line}>
                ⚠️ {f.title}
              </Text>
            ))}
            {created.report.questionsToAsk.slice(0, 3).map((q) => (
              <Text key={q} style={styles.line}>
                ❓ {q}
              </Text>
            ))}
          </Card>
        </>
      )}

      {shares.data && shares.data.length > 0 && (
        <>
          <SectionTitle eyebrow="Your links" title="Shared reports" />
          {shares.data.slice(0, 5).map((s) => (
            <View key={s.id} style={styles.shareRow}>
              <Text style={styles.line}>
                {s.active ? `Active · ${s.viewCount} views` : s.revokedAt ? 'Turned off' : 'Expired'}
              </Text>
              {s.active && (
                <Button
                  label="Turn off"
                  variant="ghost"
                  onPress={async () => {
                    await api.reports.revoke(s.id);
                    void queryClient.invalidateQueries({ queryKey: keys.shares });
                  }}
                />
              )}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  qr: { width: 220, height: 220, borderRadius: 16, borderWidth: 2, borderColor: colors.ink },
  line: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink },
  bold: { fontFamily: fonts.bold },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.paper, borderRadius: 18, paddingLeft: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.line },
});
