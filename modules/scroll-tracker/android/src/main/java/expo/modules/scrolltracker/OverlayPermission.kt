package expo.modules.scrolltracker

import android.app.AppOpsManager
import android.content.Context
import android.os.Build
import android.os.Process
import android.provider.Settings

/**
 * "Display over other apps" (SYSTEM_ALERT_WINDOW) permission check.
 *
 * [Settings.canDrawOverlays] is the documented API, but on some devices/ROMs — reported on
 * Android 14 — it returns false even when the user has actually granted the permission, which made
 * the app say "off" and suppressed the floating counter and the block overlay. We cross-check the
 * underlying AppOps op so a granted permission is trusted even when the primary API misreports it.
 */
object OverlayPermission {
  fun canDraw(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
    if (Settings.canDrawOverlays(context)) return true
    return try {
      val aom = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val uid = Process.myUid()
      val pkg = context.packageName
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        aom.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW, uid, pkg)
      } else {
        @Suppress("DEPRECATION")
        aom.checkOpNoThrow(AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW, uid, pkg)
      }
      mode == AppOpsManager.MODE_ALLOWED
    } catch (_: Throwable) {
      false
    }
  }
}
