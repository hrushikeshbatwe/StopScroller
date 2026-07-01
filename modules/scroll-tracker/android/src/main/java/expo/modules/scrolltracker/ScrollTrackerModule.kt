package expo.modules.scrolltracker

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS-facing bridge. JS only READS the count (single source of truth is [ScrollStore]) and drives the
 * permission/onboarding flow. Live updates are pushed via the "onCountChanged" event.
 */
class ScrollTrackerModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "ScrollTracker: no React context" }

  private val listener = ScrollStore.Listener { count ->
    sendEvent("onCountChanged", mapOf("count" to count))
  }

  override fun definition() = ModuleDefinition {
    Name("ScrollTracker")

    Events("onCountChanged")

    OnCreate {
      ScrollStore.init(context)
    }

    OnStartObserving { ScrollStore.addListener(listener) }
    OnStopObserving { ScrollStore.removeListener(listener) }

    // --- Count (read-only from JS) ---
    Function("getCount") { ScrollStore.getCount(context) }
    Function("getPerAppCounts") { ScrollStore.getPerAppCounts(context) }
    Function("getBestLow") { ScrollStore.getBestLow(context) }
    Function("getHistory") { ScrollStore.getHistoryJson(context) }
    Function("resetToday") { ScrollStore.resetToday(context) }

    // --- Cap / enabled apps ---
    Function("getCap") { ScrollStore.getCap(context) }
    Function("setCap") { cap: Int -> ScrollStore.setCap(context, cap) }
    Function("getEnabledApps") { ScrollStore.getEnabledApps(context).toList() }
    Function("setEnabledApps") { apps: List<String> -> ScrollStore.setEnabledApps(context, apps.toSet()) }
    Function("getTargetPackages") { ScrollStore.TARGET_PACKAGES }

    // --- Permissions / health ---
    Function("isAccessibilityEnabled") { isAccessibilityEnabled() }
    Function("canDrawOverlays") { Settings.canDrawOverlays(context) }
    Function("isIgnoringBatteryOptimizations") { isIgnoringBatteryOptimizations() }
    Function("serviceHealth") {
      mapOf(
        "accessibilityEnabled" to isAccessibilityEnabled(),
        "canDrawOverlays" to Settings.canDrawOverlays(context),
        "ignoringBatteryOptimizations" to isIgnoringBatteryOptimizations(),
        "livenessAgeMs" to ScrollStore.getLivenessAgeMs(context).toDouble(),
        "lastEventAgeMs" to ScrollStore.getLastEventAgeMs(context).toDouble()
      )
    }

    // --- Deep links into system settings ---
    Function("openAccessibilitySettings") {
      startSettings(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
    }
    Function("openOverlaySettings") {
      startSettings(
        Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:" + context.packageName)
        )
      )
    }
    Function("openBatteryWhitelist") { openBatteryWhitelist() }
  }

  private fun isAccessibilityEnabled(): Boolean {
    val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
      ?: return false
    val services = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
    val expected = ScrollAccessibilityService::class.java.name
    return services.any {
      val info = it.resolveInfo.serviceInfo
      info.packageName == context.packageName && info.name == expected
    }
  }

  private fun isIgnoringBatteryOptimizations(): Boolean {
    val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return false
    return pm.isIgnoringBatteryOptimizations(context.packageName)
  }

  @Suppress("BatteryLife")
  private fun openBatteryWhitelist() {
    // Standard Android prompt first; per-OEM autostart intents are layered on in phase 4.
    val direct = Intent(
      Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      Uri.parse("package:" + context.packageName)
    )
    if (!startSettings(direct)) {
      startSettings(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
    }
  }

  private fun startSettings(intent: Intent): Boolean {
    return try {
      val activity = appContext.currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
      true
    } catch (_: Throwable) {
      false
    }
  }
}
