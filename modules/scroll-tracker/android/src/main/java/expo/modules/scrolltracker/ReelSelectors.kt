package expo.modules.scrolltracker

import android.accessibilityservice.AccessibilityService
import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Reel detection (plan R3).
 *
 * We do NOT debounce raw TYPE_VIEW_SCROLLED events — one fling emits many and a slow reel emits few,
 * so that drifts badly. Instead we compute a *signature* of the currently-focused fullscreen reel and
 * count only when that signature CHANGES ("the current reel changed"), not when "a scroll happened".
 *
 * This is still a heuristic and WILL break when Instagram/YouTube reshuffle their view tree. The
 * per-app hints below are the one place to re-tune after an app update — a data change, not a code
 * hunt. TUNE THESE ON-DEVICE: `adb shell uiautomator dump` while in each app's reels feed and read
 * the resource-ids. The current values are best-effort placeholders and need verification on a real
 * phone (see plan's phase-3 verification).
 */
object ReelSelectors {

  // Substrings matched against a node's viewIdResourceName to decide "we're in the reels/shorts feed".
  private val feedIdHints: Map<String, List<String>> = mapOf(
    "com.instagram.android" to listOf("clips_viewer", "clips_video", "reel_"),
    "com.google.android.youtube" to listOf("reel_recycler", "shorts", "reel_player_page"),
    "com.facebook.katana" to listOf("reels_viewer", "reel_root", "video_reels"),
    "com.snapchat.android" to listOf("spotlight", "discover_feed", "playback")
  )

  private const val MAX_NODES = 3000

  /**
   * @return a stable signature string for the reel currently on screen, or null if we don't think the
   * user is in a reels/shorts feed for [pkg].
   */
  fun currentReelSignature(
    service: AccessibilityService,
    root: AccessibilityNodeInfo,
    pkg: String
  ): String? {
    val hints = feedIdHints[pkg] ?: return null

    val dm = service.resources.displayMetrics
    val cx = dm.widthPixels / 2
    val cy = dm.heightPixels / 2

    var inFeed = false
    var bestArea = -1L
    var bestSig: String? = null

    val rect = Rect()
    val stack = ArrayDeque<AccessibilityNodeInfo>()
    stack.addLast(root)
    var visited = 0

    while (stack.isNotEmpty() && visited < MAX_NODES) {
      val node = stack.removeLast()
      visited++

      val id = node.viewIdResourceName
      if (id != null) {
        val lower = id.lowercase()
        if (!inFeed && hints.any { lower.contains(it) }) inFeed = true
      }

      // Candidate for "the current reel": a described node that covers screen-center and is large.
      val desc = node.contentDescription
      if (!desc.isNullOrBlank()) {
        node.getBoundsInScreen(rect)
        if (rect.width() > 0 && rect.height() > 0 && rect.contains(cx, cy)) {
          val area = rect.width().toLong() * rect.height().toLong()
          if (area > bestArea) {
            bestArea = area
            bestSig = (id ?: "") + "|" + desc.toString()
          }
        }
      }

      val childCount = node.childCount
      for (i in 0 until childCount) {
        node.getChild(i)?.let { stack.addLast(it) }
      }
    }

    if (!inFeed) return null
    // In the feed but nothing described at center yet (still loading): return a constant so we don't
    // spuriously count the same reel repeatedly while it settles.
    val sig = bestSig ?: "feed:$pkg"
    return sig.hashCode().toString()
  }
}
