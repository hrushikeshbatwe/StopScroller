import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Palette, Space, Type, brainStateFor } from '@/constants/palette';

type Props = {
  count: number;
  max?: number;
  size?: number;
};

/**
 * Circular damage ring with the current brain emoji + count in the middle.
 * The arc keeps the brain-state hue (green→amber→red = meaning, not decoration) and fades along
 * its length for depth; a recessed inner disc makes it read as a dial.
 */
export function BrainMeter({ count, max, size = 264 }: Props) {
  const state = brainStateFor(count, max);
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.max(circumference * state.damage, 0.001);
  const inner = size - stroke * 2 - Space.base;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* recessed dial face */}
      <View
        style={[
          styles.face,
          { width: inner, height: inner, borderRadius: inner / 2 },
        ]}
      />

      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={state.color} stopOpacity={1} />
            <Stop offset="1" stopColor={state.color} stopOpacity={0.5} />
          </LinearGradient>
        </Defs>

        {/* track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Palette.borderSoft}
          strokeWidth={stroke}
          fill="none"
        />
        {/* damage arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#arc)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={styles.emoji}>{state.emoji}</Text>
        <Text style={styles.count} allowFontScaling={false}>
          {count}
        </Text>
        <Text style={[styles.label, { color: state.color }]}>reels today</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    position: 'absolute',
    backgroundColor: Palette.bgElevated,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  emoji: {
    fontSize: 48,
    marginBottom: Space.xs,
  },
  count: {
    ...Type.display,
    color: Palette.text,
    lineHeight: 56,
    fontVariant: ['tabular-nums'],
  },
  label: {
    ...Type.overline,
    marginTop: Space.xs,
  },
});
