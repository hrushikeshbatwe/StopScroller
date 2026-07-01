import { NativeModule, requireNativeModule } from 'expo';

import { ScrollTrackerEvents, ServiceHealth } from './ScrollTracker.types';

declare class ScrollTrackerModule extends NativeModule<ScrollTrackerEvents> {
  // Count (read-only from JS — native ScrollStore is the single source of truth, plan R1)
  getCount(): number;
  getPerAppCounts(): Record<string, number>;
  getBestLow(): number;
  /** JSON string: array of { date: string, count: number }. */
  getHistory(): string;
  resetToday(): void;

  // Cap / enabled apps
  getCap(): number;
  setCap(cap: number): void;
  getEnabledApps(): string[];
  setEnabledApps(apps: string[]): void;
  getTargetPackages(): string[];

  // Permissions / health
  isAccessibilityEnabled(): boolean;
  canDrawOverlays(): boolean;
  isIgnoringBatteryOptimizations(): boolean;
  serviceHealth(): ServiceHealth;

  // Deep links into system settings
  openAccessibilitySettings(): void;
  openOverlaySettings(): void;
  openBatteryWhitelist(): void;
}

export default requireNativeModule<ScrollTrackerModule>('ScrollTracker');
