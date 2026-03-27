package com.example.parentalcontrol.services

import android.app.*
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.example.parentalcontrol.models.Rule
import com.example.parentalcontrol.utils.RulesManager
import com.google.android.gms.location.*
import java.util.*

class MonitoringService : Service() {

    private val CHANNEL_ID = "ParentalControlChannel"
    private var timer: Timer? = null
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var rulesManager: RulesManager

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Parental Control Active")
            .setContentText("Monitoring device usage...")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .build()
        startForeground(1, notification)

        rulesManager = RulesManager(this)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        setupLocationTracking()
    }

    private fun setupLocationTracking() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000)
            .setMinUpdateIntervalMillis(5000)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (location in locationResult.locations) {
                    println("TRACKING LOCATION: ${location.latitude}, ${location.longitude}")
                    // Here we will sync with Firebase later
                }
            }
        }

        try {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
        } catch (e: SecurityException) {
            println("Location permission not granted for background tracking")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startMonitoring()
        return START_STICKY
    }

    private fun startMonitoring() {
        timer = Timer()
        timer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                checkForegroundApp()
            }
        }, 0, 2000) // Check every 2 seconds
    }

    private fun checkForegroundApp() {
        val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val time = System.currentTimeMillis()
        val stats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, time - 1000 * 10, time)

        if (stats != null && stats.isNotEmpty()) {
            val sortedStats = stats.sortedByDescending { it.lastTimeUsed }
            val currentApp = sortedStats[0].packageName
            println("CURRENT APP: $currentApp")
            
            if (rulesManager.isAppBlocked(currentApp)) {
                showBlockOverlay()
            }
        }
    }

    private fun showBlockOverlay() {
        val intent = Intent(this, BlockActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        startActivity(intent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Monitoring Service Channel",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        timer?.cancel()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        super.onDestroy()
    }
}
