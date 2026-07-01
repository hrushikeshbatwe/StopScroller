export type CountChangedEvent = {
  count: number;
};

export type ScrollTrackerEvents = {
  onCountChanged: (event: CountChangedEvent) => void;
};

/** Reliability snapshot (plan R2). `livenessAgeMs` is the health signal; `lastEventAgeMs` is only data-quality. */
export type ServiceHealth = {
  accessibilityEnabled: boolean;
  canDrawOverlays: boolean;
  ignoringBatteryOptimizations: boolean;
  /** ms since the service last proved it is alive (independent timer). Large => service likely killed. */
  livenessAgeMs: number;
  /** ms since the last accessibility event (i.e. you opened a tracked app). NOT a health signal. */
  lastEventAgeMs: number;
};
