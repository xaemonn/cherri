import { addDays, AFTER_EMERGENCY_PILL, conceptionRisk, ecOptions, pregnancyTestDate, todayIn, type ConceptionRisk } from '@cherri/shared';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, Screen, SectionTitle, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDashboard } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';

const QUICK = [
  { label: 'Just now', hours: 0 },
  { label: '12 h ago', hours: 12 },
  { label: 'Yesterday', hours: 24 },
  { label: '2 days', hours: 48 },
  { label: '3 days', hours: 72 },
  { label: '4 days', hours: 96 },
];

const RISK: Record<ConceptionRisk, { bg: string; fg: string; label: string }> = {
  HIGH: { bg: colors.cherry, fg: colors.cream, label: 'High conception risk' },
  MODERATE: { bg: '#D9AA55', fg: colors.ink, label: 'Moderate conception risk' },
  LOW: { bg: '#4A5A2B', fg: colors.cream, label: 'Lower conception risk' },
};

const fmtLeft = (h: number) => (h <= 0 ? 'Window closed' : h >= 24 ? `${Math.floor(h / 24)} d ${Math.floor(h % 24)} h left` : `${Math.floor(h)} h ${Math.round((h % 1) * 60)} min left`);

/** Emergency contraception triage: risk, a live countdown per option and a 21-day test reminder. */
export default function EcScreen() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const [eventAt, setEventAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [day, setDay] = useState('');
  const [reminded, setReminded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.max(0, (now - eventAt) / 3_600_000);
  const cycle = dashboard.data?.cycle;
  const autoDay = cycle && cycle.day - Math.floor(hours / 24) >= 1 ? cycle.day - Math.floor(hours / 24) : null;
  const cycleDay = day ? Number(day) : autoDay;
  const risk = conceptionRisk({ cycleDay, cycleLength: cycle?.expectedLength ?? 28, irregular: false });
  const today = todayIn(user?.timezone ?? 'Asia/Kolkata');
  const eventDate = addDays(today, -Math.floor(hours / 24));
  const testOn = pregnancyTestDate(eventDate);

  return (
    <Screen bottomInset={60}>
      <T variant="title">Had an accident?</T>
      <T style={{ marginTop: 6 }}>Condom broke or missed a pill? Breathe. Here’s your plan. Nothing here is shared.</T>

      <Card style={{ gap: 10, marginTop: 16 }}>
        <T variant="h3">When did it happen?</T>
        <View style={styles.wrap}>
          {QUICK.map((q) => (
            <Chip key={q.label} label={q.label} selected={Math.round(hours) === q.hours} onPress={() => setEventAt(Date.now() - q.hours * 3_600_000)} />
          ))}
        </View>
        <T variant="h3">Cycle day then</T>
        <TextInput
          keyboardType="number-pad"
          value={day}
          onChangeText={(v) => setDay(v.replace(/\D/g, '').slice(0, 2))}
          placeholder={autoDay ? `Cherri estimates day ${autoDay}` : 'e.g. 12'}
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
        />
      </Card>

      <View style={[styles.risk, { backgroundColor: RISK[risk.risk].bg }]}>
        <Text style={[styles.riskTitle, { color: RISK[risk.risk].fg }]}>{RISK[risk.risk].label}</Text>
        <Text style={[styles.riskText, { color: RISK[risk.risk].fg }]}>{risk.explanation}</Text>
      </View>

      <SectionTitle eyebrow="Your options" title="How long you have" />
      {ecOptions(hours).map((o) => (
        <Card key={o.id} style={{ marginBottom: 10, gap: 6, opacity: o.available ? 1 : 0.6 }}>
          <T variant="h3">{o.name}</T>
          <T variant="small">{o.examples}</T>
          <Text style={styles.left}>{fmtLeft(o.hoursLeft)}</Text>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.min(100, (hours / o.windowHours) * 100)}%` }]} />
          </View>
          <T variant="small">{o.efficacy}</T>
        </Card>
      ))}

      <SectionTitle title="After the pill" />
      <Card tone="periwinkle" style={{ gap: 6 }}>
        {AFTER_EMERGENCY_PILL.map((line) => (
          <T key={line} variant="small">
            • {line}
          </T>
        ))}
      </Card>

      <Card tone="matcha" style={{ gap: 8, marginTop: 14 }}>
        <T variant="h3">Pregnancy test reminder</T>
        <T>A home test is reliable 3 weeks after: {testOn}.</T>
        <Button
          label={reminded ? 'Reminder set' : 'Remind me in Cherri'}
          disabled={reminded}
          onPress={async () => {
            await api.reminders.create({ kind: 'PREGNANCY_TEST', dueOn: testOn });
            setReminded(true);
          }}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { height: 48, borderRadius: 16, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.paper, paddingHorizontal: 14, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  risk: { borderRadius: 24, padding: 18, marginTop: 14 },
  riskTitle: { fontFamily: fonts.display, fontSize: 22 },
  riskText: { fontFamily: fonts.medium, fontSize: 14, marginTop: 6 },
  left: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.creamDeep, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.ink },
});
