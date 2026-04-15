package com.example.parentalcontrol.utils

import com.example.parentalcontrol.models.Rule
import com.google.firebase.database.*
import com.google.firebase.database.ktx.database
import com.google.firebase.ktx.Firebase

class FirebaseSyncManager(private val childId: String) {
    private val database = Firebase.database.reference.child("children").child(childId)

    fun syncLocation(lat: Double, lng: Double) {
        val locationData = mapOf(
            "latitude" to lat,
            "longitude" to lng,
            "timestamp" to System.currentTimeMillis()
        )
        database.child("location").setValue(locationData)
    }

    fun listenForRules(onRulesUpdated: (List<Rule>) -> Unit) {
        database.child("rules").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val rules = mutableListOf<Rule>()
                for (ruleSnap in snapshot.children) {
                    val packageName = ruleSnap.key ?: continue
                    val isBlocked = ruleSnap.child("isBlocked").getValue(Boolean::class.java) ?: false
                    val isMonitored = ruleSnap.child("isMonitored").getValue(Boolean::class.java) ?: false
                    rules.add(Rule(packageName, isBlocked, isMonitored))
                }
                onRulesUpdated(rules)
            }

            override fun onCancelled(error: DatabaseError) {
                // Handle error
            }
        })
    }

    fun updateRulesInCloud(rules: List<Rule>) {
        val rulesMap = rules.associate { it.packageName to mapOf(
            "isBlocked" to it.isBlocked,
            "isMonitored" to it.isMonitored
        ) }
        database.child("rules").updateChildren(rulesMap)
    }

    fun syncInstalledApps(apps: List<Map<String, String>>) {
        database.child("installed_apps").setValue(apps)
    }

    fun listenForInstalledApps(onAppsReceived: (List<Map<String, String>>) -> Unit) {
        database.child("installed_apps").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val apps = mutableListOf<Map<String, String>>()
                for (appSnap in snapshot.children) {
                    val name = appSnap.child("name").getValue(String::class.java) ?: ""
                    val packageName = appSnap.child("packageName").getValue(String::class.java) ?: ""
                    apps.add(mapOf("name" to name, "packageName" to packageName))
                }
                onAppsReceived(apps)
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }

    // --- Camera & Commands ---
    fun sendCameraFrame(base64Image: String) {
        database.child("camera_frame").setValue(base64Image)
    }

    fun listenForCameraFrame(onFrameReceived: (String) -> Unit) {
        database.child("camera_frame").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val frame = snapshot.getValue(String::class.java)
                if (frame != null) onFrameReceived(frame)
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }
    
    fun sendCommand(command: String) {
        database.child("command").setValue(command)
    }

    fun listenForCommands(onCommand: (String) -> Unit) {
        database.child("command").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val cmd = snapshot.getValue(String::class.java)
                if (cmd != null) onCommand(cmd)
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }
    
    fun listenForLocation(onLocationReceived: (Double, Double) -> Unit) {
        database.child("location").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val lat = snapshot.child("latitude").getValue(Double::class.java)
                val lng = snapshot.child("longitude").getValue(Double::class.java)
                if (lat != null && lng != null) {
                    onLocationReceived(lat, lng)
                }
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }

    // --- Notifications & Messages ---
    fun syncNotification(packageName: String, title: String, message: String, timestamp: Long) {
        val notifData = mapOf(
            "packageName" to packageName,
            "title" to title,
            "message" to message,
            "timestamp" to timestamp
        )
        database.child("notifications").push().setValue(notifData)
        cleanupOldNotifications()
    }

    private fun cleanupOldNotifications() {
        val threeDaysAgo = System.currentTimeMillis() - (3 * 24 * 60 * 60 * 1000L)
        database.child("notifications").orderByChild("timestamp").endAt(threeDaysAgo.toDouble())
            .addListenerForSingleValueEvent(object : ValueEventListener {
                override fun onDataChange(snapshot: DataSnapshot) {
                    for (child in snapshot.children) {
                        child.ref.removeValue()
                    }
                }
                override fun onCancelled(error: DatabaseError) {}
            })
    }

    fun listenForNotifications(onNotificationsUpdated: (List<Map<String, Any>>) -> Unit) {
        database.child("notifications").orderByChild("timestamp").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val notifs = mutableListOf<Map<String, Any>>()
                for (child in snapshot.children) {
                    val map = child.value as? Map<String, Any>
                    if (map != null) notifs.add(map)
                }
                // Reverse to show newest first
                onNotificationsUpdated(notifs.reversed())
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }

    // --- Device Status ---
    fun syncDeviceStatus(batteryPct: Int, isGpsEnabled: Boolean) {
        val statusData = mapOf(
            "battery" to batteryPct,
            "gpsEnabled" to isGpsEnabled,
            "lastUpdate" to System.currentTimeMillis()
        )
        database.child("status").setValue(statusData)
    }

    fun listenForDeviceStatus(onStatusUpdate: (Int, Boolean) -> Unit) {
        database.child("status").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val battery = snapshot.child("battery").getValue(Int::class.java) ?: -1
                val gpsEnabled = snapshot.child("gpsEnabled").getValue(Boolean::class.java) ?: false
                onStatusUpdate(battery, gpsEnabled)
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }
}
