import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Palette } from '@/constants/palette';
import { ScrollTracker, type ServiceHealth } from '../../modules/scroll-tracker';

const APP_NAMES: Record<string, string> = {
  'com.instagram.android': 'Instagram',
  'com.google.android.youtube': 'YouTube',
  'com.facebook.katana': 'Facebook',
  'com.snapchat.android': 'Snapchat',
};

const CAP_PRESETS = [30, 50, 100, 200];

export default function SettingsScreen() {
  const router = useRouter();
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [cap, setCapState] = useState<number>(200);

  const refresh = useCallback(() => {
    try {
      setHealth(ScrollTracker.serviceHealth());
      setTargets(ScrollTracker.getTargetPackages());
      setEnabled(ScrollTracker.getEnabledApps());
      setCapState(ScrollTracker.getCap());
    } catch {
      // native module missing (web)
    }
  }, []);

  // Re-check every time the screen regains focus (e.g. returning from system settings).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const toggleApp = (pkg: string, on: boolean) => {
    const next = on ? [...new Set([...enabled, pkg])] : enabled.filter((p) => p !== pkg);
    setEnabled(next);
    try {
      ScrollTracker.setEnabledApps(next);
    } catch {}
  };

  const chooseCap = (value: number) => {
    setCapState(value);
    try {
      ScrollTracker.setCap(value);
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Setup</Text>
          <Pressable onPress={refresh} hitSlop={12}>
            <Text style={styles.recheck}>Re-check</Text>
          </Pressable>
        </View>

        {/* Permissions */}
        <Text style={styles.section}>Permissions</Text>

        <PermissionCard
          title="Accessibility Service"
          required
          desc="Required. Lets StopScroller detect reels & shorts inside other apps."
          ok={!!health?.accessibilityEnabled}
          cta="Enable"
          onPress={() => ScrollTracker.openAccessibilitySettings()}
        />
        <PermissionCard
          title="Ignore Battery Optimization"
          desc="Strongly recommended. Stops your phone from silently killing tracking in the background."
          ok={!!health?.ignoringBatteryOptimizations}
          cta="Allow"
          onPress={() => ScrollTracker.openBatteryWhitelist()}
        />
        <PermissionCard
          title="Display Over Other Apps"
          desc="Needed to block reels when you hit your limit (coming next update)."
          ok={!!health?.canDrawOverlays}
          cta="Allow"
          onPress={() => ScrollTracker.openOverlaySettings()}
        />

        {/* Tracked apps */}
        <Text style={styles.section}>Tracked apps</Text>
        <View style={styles.card}>
          {targets.map((pkg, i) => (
            <View key={pkg} style={[styles.appRow, i > 0 && styles.divider]}>
              <Text style={styles.appName}>{APP_NAMES[pkg] ?? pkg}</Text>
              <Switch
                value={enabled.includes(pkg)}
                onValueChange={(on) => toggleApp(pkg, on)}
                trackColor={{ true: Palette.accent, false: Palette.border }}
                thumbColor={Palette.text}
              />
            </View>
          ))}
        </View>

        {/* Daily limit */}
        <Text style={styles.section}>Daily limit</Text>
        <View style={styles.card}>
          <Text style={styles.capHint}>Block reels after this many per day (blocking ships next update).</Text>
          <View style={styles.capRow}>
            {CAP_PRESETS.map((v) => (
              <Pressable
                key={v}
                onPress={() => chooseCap(v)}
                style={[styles.capChip, cap === v && styles.capChipOn]}>
                <Text style={[styles.capChipText, cap === v && styles.capChipTextOn]}>{v}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Danger zone */}
        <Pressable style={styles.reset} onPress={() => ScrollTracker.resetToday()}>
          <Text style={styles.resetText}>Reset today&apos;s count</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function PermissionCard({
  title,
  desc,
  ok,
  cta,
  required,
  onPress,
}: {
  title: string;
  desc: string;
  ok: boolean;
  cta: string;
  required?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.permTop}>
        <Text style={styles.permTitle}>{title}</Text>
        <View style={[styles.pill, { backgroundColor: ok ? Palette.healthy + '22' : Palette.border }]}>
          <Text style={[styles.pillText, { color: ok ? Palette.healthy : Palette.textDim }]}>
            {ok ? '✓ On' : required ? 'Required' : 'Off'}
          </Text>
        </View>
      </View>
      <Text style={styles.permDesc}>{desc}</Text>
      {!ok && (
        <Pressable style={styles.permBtn} onPress={onPress}>
          <Text style={styles.permBtnText}>{cta}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.bg },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: Palette.text, fontSize: 32, lineHeight: 34 },
  title: { color: Palette.text, fontSize: 20, fontWeight: '800' },
  recheck: { color: Palette.accent, fontSize: 14, fontWeight: '600' },
  section: {
    color: Palette.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 2,
  },
  card: {
    backgroundColor: Palette.bgCard,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  permTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  permTitle: { color: Palette.text, fontSize: 16, fontWeight: '700', flex: 1 },
  permDesc: { color: Palette.textDim, fontSize: 13, lineHeight: 18 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 12, fontWeight: '700' },
  permBtn: {
    backgroundColor: Palette.accent,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 2,
  },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  appRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: Palette.border },
  appName: { color: Palette.text, fontSize: 16 },
  capHint: { color: Palette.textDim, fontSize: 13, lineHeight: 18 },
  capRow: { flexDirection: 'row', gap: 10 },
  capChip: {
    flex: 1,
    backgroundColor: Palette.bgElevated,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  capChipOn: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  capChipText: { color: Palette.textDim, fontWeight: '700', fontSize: 15 },
  capChipTextOn: { color: '#fff' },
  reset: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.danger + '55',
  },
  resetText: { color: Palette.danger, fontWeight: '600', fontSize: 15 },
});
