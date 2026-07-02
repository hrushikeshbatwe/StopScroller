import { registerWebModule, NativeModule } from 'expo';

import { ScrollTrackerEvents, ServiceHealth } from './ScrollTracker.types';

// Web has no accessibility service — this is a no-op fallback so the bundler and any web preview
// don't crash. All real functionality is Android-only.
class ScrollTrackerModule extends NativeModule<ScrollTrackerEvents> {
  getCount(): number {
    return 0;
  }
  getPerAppCounts(): Record<string, number> {
    return {};
  }
  getBestLow(): number {
    return -1;
  }
  getHistory(): string {
    return '[]';
  }
  resetToday(): void {}

  getCap(): number {
    return 100000;
  }
  setCap(_cap: number): void {}
  getEnabledApps(): string[] {
    return [];
  }
  setEnabledApps(_apps: string[]): void {}
  getTargetPackages(): string[] {
    return [];
  }

  isOverlayEnabled(): boolean {
    return false;
  }
  setOverlayEnabled(_on: boolean): void {}

  isBlockEnabled(): boolean {
    return false;
  }
  setBlockEnabled(_on: boolean): void {}

  isAccessibilityEnabled(): boolean {
    return false;
  }
  canDrawOverlays(): boolean {
    return false;
  }
  isIgnoringBatteryOptimizations(): boolean {
    return false;
  }
  serviceHealth(): ServiceHealth {
    return {
      accessibilityEnabled: false,
      canDrawOverlays: false,
      ignoringBatteryOptimizations: false,
      livenessAgeMs: Number.MAX_SAFE_INTEGER,
      lastEventAgeMs: Number.MAX_SAFE_INTEGER,
    };
  }

  openAccessibilitySettings(): void {}
  openOverlaySettings(): void {}
  openBatteryWhitelist(): void {}
}

export default registerWebModule(ScrollTrackerModule, 'ScrollTrackerModule');
