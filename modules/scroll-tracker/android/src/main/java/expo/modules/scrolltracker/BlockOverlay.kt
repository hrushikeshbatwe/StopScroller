package expo.modules.scrolltracker

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Full-screen "you hit your limit" block. This is the blocking mechanism behind the daily-limit
 * feature (plan phase 5): once today's reel count reaches the cap, we cover the tracked app with a
 * focusable SYSTEM_ALERT_WINDOW so scrolling physically stops until the user closes the app or
 * snoozes.
 *
 * All calls must run on the main thread — the accessibility service's event callback already does.
 */
class BlockOverlay(private val context: Context) {
  private var windowManager: WindowManager? = null
  private var view: View? = null
  private var countLabel: TextView? = null

  private fun dp(v: Int): Int = (v * context.resources.displayMetrics.density).toInt()

  /**
   * @param onClose   user chose to leave the app (service performs GLOBAL_ACTION_HOME)
   * @param onSnooze  user bought a short grace window (service records the snooze)
   */
  fun show(count: Int, cap: Int, onClose: () -> Unit, onSnooze: () -> Unit) {
    if (view != null) {
      updateCount(count)
      return
    }
    val wm = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager ?: return

    val root = buildView(count, cap, onClose, onSnooze)

    val type =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else
        @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

    // Full-screen and focusable so it consumes every touch/back press behind it — the app cannot be
    // scrolled while this is up. FLAG_WATCH_OUTSIDE_TOUCH is intentionally omitted so nothing leaks
    // through to the blocked app.
    val lp = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      type,
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
      PixelFormat.OPAQUE
    ).apply {
      gravity = Gravity.CENTER
    }

    // Swallow the hardware/back key so it can't dismiss the block — only the buttons do.
    root.isFocusableInTouchMode = true
    root.setOnKeyListener { _, keyCode, e ->
      keyCode == KeyEvent.KEYCODE_BACK && e.action == KeyEvent.ACTION_UP
    }

    try {
      wm.addView(root, lp)
      root.requestFocus()
      windowManager = wm
      view = root
    } catch (_: Throwable) {
    }
  }

  fun updateCount(count: Int) {
    countLabel?.text = countText(count)
  }

  fun hide() {
    val v = view ?: return
    try {
      windowManager?.removeView(v)
    } catch (_: Throwable) {
    }
    view = null
    countLabel = null
  }

  val isShowing: Boolean get() = view != null

  private fun buildView(
    count: Int,
    cap: Int,
    onClose: () -> Unit,
    onSnooze: () -> Unit,
  ): View {
    val container = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#F20B0B0F")) // near-opaque app bg
      setPadding(dp(32), dp(32), dp(32), dp(32))
    }

    val skull = TextView(context).apply {
      text = "💀"
      textSize = 72f
      gravity = Gravity.CENTER
    }

    val title = TextView(context).apply {
      text = "Limit reached"
      setTextColor(Color.parseColor("#F5F5F7"))
      textSize = 28f
      setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER
      setPadding(0, dp(20), 0, dp(8))
    }

    countLabel = TextView(context).apply {
      text = countText(count)
      setTextColor(Color.parseColor("#EF4444"))
      textSize = 17f
      gravity = Gravity.CENTER
    }

    val blurb = TextView(context).apply {
      text = "That's your cap of $cap for today. Brain officially fried — put the phone down."
      setTextColor(Color.parseColor("#9A9AA8"))
      textSize = 15f
      gravity = Gravity.CENTER
      setPadding(dp(8), dp(12), dp(8), dp(28))
    }

    val closeBtn = Button(context).apply {
      text = "Close app"
      isAllCaps = false
      setTextColor(Color.WHITE)
      textSize = 17f
      setTypeface(typeface, Typeface.BOLD)
      background = GradientDrawable().apply {
        cornerRadius = dp(14).toFloat()
        setColor(Color.parseColor("#8B5CF6")) // accent
      }
      setOnClickListener {
        hide()
        onClose()
      }
    }

    val snoozeBtn = TextView(context).apply {
      text = "Give me 5 more minutes"
      setTextColor(Color.parseColor("#6A6A78"))
      textSize = 14f
      gravity = Gravity.CENTER
      setPadding(dp(12), dp(20), dp(12), dp(8))
      setOnClickListener {
        hide()
        onSnooze()
      }
    }

    container.addView(skull)
    container.addView(title)
    container.addView(countLabel)
    container.addView(blurb)
    container.addView(
      closeBtn,
      LinearLayout.LayoutParams(dp(240), dp(54))
    )
    container.addView(snoozeBtn)
    return container
  }

  private fun countText(count: Int): String = "$count reels scrolled today"
}
