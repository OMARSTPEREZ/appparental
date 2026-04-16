package com.example.parentalcontrol.utils

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.util.Base64
import android.util.DisplayMetrics
import android.view.WindowManager
import java.io.ByteArrayOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class ScreenStreamer(
    private val context: Context,
    private val firebaseSyncManager: FirebaseSyncManager
) {
    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var isStreaming = false
    private val executor: ExecutorService = Executors.newSingleThreadExecutor()

    fun startStreaming(resultCode: Int, data: Intent) {
        if (isStreaming) return
        isStreaming = true

        val projectionManager = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        mediaProjection = projectionManager.getMediaProjection(resultCode, data)

        val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val metrics = DisplayMetrics()
        windowManager.defaultDisplay.getRealMetrics(metrics)

        // Capture at lower resolution to save bandwidth
        val width = 360
        val height = (metrics.heightPixels.toFloat() / metrics.widthPixels * width).toInt()
        val density = metrics.densityDpi

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        virtualDisplay = mediaProjection?.createVirtualDisplay(
            "ScreenStream",
            width, height, density,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader?.surface, null, null
        )

        executor.execute {
            while (isStreaming) {
                val image = imageReader?.acquireLatestImage()
                if (image != null) {
                    val planes = image.planes
                    val buffer = planes[0].buffer
                    val pixelStride = planes[0].pixelStride
                    val rowStride = planes[0].rowStride
                    val rowPadding = rowStride - pixelStride * width

                    val bitmap = Bitmap.createBitmap(
                        width + rowPadding / pixelStride,
                        height,
                        Bitmap.Config.ARGB_8888
                    )
                    bitmap.copyPixelsFromBuffer(buffer)
                    
                    // Crop and Compress
                    val out = ByteArrayOutputStream()
                    val finalBitmap = Bitmap.createBitmap(bitmap, 0, 0, width, height)
                    finalBitmap.compress(Bitmap.CompressFormat.JPEG, 20, out)
                    val base64 = Base64.encodeToString(out.toByteArray(), Base64.DEFAULT)
                    
                    firebaseSyncManager.syncScreenFrame(base64)
                    
                    image.close()
                    bitmap.recycle()
                    finalBitmap.recycle()
                    
                    Thread.sleep(1000) // 1 frame per second to save Firebase quota
                }
            }
        }
    }

    fun stopStreaming() {
        isStreaming = false
        virtualDisplay?.release()
        mediaProjection?.stop()
        imageReader?.close()
        virtualDisplay = null
        mediaProjection = null
        imageReader = null
    }
}
