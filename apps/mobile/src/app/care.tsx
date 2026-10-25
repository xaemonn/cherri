import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Loader, Screen, SectionTitle, T } from '@/components/ui';
import { useHelp } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';

export default function Care() {
  const help = useHelp();
  return (
    <Screen bottomInset={40}>
      <T variant="title">Help is closer than you think</T>
      <Card sticker tone="matcha" style={{ marginTop: 16, gap: 10 }}>
        <T variant="h3">Gynaecologists near you</T>
        <T variant="small">Opens your maps app with women’s health clinics around you.</T>
        <Button label="📍 Find nearby" onPress={() => void Linking.openURL('https://www.google.com/maps/search/gynaecologist+near+me')} />
      </Card>

      <SectionTitle eyebrow="Free & government" title="Care that costs nothing" />
      {help.isLoading ? (
        <Loader />
      ) : (
        help.data?.resources.map((r) => (
          <Pressable key={r.name} onPress={() => void Linking.openURL(r.url)} style={styles.resource}>
            <Text style={styles.resourceTitle}>{r.name} ↗</Text>
            <Text style={styles.resourceText}>{r.description}</Text>
          </Pressable>
        ))
      )}

      <SectionTitle eyebrow="24×7" title="Helplines" />
      <View style={styles.grid}>
        {help.data?.helplines.map((h) => (
          <Pressable key={h.number} onPress={() => void Linking.openURL(`tel:${h.number}`)} style={styles.helpline}>
            <Text style={styles.number}>{h.number}</Text>
            <Text style={styles.helplineName}>{h.name}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  resource: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 14, marginBottom: 10 },
  resourceTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  resourceText: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  helpline: { width: '48%', flexGrow: 1, backgroundColor: colors.ochre, borderWidth: 2, borderColor: colors.ink, borderRadius: 22, padding: 14 },
  number: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  helplineName: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
});
