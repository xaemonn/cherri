import { formatDay, labFlagStyles, type LabReportDto } from '@cherri/shared';
import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { CherryMark } from '@/components/cherry';
import { Button, Card, ErrorText, Loader, Pill, Screen, SectionTitle, T } from '@/components/ui';
import { api } from '@/lib/api';
import { formWithFile } from '@/lib/files';
import { keys, useInvalidateHealth, useLabs } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';

function ReportCard({ report }: { report: LabReportDto }) {
  return (
    <Card style={{ gap: 10, marginBottom: 12 }}>
      <T variant="eyebrow">{formatDay(report.takenAt, { year: true })}</T>
      <T variant="h3">{report.labName ?? 'Lab report'}</T>
      <T variant="small">{report.summary}</T>
      {report.highlights.map((r) => (
        <View key={r.id} style={[styles.highlight, { backgroundColor: labFlagStyles[r.flag].bg }]}>
          <Text style={[styles.highlightTitle, { color: labFlagStyles[r.flag].ink }]}>
            {r.name}: {r.value} {r.unit ?? ''} ({labFlagStyles[r.flag].label})
          </Text>
          <Text style={[styles.highlightText, { color: labFlagStyles[r.flag].ink }]}>{r.explanation}</Text>
        </View>
      ))}
      {report.results
        .filter((r) => r.flag === 'NORMAL')
        .map((r) => (
          <View key={r.id} style={styles.normalRow}>
            <Text style={styles.normalName}>{r.name}</Text>
            <Pill label={`${r.value} ${r.unit ?? ''}`} bg="#E6F3C8" fg={colors.oliveDeep} />
          </View>
        ))}
    </Card>
  );
}

export default function Labs() {
  const labs = useLabs();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateHealth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function upload(uri: string, name: string) {
    setUploading(true);
    setError(null);
    try {
      const report = await api.labs.upload(await formWithFile('file', uri, name));
      Alert.alert('Decoded', report.summary);
      await Promise.all([queryClient.invalidateQueries({ queryKey: keys.labs }), invalidate()]);
    } catch (e) {
      setError(e);
    } finally {
      setUploading(false);
    }
  }

  async function fromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert('Camera permission is needed to snap your report.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) await upload(result.assets[0].uri, result.assets[0].fileName ?? 'report.jpg');
  }

  async function fromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) await upload(result.assets[0].uri, result.assets[0].fileName ?? 'report.jpg');
  }

  async function fromFiles() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) await upload(result.assets[0].uri, result.assets[0].name);
  }

  return (
    <Screen bottomInset={40}>
      <T variant="title">Blood report? Let’s decode it.</T>
      <T variant="small" style={{ marginTop: 6 }}>
        Cherri reads every value, flags what’s off and explains it simply. Your file is thrown away after reading. Only the numbers are kept.
      </T>
      <Card sticker tone="sunshine" style={{ marginTop: 18, gap: 10, alignItems: 'stretch' }}>
        {uploading ? (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
            <CherryMark size={60} />
            <T variant="h3">Decoding your report…</T>
          </View>
        ) : (
          <>
            <Button label="Snap a photo" onPress={() => void fromCamera()} />
            <Button label="Choose from gallery" variant="outline" onPress={() => void fromGallery()} />
            <Button label="Upload a PDF" variant="outline" onPress={() => void fromFiles()} />
          </>
        )}
      </Card>
      {error !== null && <ErrorText error={error} />}
      <SectionTitle eyebrow="Your reports" title="Decoded reports" />
      {labs.isLoading ? <Loader /> : labs.data?.length ? labs.data.map((r) => <ReportCard key={r.id} report={r} />) : <T variant="small">No reports yet.</T>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  highlight: { borderRadius: 16, padding: 12 },
  highlightTitle: { fontFamily: fonts.bold, fontSize: 14 },
  highlightText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 2 },
  normalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  normalName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
});
