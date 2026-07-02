import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Palette, brainStateFor } from '@/constants/palette';

type Props = {
  count: number;
  max?: number;
  size?: number;
};

/** Circular damage ring with the current brain emoji + count in the middle. */
export function BrainMeter({ count, max, size = 260 }: Props) {
  const state = brainStateFor(count, max);
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * state.damage;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Palette.border}
          strokeWidth={stroke}
          fill="none"
        />
        {/* damage arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={state.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <Text style={styles.emoji}>{state.emoji}</Text>
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.label}>reels today</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emoji: {
    fontSize: 56,
    marginBottom: 4,
  },
  count: {
    fontSize: 52,
    fontWeight: '800',
    color: Palette.text,
    lineHeight: 56,
  },
  label: {
    fontSize: 13,
    color: Palette.textDim,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
