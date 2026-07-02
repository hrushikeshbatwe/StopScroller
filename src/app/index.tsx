import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrainMeter } from '@/components/brain-meter';
import { Palette, brainStateFor } from '@/constants/palette';
import { useScrollTracker } from '@/hooks/use-scroll-tracker';

export default function HomeScreen() {
  const { count, health } = useScrollTracker();
  const state = brainStateFor(count);
  const needsSetup = !health?.accessibilityEnabled;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>StopScroller</Text>
            <Text style={styles.tagline}>Know your count. Stop in time.</Text>
          </View>
          <Link href="/settings" asChild>
            <Pressable hitSlop={12} style={styles.gear}>
              <Text style={styles.gearIcon}>⚙️</Text>
            </Pressable>
          </Link>
        </View>

        {/* setup warning */}
        {needsSetup && (
          <Link href="/settings" asChild>
            <Pressable style={styles.warnBanner}>
              <Text style={styles.warnTitle}>⚠️  Tracking is off</Text>
              <Text style={styles.warnText}>
                Enable the accessibility service so StopScroller can count your reels. Tap to set up →
              </Text>
            </Pressable>
          </Link>
        )}

        {/* the brain */}
        <View style={styles.meterWrap}>
          <BrainMeter count={count} />
        </View>

        {/* status card */}
        <View style={[styles.statusCard, { borderColor: state.color + '55' }]}>
          <View style={[styles.dot, { backgroundColor: state.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: state.color }]}>{state.label}</Text>
            <Text style={styles.statusBlurb}>{state.blurb}</Text>
          </View>
        </View>

        {/* footer hint */}
        <Text style={styles.footer}>
          {health?.accessibilityEnabled
            ? 'Open Instagram Reels or YouTube Shorts — your count climbs live.'
            : 'Setup takes 30 seconds.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.bg },
  content: { padding: 20, gap: 24, flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontSize: 26, fontWeight: '800', color: Palette.text, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: Palette.textDim, marginTop: 2 },
  gear: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: { fontSize: 20 },
  warnBanner: {
    backgroundColor: '#2A1A0A',
    borderColor: Palette.warning + '66',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  warnTitle: { color: Palette.warning, fontWeight: '700', fontSize: 15 },
  warnText: { color: Palette.textDim, fontSize: 13, lineHeight: 18 },
  meterWrap: { alignItems: 'center', marginTop: 8 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Palette.bgCard,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusLabel: { fontSize: 17, fontWeight: '700' },
  statusBlurb: { fontSize: 13, color: Palette.textDim, marginTop: 2 },
  footer: {
    textAlign: 'center',
    color: Palette.textFaint,
    fontSize: 12,
    marginTop: 'auto',
    paddingTop: 12,
  },
});
