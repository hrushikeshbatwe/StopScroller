package expo.modules.scrolltracker

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Single source of truth for the scroll count (plan R1).
 *
 * The native side OWNS the count. The accessibility service writes it here; the JS module and the
 * home-screen widget only ever READ it (via [getCount] / listeners / the persisted prefs). There is
 * deliberately no MMKV<->SharedPreferences "sync" — that produced two diverging counters. JS MMKV is
 * for UI preferences only.
 *
 * Runs in-process with the accessibility service, so live UI updates go through [listeners]. When the
 * app is backgrounded/killed the service keeps writing here, and JS re-reads on next open.
 */
object ScrollStore {
  private const val PREFS = "scroll_tracker"

  private const val KEY_COUNT = "count"           // today's total reel count
  private const val KEY_DATE = "count_date"       // yyyy-MM-dd the count belongs to
  private const val KEY_CAP = "cap"               // block threshold
  private const val KEY_ENABLED = "enabled_apps"  // comma-joined package names
  private const val KEY_BEST_LOW = "best_low"     // lowest completed-day count ever (battles)
  private const val KEY_HISTORY = "history_json"  // JSONArray of {date,count}
  private const val KEY_LAST_EVENT = "last_event_ts"  // last accessibility event (data-quality, R2)
  private const val KEY_LIVENESS = "liveness_ping"    // independent service-alive ping (health, R2)
  private const val PER_APP_PREFIX = "count_pkg_"

  const val DEFAULT_CAP = 100000 // effectively "off" until the user sets a real cap

  val TARGET_PACKAGES = listOf(
    "com.instagram.android",
    "com.google.android.youtube",
    "com.facebook.katana",
    "com.snapchat.android"
  )

  private const val HISTORY_MAX_DAYS = 60

  private var prefs: SharedPreferences? = null

  fun interface Listener {
    fun onChange(count: Int)
  }

  private val listeners = CopyOnWriteArrayList<Listener>()

  fun init(context: Context) {
    if (prefs == null) {
      prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }
  }

  private fun sp(context: Context): SharedPreferences {
    init(context)
    return prefs!!
  }

  private fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

  fun addListener(l: Listener) = listeners.add(l)
  fun removeListener(l: Listener) = listeners.remove(l)

  private fun notifyListeners(count: Int) {
    for (l in listeners) {
      try {
        l.onChange(count)
      } catch (_: Throwable) {
      }
    }
  }

  /**
   * Roll the day over at most once when the calendar date changes: archive yesterday into history,
   * update the best-ever low, clear today's totals. Safe to call on every read/write.
   */
  @Synchronized
  private fun rolloverIfNeeded(context: Context) {
    val prefs = sp(context)
    val storedDate = prefs.getString(KEY_DATE, null)
    val t = today()
    if (storedDate == null) {
      prefs.edit().putString(KEY_DATE, t).apply()
      return
    }
    if (storedDate == t) return

    val yesterdayCount = prefs.getInt(KEY_COUNT, 0)
    val editor = prefs.edit()

    // archive into history
    val history = JSONArray(prefs.getString(KEY_HISTORY, "[]"))
    history.put(JSONObject().put("date", storedDate).put("count", yesterdayCount))
    while (history.length() > HISTORY_MAX_DAYS) history.remove(0)
    editor.putString(KEY_HISTORY, history.toString())

    // best-ever low (only count real days where you scrolled at least once)
    if (yesterdayCount in 1 until prefs.getInt(KEY_BEST_LOW, Int.MAX_VALUE)) {
      editor.putInt(KEY_BEST_LOW, yesterdayCount)
    }

    // clear per-app counts
    for (k in prefs.all.keys) {
      if (k.startsWith(PER_APP_PREFIX)) editor.remove(k)
    }

    editor.putInt(KEY_COUNT, 0).putString(KEY_DATE, t)
    editor.apply()
  }

  @Synchronized
  fun increment(context: Context, pkg: String): Int {
    val prefs = sp(context)
    rolloverIfNeeded(context)
    val newCount = prefs.getInt(KEY_COUNT, 0) + 1
    val perAppKey = PER_APP_PREFIX + pkg
    val perApp = prefs.getInt(perAppKey, 0) + 1
    prefs.edit().putInt(KEY_COUNT, newCount).putInt(perAppKey, perApp).apply()
    notifyListeners(newCount)
    return newCount
  }

  fun getCount(context: Context): Int {
    val prefs = sp(context)
    rolloverIfNeeded(context)
    return prefs.getInt(KEY_COUNT, 0)
  }

  fun getPerAppCounts(context: Context): Map<String, Int> {
    val prefs = sp(context)
    rolloverIfNeeded(context)
    val out = HashMap<String, Int>()
    for ((k, v) in prefs.all) {
      if (k.startsWith(PER_APP_PREFIX) && v is Int) {
        out[k.removePrefix(PER_APP_PREFIX)] = v
      }
    }
    return out
  }

  @Synchronized
  fun resetToday(context: Context) {
    val prefs = sp(context)
    val editor = prefs.edit()
    for (k in prefs.all.keys) {
      if (k.startsWith(PER_APP_PREFIX)) editor.remove(k)
    }
    editor.putInt(KEY_COUNT, 0).putString(KEY_DATE, today())
    editor.apply()
    notifyListeners(0)
  }

  fun getCap(context: Context): Int = sp(context).getInt(KEY_CAP, DEFAULT_CAP)

  fun setCap(context: Context, cap: Int) {
    sp(context).edit().putInt(KEY_CAP, cap).apply()
  }

  fun getBestLow(context: Context): Int {
    val v = sp(context).getInt(KEY_BEST_LOW, Int.MAX_VALUE)
    return if (v == Int.MAX_VALUE) -1 else v
  }

  fun getHistoryJson(context: Context): String = sp(context).getString(KEY_HISTORY, "[]") ?: "[]"

  fun getEnabledApps(context: Context): Set<String> {
    val raw = sp(context).getString(KEY_ENABLED, null)
      ?: return TARGET_PACKAGES.toSet() // default: all target apps enabled
    if (raw.isBlank()) return emptySet()
    return raw.split(",").filter { it.isNotBlank() }.toSet()
  }

  fun setEnabledApps(context: Context, apps: Set<String>) {
    sp(context).edit().putString(KEY_ENABLED, apps.joinToString(",")).apply()
  }

  fun isAppEnabled(context: Context, pkg: String): Boolean = pkg in getEnabledApps(context)

  // --- Reliability (R2) ---------------------------------------------------------------------------

  /** Independent "the service process is alive" ping — written on a timer, read by the health check. */
  fun markLiveness(context: Context) {
    sp(context).edit().putLong(KEY_LIVENESS, System.currentTimeMillis()).apply()
  }

  fun getLivenessAgeMs(context: Context): Long {
    val ts = sp(context).getLong(KEY_LIVENESS, 0L)
    return if (ts == 0L) Long.MAX_VALUE else System.currentTimeMillis() - ts
  }

  /** Last accessibility event seen — a DATA-QUALITY signal ("saw traffic"), NOT a health signal. */
  fun markEvent(context: Context) {
    sp(context).edit().putLong(KEY_LAST_EVENT, System.currentTimeMillis()).apply()
  }

  fun getLastEventAgeMs(context: Context): Long {
    val ts = sp(context).getLong(KEY_LAST_EVENT, 0L)
    return if (ts == 0L) Long.MAX_VALUE else System.currentTimeMillis() - ts
  }
}
