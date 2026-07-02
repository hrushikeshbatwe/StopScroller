import { Link } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrainMeter } from '@/components/brain-meter';
import { Elevation, Palette, Radius, Space, Type, brainStateFor, tint } from '@/constants/palette';
import { useScrollTracker } from '@/hooks/use-scroll-tracker';

const CAP_OFF = 100000; // native "no cap set" sentinel

export default function HomeScreen() {
  const { count, health, cap, bestLow } = useScrollTracker();
  const state = brainStateFor(count);
  const needsSetup = !health?.accessibilityEnabled;

  // Soft entrance — fade + rise, no bounce (skill §5).
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);
  const rise = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };

  const capLabel = cap && cap < CAP_OFF ? String(cap) : 'Off';
  const bestLabel = bestLow >= 0 ? String(bestLow) : '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.mark} />
            <View>
              <Text style={styles.brand}>StopScroller</Text>
              <Text style={styles.tagline}>Know your count. Stop in time.</Text>
            </View>
          </View>
          <Link href="/settings" asChild>
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              style={({ pressed }) => [styles.gear, pressed && styles.pressed]}>
              <Text style={styles.gearIcon}>⚙</Text>
            </Pressable>
          </Link>
        </View>

        {/* setup warning */}
        {needsSetup && (
          <Link href="/settings" asChild>
            <Pressable
              style={({ pressed }) => [styles.warnBanner, pressed && styles.pressed]}
              accessibilityRole="button">
              <View style={styles.warnIcon}>
                <Text style={styles.warnIconText}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.warnTitle}>Tracking is off</Text>
                <Text style={styles.warnText}>
                  Turn on the accessibility service so StopScroller can count your reels.
                </Text>
              </View>
              <Text style={styles.warnChevron}>›</Text>
            </Pressable>
          </Link>
        )}

        {/* the brain */}
        <Animated.View style={[styles.meterWrap, rise]}>
          <BrainMeter count={count} />
        </Animated.View>

        {/* status */}
        <Animated.View
          style={[styles.statusCard, { backgroundColor: tint(state.color, 0.1), borderColor: tint(state.color, 0.35) }, rise]}>
          <View style={[styles.dot, { backgroundColor: state.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: state.color }]}>{state.label}</Text>
            <Text style={styles.statusBlurb}>{state.blurb}</Text>
          </View>
        </Animated.View>

        {/* stats strip */}
        <Animated.View style={[styles.stats, rise]}>
          <Stat value={bestLabel} label="Best day" />
          <View style={styles.statDivider} />
          <Stat value={capLabel} label="Daily limit" accent={capLabel !== 'Off'} />
        </Animated.View>

        {/* footer hint */}
        <Text style={styles.footer}>
          {health?.accessibilityEnabled
            ? 'Open Instagram Reels or YouTube Shorts — your count climbs live.'
            : 'Setup takes about 30 seconds.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && { color: Palette.accent }]} allowFontScaling={false}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.bg },
  content: { padding: Space.lg, gap: Space.xl, flexGrow: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  mark: {
    width: 10,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accent,
  },
  brand: { ...Type.title, color: Palette.text },
  tagline: { ...Type.caption, color: Palette.textDim, marginTop: 1 },
  gear: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Palette.bgCard,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: { fontSize: 18, color: Palette.textDim },
  pressed: { opacity: 0.65 },

  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: tint(Palette.warning, 0.1),
    borderColor: tint(Palette.warning, 0.4),
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Space.base,
  },
  warnIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Palette.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnIconText: { color: Palette.bg, fontWeight: '900', fontSize: 16 },
  warnTitle: { ...Type.bodyStrong, color: Palette.warning },
  warnText: { ...Type.caption, color: Palette.textDim, marginTop: 1, lineHeight: 18 },
  warnChevron: { color: Palette.warning, fontSize: 24, fontWeight: '600' },

  meterWrap: { alignItems: 'center', marginTop: Space.xs },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.base,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Space.lg,
  },
  dot: { width: 12, height: 12, borderRadius: Radius.pill },
  statusLabel: { ...Type.heading, fontSize: 18 },
  statusBlurb: { ...Type.caption, color: Palette.textDim, marginTop: 2 },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bgCard,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.card,
    paddingVertical: Space.lg,
    ...Elevation.card,
  },
  stat: { flex: 1, alignItems: 'center', gap: Space.xs },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: Palette.border, marginVertical: Space.sm },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.text,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  statLabel: { ...Type.overline, color: Palette.textFaint },

  footer: {
    textAlign: 'center',
    color: Palette.textFaint,
    ...Type.caption,
    marginTop: 'auto',
    paddingTop: Space.md,
    lineHeight: 18,
  },
});
