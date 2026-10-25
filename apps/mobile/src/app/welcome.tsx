import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CherryMark } from '@/components/cherry';
import { Button, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

export default function Welcome() {
  const { continueAsGuest } = useAuth();
  const [busy, setBusy] = useState(false);

  async function startAsGuest() {
    setBusy(true);
    try {
      await continueAsGuest();
      router.replace('/onboarding');
    } catch (error) {
      Alert.alert('Could not connect', `${error instanceof Error ? error.message : 'Unknown error'}\n\nIs the Cherri API running on your laptop?`);
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.blobA} />
      <View style={styles.blobB} />
      <View style={styles.top}>
        <View style={styles.badge}>
          <CherryMark size={20} />
          <Text style={styles.badgeText}>Women’s health, made for India</Text>
        </View>
      </View>
      <View style={styles.hero}>
        <CherryMark size={110} wink />
        <Text style={styles.headline}>YOUR BODY,</Text>
        <View style={styles.decodedBox}>
          <Text style={styles.decoded}>DECODED.</Text>
        </View>
        <T style={styles.sub}>Track your cycle, log symptoms in Hinglish, decode lab reports and take real evidence to your doctor.</T>
      </View>
      <View style={styles.actions}>
        <Button label={busy ? 'Setting up…' : 'Start free, no email needed'} variant="lime" onPress={() => void startAsGuest()} loading={busy} />
        <Button label="I have an account" variant="outline" onPress={() => router.push('/login')} />
        <T variant="small" style={{ textAlign: 'center' }}>
          No ads. Encrypted. Delete everything anytime.
        </T>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 22, overflow: 'hidden' },
  blobA: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: colors.dusk, top: 90, right: -110, opacity: 0.8 },
  blobB: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: colors.ochre, bottom: 150, left: -120, opacity: 0.8 },
  top: { paddingTop: 12, alignItems: 'flex-start' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.paper },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.ink },
  hero: { flex: 1, justifyContent: 'center', gap: 6 },
  headline: { fontFamily: fonts.display, fontSize: 52, lineHeight: 52, color: colors.ink, marginTop: 18 },
  decodedBox: { alignSelf: 'flex-start', backgroundColor: colors.ink, borderRadius: 16, paddingHorizontal: 14, paddingBottom: 4, transform: [{ rotate: '-2deg' }] },
  decoded: { fontFamily: fonts.display, fontSize: 52, lineHeight: 58, color: colors.olive },
  sub: { marginTop: 14, color: colors.inkSoft, fontSize: 17, lineHeight: 25 },
  actions: { gap: 12, paddingBottom: 18 },
});
