import type { LifeStage } from '@cherri/shared';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

const ITEMS: Array<{ href: string; title: string; text: string; icon: ComponentProps<typeof Ionicons>['name']; bg: string; stages?: LifeStage[] }> = [
  { href: '/pregnancy', title: 'Pregnancy & baby', text: 'Week by week, danger-sign check, free schemes', icon: 'heart-circle-outline', bg: '#E6F3C8', stages: ['PREGNANCY', 'POSTPARTUM'] },
  { href: '/labs', title: 'Lab decoder', text: 'Snap a blood report, get plain-language answers', icon: 'flask-outline', bg: '#FFE7C2' },
  { href: '/checks', title: 'Health checks', text: 'PCOS, endometriosis, PMDD, anaemia, thyroid', icon: 'clipboard-outline', bg: '#E6F3C8' },
  { href: '/report', title: 'Doctor report', text: 'One clinical page, shared by QR', icon: 'qr-code-outline', bg: '#FFEFC2' },
  { href: '/learn', title: 'Learn & myths', text: 'Myth or fact? Plus trusted guides', icon: 'book-outline', bg: '#E1E4FF' },
  { href: '/care', title: 'Find care', text: 'Doctors near you, free govt care, helplines', icon: 'location-outline', bg: '#DCEFE0' },
  { href: '/safety', title: 'Safety & SOS', text: 'Message your trusted people, helplines', icon: 'shield-checkmark-outline', bg: '#FFE2C6' },
  { href: '/settings', title: 'Settings', text: 'Profile, privacy, data export', icon: 'settings-outline', bg: colors.creamDeep },
];

export default function More() {
  const { user } = useAuth();
  return (
    <Screen>
      <T variant="title">More</T>
      <View style={{ gap: 12, marginTop: 16 }}>
        {ITEMS.filter((item) => !item.stages || (user && item.stages.includes(user.lifeStage))).map((item) => (
          <Pressable key={item.href} onPress={() => router.push(item.href)} style={styles.item}>
            <View style={[styles.icon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={24} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.text}>{item.text}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.ink} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, borderRadius: 24, padding: 14 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  text: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
});
