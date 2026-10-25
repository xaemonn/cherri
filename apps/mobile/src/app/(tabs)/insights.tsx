import { phaseColors, PHASE_GUIDES } from '@cherri/shared';
import { StyleSheet, Text, View } from 'react-native';
import { FlagCard, PatternCard } from '@/components/insight-cards';
import { Card, ErrorText, Loader, Screen, SectionTitle, T } from '@/components/ui';
import { useInsights } from '@/lib/queries';
import { colors, fonts } from '@/lib/theme';

function Stat({ label, value, hint, bg }: { label: string; value: string; hint?: string; bg: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {hint && <Text style={styles.statHint}>{hint}</Text>}
    </View>
  );
}

export default function Insights() {
  const { data, isLoading, error } = useInsights();
  if (isLoading) return <Screen><Loader label="Running Pattern Radar…" /></Screen>;
  if (error || !data) return <Screen><ErrorText error={error} /></Screen>;

  const { stats, patterns, redFlags, symptoms } = data;
  const maxDays = Math.max(1, ...symptoms.map((s) => s.days));

  return (
    <Screen>
      <T variant="eyebrow">Insights</T>
      <T variant="title">Your patterns, decoded</T>
      <View style={styles.stats}>
        <Stat label="Avg cycle" value={stats?.avgCycleLength ? `${Math.round(stats.avgCycleLength)}d` : '—'} hint={stats ? `${stats.completedCycles} cycles` : undefined} bg="#FFE2C6" />
        <Stat label="Regularity" value={!stats || stats.regularity === 'UNKNOWN' ? '—' : stats.regularity === 'REGULAR' ? 'Regular' : 'Irregular'} hint={stats?.variability != null ? `±${stats.variability} days` : undefined} bg="#E6F3C8" />
        <Stat label="Avg period" value={stats?.avgPeriodLength ? `${stats.avgPeriodLength}d` : '—'} bg="#FFEFC2" />
        <Stat label="Range" value={stats?.shortestCycle ? `${stats.shortestCycle}–${stats.longestCycle}` : '—'} hint="days" bg="#E1E4FF" />
      </View>

      <SectionTitle eyebrow="Pattern Radar" title="Symptoms that follow your cycle" />
      {!patterns.ready ? (
        <Card tone="cream">
          <T variant="small">
            Pattern Radar switches on after about two cycles of logs
            {patterns.needs?.cycles ? `: ${patterns.needs.cycles} more cycle${patterns.needs.cycles > 1 ? 's' : ''} to go` : ''}.
          </T>
        </Card>
      ) : patterns.patterns.length === 0 ? (
        <Card tone="sage">
          <T variant="small">No clear cycle patterns right now. That’s good news. Cherri keeps checking.</T>
        </Card>
      ) : (
        patterns.patterns.map((p) => <PatternCard key={`${p.feature}-${p.window}`} pattern={p} />)
      )}

      {redFlags.length > 0 && <SectionTitle eyebrow="Worth a look" title="Flags for your doctor" />}
      {redFlags.map((flag) => (
        <FlagCard key={flag.code} flag={flag} />
      ))}

      {symptoms.length > 0 && (
        <>
          <SectionTitle eyebrow="Last 90 days" title="What you logged most" />
          <Card style={{ gap: 10 }}>
            {symptoms.slice(0, 8).map((s) => (
              <View key={s.code} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.symptom}>{s.label}</Text>
                  <Text style={styles.symptomDays}>
                    {s.days} days{s.peakPhase ? ` · peaks ${PHASE_GUIDES[s.peakPhase].name.toLowerCase()}` : ''}
                  </Text>
                </View>
                <View style={styles.bar}>
                  <View style={{ width: `${(s.days / maxDays) * 100}%`, height: '100%', borderRadius: 6, backgroundColor: s.peakPhase ? phaseColors[s.peakPhase].fill : colors.inkFaint }} />
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  stat: { width: '48%', flexGrow: 1, borderRadius: 22, padding: 14 },
  statLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, marginTop: 2 },
  statHint: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  symptom: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  symptomDays: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  bar: { height: 12, borderRadius: 6, backgroundColor: colors.creamDeep, overflow: 'hidden' },
});
