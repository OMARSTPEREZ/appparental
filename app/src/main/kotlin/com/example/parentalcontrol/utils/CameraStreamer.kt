package com.example.parentalcontrol.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Rect
import android.graphics.YuvImage
import android.util.Base64
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.io.ByteArrayOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CameraStreamer(
    private val context: Context,
    private val lifecycleOwner: LifecycleOwner,
    private val firebaseSyncManager: FirebaseSyncManager
) {
    private var cameraProvider: ProcessCameraProvider? = null
    private var isStreaming = false
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()

    fun startStream() {
        if (isStreaming) return
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        cameraProviderFuture.addListener({
            cameraProvider = cameraProviderFuture.get()
            bindCameraUseCases()
            isStreaming = true
        }, ContextCompat.getMainExecutor(context))
    }

    fun stopStream() {
        isStreaming = false
        cameraProvider?.unbindAll()
    }

    private fun bindCameraUseCases() {
        val cameraProvider = cameraProvider ?: return
        val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

        val imageAnalyzer = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()
            .also {
                it.setAnalyzer(cameraExecutor) { imageProxy ->
                    if (isStreaming) {
                        val base64Image = imageProxy.toBase64()
                        if (base64Image != null) {
                            firebaseSyncManager.sendCameraFrame(base64Image)
                        }
                        // To avoid flooding firebase, we could throttle this (e.g. sleep 1000ms), 
                        // but logic inside toBase64 or here can slow it down.
                        Thread.sleep(1000) 
                    }
                    imageProxy.close()
                }
            }

        try {
            cameraProvider.unbindAll()
            cameraProvider.bindToLifecycle(
                lifecycleOwner, cameraSelector, imageAnalyzer
            )
        } catch (exc: Exception) {
            println("Camera bindings failed: ${exc.message}")
        }
    }

    private fun ImageProxy.toBase64(): String? {
        if (format != ImageFormat.YUV_420_888) return null
        
        val yBuffer = planes[0].buffer
        val uBuffer = planes[1].buffer
        val vBuffer = planes[2].buffer

        val ySize = yBuffer.remaining()
        val uSize = uBuffer.remaining()
        val vSize = vBuffer.remaining()

        val nv21 = ByteArray(ySize + uSize + vSize)

        yBuffer.get(nv21, 0, ySize)
        vBuffer.get(nv21, ySize, vSize)
        uBuffer.get(nv21, ySize + vSize, uSize)

        val yuvImage = YuvImage(nv21, ImageFormat.NV21, width, height, null)
        val out = ByteArrayOutputStream()
        
        // Compress drastically to save RTDB bandwidth. Quality 30.
        yuvImage.compressToJpeg(Rect(0, 0, width, height), 30, out)
        val imageBytes = out.toByteArray()
        
        return Base64.encodeToString(imageBytes, Base64.DEFAULT)
    }
}
