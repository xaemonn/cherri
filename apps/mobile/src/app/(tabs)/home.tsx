import { firstName, formatDay, greeting, moodScale, phaseColors, relativeDay, SCREENINGS } from '@cherri/shared';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CycleWheel } from '@/components/cycle-wheel';
import { FlagCard, PatternCard } from '@/components/insight-cards';
import { TalkToLog } from '@/components/talk-to-log';
import { Button, Card, ErrorText, Loader, Screen, SectionTitle, Sticker, T, tap } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDashboard, useInvalidateHealth, useSaveLog } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';

export default function Home() {
  const { user, setUser } = useAuth();
  const { data, isLoading, error, refetch } = useDashboard();
  const invalidate = useInvalidateHealth();
  const save = useSaveLog(data?.today ?? '');
  const [hour] = useState(() => new Date().getHours());
  const [toast, setToast] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);

  if (isLoading) return <Screen><Loader label="Reading your cycle…" /></Screen>;
  if (error || !data) return <Screen><ErrorText error={error} /><Button label="Try again" onPress={() => void refetch()} /></Screen>;

  const cycle = data.cycle;
  const name = firstName(data.user.name ?? user?.name);
  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <Screen>
      <T variant="small">{formatDay(data.today, { weekday: true })}</T>
      <T variant="title">
        {greeting(hour)}
        {name ? `, ${name}` : ''} {hour < 17 ? '☀️' : '🌙'}
      </T>
      {data.streak > 0 && (
        <Sticker radius={999} offset={3} style={{ alignSelf: 'flex-start', marginTop: 12 }}>
          <View style={styles.streak}>
            <Ionicons name="flame" size={16} color={colors.ink} />
            <Text style={styles.streakText}>{data.streak}-day streak</Text>
          </View>
        </Sticker>
      )}

      {cycle ? (
        <View style={{ marginTop: 18 }}>
          <Card sticker>
            <CycleWheel day={cycle.day} cycleLength={cycle.expectedLength} periodLength={cycle.periodLength} size={230}>
              <T variant="eyebrow">Day</T>
              <Text style={styles.day}>{cycle.day}</Text>
              <Text style={[styles.vibe, { color: phaseColors[cycle.phase].ink }]}>
                {cycle.guide.emoji} {cycle.guide.vibe}
              </Text>
            </CycleWheel>
            <T variant="h2" style={{ marginTop: 14 }}>
              {cycle.guide.description}
            </T>
            {cycle.nextPeriod && (
              <View style={styles.row}>
                <View style={[styles.tile, { backgroundColor: '#FFE2C6' }]}>
                  <Text style={[styles.tileLabel, { color: colors.cherryDeep }]}>{cycle.nextPeriod.isLate ? 'Late by' : 'Next period'}</Text>
                  <Text style={[styles.tileValue, { color: colors.cherryDeep }]}>
                    {cycle.nextPeriod.isLate ? `${cycle.nextPeriod.daysLate} days` : relativeDay(cycle.nextPeriod.date, data.today)}
                  </Text>
                </View>
                <View style={[styles.tile, { backgroundColor: '#FFEFC2' }]}>
                  <Text style={[styles.tileLabel, { color: colors.ochreDeep }]}>Fertile</Text>
                  <Text style={[styles.tileValue, { color: colors.ochreDeep }]}>
                    {formatDay(cycle.fertileWindow.start)}–{formatDay(cycle.fertileWindow.end).split(' ')[0]}
                  </Text>
                </View>
              </View>
            )}
            <T variant="small" style={{ marginTop: 10 }}>
              ✨ {cycle.confidenceNote}
            </T>
          </Card>
        </View>
      ) : data.motherhood || data.user.lifeStage === 'PREGNANCY' || data.user.lifeStage === 'POSTPARTUM' ? (
        <Pressable onPress={() => router.push('/pregnancy')} style={{ marginTop: 18 }}>
          <Card sticker tone="matcha" style={{ gap: 8 }}>
            {data.motherhood?.stage === 'PREGNANCY' ? (
              <>
                <T variant="eyebrow">Trimester {data.motherhood.age.trimester}</T>
                <Text style={styles.day}>{data.motherhood.age.weeks} weeks</Text>
                {data.motherhood.baby && <T variant="h3">{data.motherhood.baby.emoji} About the size of {data.motherhood.baby.name}</T>}
                <T variant="small">{data.motherhood.age.daysToGo} days to go</T>
              </>
            ) : data.motherhood?.stage === 'POSTPARTUM' ? (
              <>
                <T variant="eyebrow">After birth</T>
                <Text style={styles.day}>Week {data.motherhood.age.weeks + 1}</Text>
              </>
            ) : (
              <T variant="h2">Add your due date to unlock your weekly care plan 🤰</T>
            )}
            <T variant="small" style={{ fontFamily: fonts.bold, color: colors.ink }}>
              Open care plan & danger-sign check →
            </T>
          </Card>
        </Pressable>
      ) : (
        <Card tone="matcha" style={{ marginTop: 18, gap: 10 }}>
          <T variant="h2">Let’s find your rhythm 🌙</T>
          <T variant="small">Log your period when it starts and Cherri will start predicting.</T>
          <Button label="Log today" onPress={() => router.push('/log')} />
          {user?.isGuest && (
            <Button
              label={loadingDemo ? 'Loading…' : 'Try with demo data'}
              variant="outline"
              loading={loadingDemo}
              onPress={async () => {
                setLoadingDemo(true);
                try {
                  await api.demo.load();
                  setUser(await api.me.get());
                  await invalidate();
                } finally {
                  setLoadingDemo(false);
                }
              }}
            />
          )}
        </Card>
      )}

      <Card tone="periwinkle" style={{ marginTop: 18, gap: 12 }}>
        <T variant="eyebrow">Daily check-in</T>
        <T variant="h2">How are you feeling?</T>
        <View style={styles.moods}>
          {moodScale.map((m) => (
            <Pressable
              key={m.value}
              onPress={() => {
                tap();
                save.mutate({ mood: m.value }, { onSuccess: () => flash(`Mood saved: ${m.label} ${m.emoji}`) });
              }}
              style={[styles.mood, data.todayLog?.mood === m.value && styles.moodSelected]}
            >
              <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
              <Text style={styles.moodLabel}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
        <TalkToLog onLogged={(summary) => flash(`Logged ${summary} ✅`)} />
        {toast && <Text style={styles.toast}>{toast}</Text>}
      </Card>

      {data.suggestions.length > 0 && <SectionTitle eyebrow="For you" title="Next steps" />}
      {data.suggestions.map((s) => (
        <Pressable
          key={`${s.type}-${s.screening ?? ''}`}
          onPress={() =>
            router.push(
              s.type === 'SCREENING' ? `/checks/${s.screening}` : s.type === 'UPLOAD_LABS' ? '/labs' : s.type === 'DANGER_CHECK' ? '/pregnancy' : s.type === 'VISIT_PREP' ? '/report' : '/log',
            )
          }
          style={styles.suggestion}
        >
          <Text style={{ fontSize: 26 }}>
            {s.type === 'SCREENING' ? '🩺' : s.type === 'UPLOAD_LABS' ? '🧪' : s.type === 'DANGER_CHECK' ? '🚨' : s.type === 'LOG_BP' ? '💓' : s.type === 'VISIT_PREP' ? '📋' : '✍️'}
          </Text>
          <View style={{ flex: 1 }}>
            <T variant="h3">{s.type === 'SCREENING' && s.screening ? `Take the ${SCREENINGS[s.screening].title}` : s.title}</T>
            <T variant="small" numberOfLines={2}>
              {s.reason}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </Pressable>
      ))}

      {data.redFlags.length > 0 && <SectionTitle eyebrow="Worth a look" title="Raise with a doctor" />}
      {data.redFlags.map((flag) => (
        <FlagCard key={flag.code} flag={flag} />
      ))}

      {data.patterns.length > 0 && <SectionTitle eyebrow="Pattern Radar" title="What keeps repeating" />}
      {data.patterns.map((p) => (
        <PatternCard key={`${p.feature}-${p.window}`} pattern={p} />
      ))}

      {cycle && (
        <>
          <SectionTitle eyebrow={`${cycle.guide.emoji} ${cycle.guide.vibe}`} title="Little things for this phase" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 18 }}>
            {cycle.guide.tips.map((tip) => (
              <Card key={tip.text} style={{ width: 240 }}>
                <T style={{ fontFamily: fonts.semibold }}>{tip.text}</T>
                <T variant="small" style={{ marginTop: 8 }}>
                  {tip.evidence === 'STRONG' ? '●●●● Strong evidence' : tip.evidence === 'MODERATE' ? '●●●○ Moderate evidence' : tip.evidence === 'EMERGING' ? '●●○○ Emerging evidence' : '●○○○ Just a trend'}
                </T>
              </Card>
            ))}
          </ScrollView>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.clay, borderWidth: 2, borderColor: colors.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  streakText: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  day: { fontFamily: fonts.display, fontSize: 52, lineHeight: 56, color: colors.ink },
  vibe: { fontFamily: fonts.bold, fontSize: 13, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  tile: { flex: 1, borderRadius: 20, padding: 12 },
  tileLabel: { fontFamily: fonts.bold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  tileValue: { fontFamily: fonts.display, fontSize: 19, marginTop: 2 },
  moods: { flexDirection: 'row', justifyContent: 'space-between' },
  mood: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 18, flex: 1 },
  moodSelected: { backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink },
  moodLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink, marginTop: 2 },
  toast: { fontFamily: fonts.bold, fontSize: 13, color: colors.oliveDeep, textAlign: 'center' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.ink, borderRadius: 24, padding: 14, marginBottom: 10 },
});
