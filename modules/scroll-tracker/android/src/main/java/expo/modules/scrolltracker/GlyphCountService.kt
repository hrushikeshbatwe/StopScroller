package expo.modules.scrolltracker

import android.app.Service
import android.content.ComponentName
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Message
import android.os.Messenger
import com.nothing.ketchum.Glyph
import com.nothing.ketchum.GlyphMatrixFrame
import com.nothing.ketchum.GlyphMatrixManager
import com.nothing.ketchum.GlyphMatrixObject
import com.nothing.ketchum.GlyphToy

/**
 * Glyph Toy for the Nothing Phone (3): paints today's live reel count onto the 25x25 Glyph Matrix
 * on the back of the phone. Long-press the Glyph button to cycle to this toy.
 *
 * The count is READ from [ScrollStore] (the single source of truth). We redraw when the Glyph
 * system pings the toy (shown / AOD refresh) and live while it's on screen via a ScrollStore
 * listener. This is Phone (3)-specific (DEVICE_23112, 25x25); other devices simply never surface it.
 */
class GlyphCountService : Service() {

  private var gmm: GlyphMatrixManager? = null

  // Redraw whenever the native count changes while the toy is bound.
  private val countListener = ScrollStore.Listener { draw() }

  private val callback = object : GlyphMatrixManager.Callback {
    override fun onServiceConnected(name: ComponentName?) {
      // 23112 = Phone (3). getDeviceMatrixLength() would confirm 25, but we only target the (3).
      try {
        gmm?.register(Glyph.DEVICE_23112)
      } catch (_: Throwable) {
      }
      draw()
    }

    override fun onServiceDisconnected(name: ComponentName?) {}
  }

  // The Glyph system talks to a toy over this Messenger; any message = refresh the display.
  private val handler = object : Handler(Looper.getMainLooper()) {
    override fun handleMessage(msg: Message) {
      when (msg.what) {
        GlyphToy.MSG_GLYPH_TOY -> draw()
        else -> super.handleMessage(msg)
      }
    }
  }
  private val messenger = Messenger(handler)

  override fun onBind(intent: Intent?): IBinder {
    ScrollStore.init(applicationContext)
    gmm = GlyphMatrixManager.getInstance(applicationContext)
    gmm?.init(callback)
    ScrollStore.addListener(countListener)
    return messenger.binder
  }

  override fun onUnbind(intent: Intent?): Boolean {
    ScrollStore.removeListener(countListener)
    try {
      gmm?.unInit()
    } catch (_: Throwable) {
    }
    gmm = null
    return false
  }

  private fun draw() {
    val mgr = gmm ?: return
    val bitmap = renderCount(ScrollStore.getCount(applicationContext))
    val obj = GlyphMatrixObject.Builder()
      .setImageSource(bitmap)
      .setPosition(0, 0)
      .setBrightness(255)
      .build()
    val frame = GlyphMatrixFrame.Builder()
      .addTop(obj)
      .build(applicationContext)
    try {
      mgr.setMatrixFrame(frame.render())
    } catch (_: Throwable) {
    }
  }

  /** Render the count centered on a [MATRIX]x[MATRIX] bitmap, shrinking the font so it always fits. */
  private fun renderCount(count: Int): Bitmap {
    val text = if (count > 999) "999+" else count.toString()
    val bitmap = Bitmap.createBitmap(MATRIX, MATRIX, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.WHITE
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
      textAlign = Paint.Align.CENTER
    }

    var size = 22f
    paint.textSize = size
    while (paint.measureText(text) > MATRIX - 2 && size > 6f) {
      size -= 1f
      paint.textSize = size
    }

    val fm = paint.fontMetrics
    val baseline = MATRIX / 2f - (fm.ascent + fm.descent) / 2f
    canvas.drawText(text, MATRIX / 2f, baseline, paint)
    return bitmap
  }

  private companion object {
    const val MATRIX = 25
  }
}
