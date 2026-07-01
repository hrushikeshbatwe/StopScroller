package expo.modules.scrolltracker

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent

/**
 * The core: watches scroll/content events inside the target apps, counts reels via
 * [ReelSelectors] (plan R3), and persists through [ScrollStore] which is the single source of
 * truth (plan R1).
 *
 * Runs in the app's process. It can outlive the RN Activity, so the count MUST live in
 * SharedPreferences (ScrollStore), never in the Activity/JS.
 */
class ScrollAccessibilityService : AccessibilityService() {

  // Signature of the last reel we counted, so we only increment when the current reel changes.
  private var lastSignature: String? = null
  private var lastSignaturePkg: String? = null
  private var lastCountTime = 0L
  private var lastScanTime = 0L

  companion object {
    // Don't scan the view tree more often than this (TYPE_VIEW_SCROLLED fires in bursts).
    private const val MIN_SCAN_INTERVAL_MS = 120L
    // Cap counting rate — faster than any human swipes reels; prevents double counts within one swipe.
    private const val MIN_COUNT_INTERVAL_MS = 400L
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    ScrollStore.init(applicationContext)
    // R1: the count is restored implicitly from persistence — we never reset it here. A transient OS
    // rebind must NOT zero the count (that failure mode looks exactly like OEM battery-killing).
    // R2: prove liveness immediately so the health check doesn't false-alarm right after (re)connect.
    ScrollStore.markLiveness(applicationContext)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    event ?: return
    val pkg = event.packageName?.toString() ?: return

    // Data-quality signal only (NOT health): we saw traffic. Health uses the independent liveness ping.
    ScrollStore.markEvent(applicationContext)

    if (pkg !in ScrollStore.TARGET_PACKAGES) return
    if (!ScrollStore.isAppEnabled(applicationContext, pkg)) return

    when (event.eventType) {
      AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED,
      AccessibilityEvent.TYPE_VIEW_SCROLLED,
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> maybeCountReel(pkg)
    }
  }

  private fun maybeCountReel(pkg: String) {
    val now = System.currentTimeMillis()
    if (now - lastScanTime < MIN_SCAN_INTERVAL_MS) return
    lastScanTime = now

    val root = rootInActiveWindow ?: return
    val sig = ReelSelectors.currentReelSignature(this, root, pkg)
    if (sig == null) {
      // Left the reels feed; forget the last signature so re-entering counts the next reel fresh.
      lastSignature = null
      lastSignaturePkg = null
      return
    }

    if (sig != lastSignature || pkg != lastSignaturePkg) {
      lastSignature = sig
      lastSignaturePkg = pkg
      if (now - lastCountTime >= MIN_COUNT_INTERVAL_MS) {
        lastCountTime = now
        val newCount = ScrollStore.increment(applicationContext, pkg)
        maybeBlock(pkg, newCount)
      }
    }
  }

  /** Block-at-cap. Overlay is the primary mechanism (plan phase 5); wired in a later step. */
  private fun maybeBlock(pkg: String, count: Int) {
    val cap = ScrollStore.getCap(applicationContext)
    if (count >= cap) {
      // TODO(phase 5): show SYSTEM_ALERT_WINDOW overlay via BlockOverlay.
      // GLOBAL_ACTION_BACK stays OPTIONAL/per-app because it's blunt and can loop.
    }
  }

  override fun onInterrupt() {}
}
