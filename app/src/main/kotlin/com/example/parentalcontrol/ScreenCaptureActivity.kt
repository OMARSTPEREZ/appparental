package com.example.parentalcontrol

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import com.example.parentalcontrol.services.MonitoringService

class ScreenCaptureActivity : Activity() {
    private companion object {
        const val REQUEST_CODE_SCREEN_CAPTURE = 1001
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        startActivityForResult(projectionManager.createScreenCaptureIntent(), REQUEST_CODE_SCREEN_CAPTURE)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_CODE_SCREEN_CAPTURE && resultCode == RESULT_OK && data != null) {
            val serviceIntent = Intent(this, MonitoringService::class.java).apply {
                action = "START_SCREEN_STREAM"
                putExtra("RESULT_CODE", resultCode)
                putExtra("DATA", data)
            }
            startForegroundService(serviceIntent)
        }
        finish()
    }
}
