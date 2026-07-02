import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Palette, Radius, Space, Type, tint } from '@/constants/palette';
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
  const [overlayOn, setOverlayOn] = useState<boolean>(true);
  const [blockOn, setBlockOn] = useState<boolean>(true);

  const refresh = useCallback(() => {
    try {
      setHealth(ScrollTracker.serviceHealth());
      setTargets(ScrollTracker.getTargetPackages());
      setEnabled(ScrollTracker.getEnabledApps());
      setCapState(ScrollTracker.getCap());
      setOverlayOn(ScrollTracker.isOverlayEnabled());
      setBlockOn(ScrollTracker.isBlockEnabled());
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
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Setup</Text>
          <Pressable onPress={refresh} hitSlop={12} style={({ pressed }) => pressed && styles.pressed}>
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
          desc="Needed for the floating counter and to block reels when you hit your daily limit."
          ok={!!health?.canDrawOverlays}
          cta="Allow"
          onPress={() => ScrollTracker.openOverlaySettings()}
        />

        {/* Tracked apps */}
        <Text style={styles.section}>Tracked apps</Text>
        <View style={styles.card}>
          {targets.map((pkg, i) => (
            <View key={pkg} style={[styles.row, i > 0 && styles.divider]}>
              <Text style={styles.rowTitle}>{APP_NAMES[pkg] ?? pkg}</Text>
              <Switch
                value={enabled.includes(pkg)}
                onValueChange={(on) => toggleApp(pkg, on)}
                trackColor={{ true: Palette.accent, false: Palette.border }}
                thumbColor={Palette.text}
              />
            </View>
          ))}
        </View>

        {/* Floating counter */}
        <Text style={styles.section}>Floating counter</Text>
        <View style={styles.card}>
          <ToggleRow
            title="Show bubble over apps"
            hint="A live count floats on top of Instagram / YouTube while you scroll. Needs the “Display over other apps” permission above."
            value={overlayOn}
            onChange={(on) => {
              setOverlayOn(on);
              try {
                ScrollTracker.setOverlayEnabled(on);
              } catch {}
            }}
          />
        </View>

        {/* Daily limit */}
        <Text style={styles.section}>Daily limit</Text>
        <View style={styles.card}>
          <ToggleRow
            title="Block reels at limit"
            hint="When you hit your cap, StopScroller covers the app so the scroll stops. Needs the “Display over other apps” permission above."
            value={blockOn}
            onChange={(on) => {
              setBlockOn(on);
              try {
                ScrollTracker.setBlockEnabled(on);
              } catch {}
            }}
          />
          <View style={[styles.divider, { paddingTop: Space.base }]}>
            <Text style={styles.hint}>Stop me after this many reels per day</Text>
            <View style={styles.capRow}>
              {CAP_PRESETS.map((v) => {
                const on = cap === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => chooseCap(v)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={({ pressed }) => [
                      styles.capChip,
                      on && styles.capChipOn,
                      pressed && !on && styles.pressed,
                    ]}>
                    <Text style={[styles.capChipText, on && styles.capChipTextOn]}>{v}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Danger zone */}
        <Pressable
          style={({ pressed }) => [styles.reset, pressed && styles.pressed]}
          onPress={() => ScrollTracker.resetToday()}>
          <Text style={styles.resetText}>Reset today’s count</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  value: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: Space.md }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: Palette.accent, false: Palette.border }}
        thumbColor={Palette.text}
      />
    </View>
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
        <View
          style={[
            styles.pill,
            { backgroundColor: ok ? tint(Palette.healthy, 0.16) : Palette.bgCardHi },
          ]}>
          <Text style={[styles.pillText, { color: ok ? Palette.healthy : Palette.textDim }]}>
            {ok ? '✓ On' : required ? 'Required' : 'Off'}
          </Text>
        </View>
      </View>
      <Text style={styles.permDesc}>{desc}</Text>
      {!ok && (
        <Pressable
          style={({ pressed }) => [styles.permBtn, pressed && styles.pressedBtn]}
          onPress={onPress}
          accessibilityRole="button">
          <Text style={styles.permBtnText}>{cta}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.bg },
  content: { padding: Space.lg, gap: Space.md, paddingBottom: Space.huge },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.xs,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Palette.bgCard,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: Palette.text, fontSize: 26, lineHeight: 28, marginTop: -2 },
  title: { color: Palette.text, ...Type.title, fontSize: 22 },
  recheck: { color: Palette.accent, ...Type.bodyStrong },
  pressed: { opacity: 0.6 },
  pressedBtn: { opacity: 0.85 },

  section: {
    ...Type.overline,
    color: Palette.textFaint,
    marginTop: Space.base,
    marginBottom: Space.xs,
    marginLeft: Space.xs,
  },
  card: {
    backgroundColor: Palette.bgCard,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.card,
    padding: Space.base,
  },

  permTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  permTitle: { color: Palette.text, ...Type.heading, flex: 1, paddingRight: Space.sm },
  permDesc: { color: Palette.textDim, ...Type.caption, lineHeight: 19, marginTop: Space.sm },
  pill: { paddingHorizontal: Space.md, paddingVertical: Space.xs, borderRadius: Radius.pill },
  pillText: { ...Type.caption, fontWeight: '700' },
  permBtn: {
    backgroundColor: Palette.accent,
    borderRadius: Radius.control,
    paddingVertical: Space.md,
    alignItems: 'center',
    marginTop: Space.md,
  },
  permBtnText: { color: Palette.accentInk, fontWeight: '700', fontSize: 15 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Space.sm },
  divider: { borderTopWidth: 1, borderTopColor: Palette.border, marginTop: Space.xs },
  rowTitle: { color: Palette.text, ...Type.bodyStrong, fontSize: 16 },
  hint: { color: Palette.textDim, ...Type.caption, lineHeight: 19, marginTop: 2 },

  capRow: { flexDirection: 'row', gap: Space.sm, marginTop: Space.md },
  capChip: {
    flex: 1,
    backgroundColor: Palette.bgElevated,
    borderRadius: Radius.control,
    paddingVertical: Space.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.border,
  },
  capChipOn: { backgroundColor: Palette.accent, borderColor: Palette.accent },
  capChipText: {
    color: Palette.textDim,
    fontWeight: '700',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  capChipTextOn: { color: Palette.accentInk },

  reset: {
    marginTop: Space.base,
    alignItems: 'center',
    paddingVertical: Space.base,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: tint(Palette.danger, 0.4),
    backgroundColor: tint(Palette.danger, 0.06),
  },
  resetText: { color: Palette.danger, fontWeight: '600', fontSize: 15 },
});
