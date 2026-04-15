package com.example.parentalcontrol.services

import android.app.*
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationManager
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.content.pm.PackageManager
import android.content.pm.ApplicationInfo
import android.content.BroadcastReceiver
import android.content.IntentFilter
import androidx.core.app.NotificationCompat
import com.example.parentalcontrol.models.Rule
import com.example.parentalcontrol.utils.FirebaseSyncManager
import com.example.parentalcontrol.utils.RulesManager
import com.example.parentalcontrol.utils.CameraStreamer
import com.google.android.gms.location.*
import androidx.lifecycle.LifecycleService
import com.example.parentalcontrol.BlockActivity
import java.util.*

class MonitoringService : LifecycleService() {

    private val CHANNEL_ID = "ParentalControlChannel"
    private var timer: Timer? = null
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private lateinit var rulesManager: RulesManager
    private lateinit var firebaseSyncManager: FirebaseSyncManager
    private lateinit var cameraStreamer: CameraStreamer

    private val appInstallReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == Intent.ACTION_PACKAGE_ADDED) {
                val packageName = intent.data?.schemeSpecificPart ?: return
                syncInstalledApps()
                firebaseSyncManager.syncNotification(
                    packageName = packageName,
                    title = "⚠️ NUEVA APP INSTALADA",
                    message = "El dispositivo ha instalado la aplicación silenciosamente.",
                    timestamp = System.currentTimeMillis()
                )
            }
        }
    }

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
        
        val androidId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
        firebaseSyncManager = FirebaseSyncManager(androidId)
        
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        setupLocationTracking()
        
        // Listen for remote rule changes
        firebaseSyncManager.listenForRules { remoteRules ->
            if (remoteRules.isNotEmpty()) {
                rulesManager.saveRules(remoteRules)
            }
        }
        
        cameraStreamer = CameraStreamer(this, this, firebaseSyncManager)
        firebaseSyncManager.listenForCommands { cmd ->
            when (cmd) {
                "START_CAMERA" -> cameraStreamer.startStream()
                "STOP_CAMERA" -> cameraStreamer.stopStream()
            }
        }

        val filter = IntentFilter(Intent.ACTION_PACKAGE_ADDED).apply {
            addDataScheme("package")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(appInstallReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(appInstallReceiver, filter)
        }
    }

    private fun setupLocationTracking() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 120000) // 2 Minutos
            .setMinUpdateIntervalMillis(60000) // Minimo 1 minuto
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (location in locationResult.locations) {
                    println("TRACKING LOCATION: ${location.latitude}, ${location.longitude}")
                    firebaseSyncManager.syncLocation(location.latitude, location.longitude)
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
        super.onStartCommand(intent, flags, startId)
        syncInstalledApps()
        startPeriodicSync()
        return START_STICKY
    }

    private var syncCounter = 0

    private fun syncInstalledApps() {
        val packageManager = packageManager
        val apps = packageManager.getInstalledPackages(PackageManager.GET_META_DATA)
            .filter { it.applicationInfo != null && (it.applicationInfo!!.flags and ApplicationInfo.FLAG_SYSTEM) == 0 }
            .map {
                mapOf(
                    "name" to it.applicationInfo!!.loadLabel(packageManager).toString(),
                    "packageName" to it.packageName
                )
            }
        firebaseSyncManager.syncInstalledApps(apps)
    }

    private fun startPeriodicSync() {
        timer = Timer()
        timer?.scheduleAtFixedRate(object : TimerTask() {
            override fun run() {
                checkForegroundApp()
                syncCounter++
                if (syncCounter >= 30) { // Every ~60 seconds (30 * 2s)
                    syncDeviceStatus()
                    syncCounter = 0
                }
            }
        }, 0, 2000) // Check every 2 seconds
    }

    private fun syncDeviceStatus() {
        val batteryManager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val batteryPct = batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        
        val locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        
        firebaseSyncManager.syncDeviceStatus(batteryPct, isGpsEnabled)
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

    override fun onDestroy() {
        timer?.cancel()
        fusedLocationClient.removeLocationUpdates(locationCallback)
        unregisterReceiver(appInstallReceiver)
        super.onDestroy()
    }
}
