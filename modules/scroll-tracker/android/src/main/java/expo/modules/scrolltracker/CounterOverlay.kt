package expo.modules.scrolltracker

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.TextView

/**
 * The live floating counter bubble drawn on top of other apps (BrainPal-style).
 * Uses SYSTEM_ALERT_WINDOW. All calls must be on the main thread — the accessibility service's
 * event callback already runs there.
 */
class CounterOverlay(private val context: Context) {
  private var windowManager: WindowManager? = null
  private var view: TextView? = null
  private var params: WindowManager.LayoutParams? = null

  private fun dp(v: Int): Int = (v * context.resources.displayMetrics.density).toInt()

  fun show(count: Int) {
    if (view != null) {
      update(count)
      return
    }
    val wm = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager ?: return

    val tv = TextView(context).apply {
      text = format(count)
      setTextColor(Color.WHITE)
      textSize = 16f
      setTypeface(typeface, Typeface.BOLD)
      setPadding(dp(16), dp(9), dp(16), dp(9))
      background = GradientDrawable().apply {
        cornerRadius = dp(24).toFloat()
        setColor(Color.parseColor("#E61C1C25"))
        setStroke(dp(1), Color.parseColor("#552A2A35"))
      }
    }

    val type =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else
        @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

    val lp = WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = dp(16)
      y = dp(90)
    }

    attachDrag(tv, lp, wm)

    try {
      wm.addView(tv, lp)
      windowManager = wm
      view = tv
      params = lp
    } catch (_: Throwable) {
    }
  }

  fun update(count: Int) {
    view?.text = format(count)
  }

  fun hide() {
    val v = view ?: return
    try {
      windowManager?.removeView(v)
    } catch (_: Throwable) {
    }
    view = null
    params = null
  }

  private fun format(count: Int): String = "🧠  $count"

  private fun attachDrag(v: View, lp: WindowManager.LayoutParams, wm: WindowManager) {
    var startX = 0
    var startY = 0
    var touchX = 0f
    var touchY = 0f
    v.setOnTouchListener { _, e ->
      when (e.action) {
        MotionEvent.ACTION_DOWN -> {
          startX = lp.x; startY = lp.y; touchX = e.rawX; touchY = e.rawY; true
        }
        MotionEvent.ACTION_MOVE -> {
          lp.x = startX + (e.rawX - touchX).toInt()
          lp.y = startY + (e.rawY - touchY).toInt()
          try { wm.updateViewLayout(v, lp) } catch (_: Throwable) {}
          true
        }
        else -> false
      }
    }
  }
}
