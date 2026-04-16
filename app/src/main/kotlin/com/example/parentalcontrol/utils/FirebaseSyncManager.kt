package com.example.parentalcontrol.utils

import com.example.parentalcontrol.models.Rule
import com.google.firebase.database.*
import com.google.firebase.database.ktx.database
import com.google.firebase.ktx.Firebase

class FirebaseSyncManager(private var childId: String) {
    private val database = Firebase.database.reference
    private var childRef = database.child("children").child(childId)

    /**
     * Actualiza el childId y las referencias internas (usado tras vinculación o cambio en selector)
     */
    fun updateChildId(newChildId: String) {
        this.childId = newChildId
        this.childRef = database.child("children").child(newChildId)
    }

    fun getChildId(): String = childId

    // --- Linked Devices Management ---
    fun registerDeviceToParent(parentUid: String, childId: String, name: String, avatar: String) {
        val deviceData = mapOf(
            "childId" to childId,
            "name" to name,
            "avatar" to avatar
        )
        database.child("parents").child(parentUid).child("devices").child(childId).setValue(deviceData)
    }

    fun listenForLinkedDevices(parentUid: String, onUpdate: (List<Map<String, String>>) -> Unit) {
        database.child("parents").child(parentUid).child("devices").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val devices = mutableListOf<Map<String, String>>()
                for (deviceSnap in snapshot.children) {
                    val childId = deviceSnap.child("childId").getValue(String::class.java) ?: ""
                    val name = deviceSnap.child("name").getValue(String::class.java) ?: ""
                    val avatar = deviceSnap.child("avatar").getValue(String::class.java) ?: "🤖"
                    if (childId.isNotEmpty()) {
                        devices.add(mapOf("childId" to childId, "name" to name, "avatar" to avatar))
                    }
                }
                onUpdate(devices)
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }

    fun syncLocation(lat: Double, lng: Double) {
        val timestamp = System.currentTimeMillis()
        val locationData = mapOf(
            "latitude" to lat,
            "longitude" to lng,
            "timestamp" to timestamp
        )
        // Última ubicación conocida
        childRef.child("location").setValue(locationData)
        
        // Histórico para rutas (agrupado por día)
        val sdf = java.text.SimpleDateFormat("yyyyMMdd", java.util.Locale.getDefault())
        val dateKey = sdf.format(java.util.Date(timestamp))
        childRef.child("location_history").child(dateKey).push().setValue(locationData)
    }

    fun listenForLocationHistory(date: String, onUpdate: (List<Map<String, Any>>) -> Unit) {
        childRef.child("location_history").child(date).addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val history = snapshot.children.mapNotNull { it.value as? Map<String, Any> }
                onUpdate(history)
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }

    fun listenForRules(onRulesUpdated: (List<Rule>) -> Unit) {
        childRef.child("rules").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val rules = mutableListOf<Rule>()
                for (ruleSnap in snapshot.children) {
                    val packageName = ruleSnap.key ?: continue
                    val isBlocked = ruleSnap.child("isBlocked").getValue(Boolean::class.java) ?: false
                    val isMonitored = ruleSnap.child("isMonitored").getValue(Boolean::class.java) ?: false
                    val isAlwaysAllowed = ruleSnap.child("isAlwaysAllowed").getValue(Boolean::class.java) ?: false
                    val timeLimit = ruleSnap.child("timeLimitMinutes").getValue(Int::class.java) ?: -1
                    rules.add(Rule(packageName, isBlocked, isMonitored, isAlwaysAllowed, timeLimit))
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
            "isMonitored" to it.isMonitored,
            "isAlwaysAllowed" to it.isAlwaysAllowed,
            "timeLimitMinutes" to it.timeLimitMinutes
        ) }
        childRef.child("rules").updateChildren(rulesMap)
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

    // --- Admin PIN Sync ---
    fun syncAdminPin(pin: String) {
        database.child("admin_pin").setValue(pin)
    }

    fun listenForAdminPin(onPinUpdate: (String) -> Unit) {
        database.child("admin_pin").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val pin = snapshot.getValue(String::class.java)
                if (pin != null) onPinUpdate(pin)
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }

    // --- Child Profile Sync ---
    fun syncChildProfile(name: String, avatarBase64: String, birthDate: Long, age: Int) {
        val profileData = mapOf(
            "name" to name,
            "avatar" to avatarBase64,
            "birthDate" to birthDate,
            "age" to age,
            "lastUpdate" to System.currentTimeMillis()
        )
        database.child("profile").setValue(profileData)
    }

    fun listenForChildProfile(onProfileUpdate: (String, String, Int) -> Unit) {
        database.child("profile").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val name = snapshot.child("name").getValue(String::class.java) ?: ""
                val avatar = snapshot.child("avatar").getValue(String::class.java) ?: "🤖"
                val age = snapshot.child("age").getValue(Int::class.java) ?: 0
                onProfileUpdate(name, avatar, age)
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }

    // --- Usage Stats Sync (Tiempo en Pantalla) ---
    fun syncUsageStats(totalTimeMs: Long, appsUsage: List<Map<String, Any>>) {
        val data = mapOf(
            "totalTimeMs" to totalTimeMs,
            "apps" to appsUsage,
            "lastUpdate" to System.currentTimeMillis()
        )
        database.child("usage_stats").setValue(data)
    }

    fun listenForUsageStats(onUpdate: (Long, List<Map<String, Any>>) -> Unit) {
        database.child("usage_stats").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val totalTimeMs = snapshot.child("totalTimeMs").getValue(Long::class.java) ?: 0L
                val apps = snapshot.child("apps").children.mapNotNull {
                    it.value as? Map<String, Any>
                }
                onUpdate(totalTimeMs, apps)
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }

    // --- Screen Mirroring Sync ---
    fun syncScreenFrame(base64Frame: String) {
        database.child("screen_frame").setValue(base64Frame)
    }

    fun listenForScreenFrame(onFrame: (String) -> Unit) {
        database.child("screen_frame").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val frame = snapshot.getValue(String::class.java)
                if (frame != null) onFrame(frame)
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }

    // --- Audio Monitoring Sync ---
    fun syncAudioChunk(base64Audio: String) {
        database.child("audio_chunk").setValue(base64Audio)
    }

    fun listenForAudioChunk(onChunk: (String) -> Unit) {
        database.child("audio_chunk").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val chunk = snapshot.getValue(String::class.java)
                if (chunk != null) onChunk(chunk)
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }

    // --- Pairing Code Logic (NEW) ---
    fun generatePairingCode(parentUid: String, onResult: (String?) -> Unit) {
        val allowedChars = ('A'..'Z') + ('0'..'9')
        val code = (1..8).map { allowedChars.random() }.joinToString("")
        val expiryTime = System.currentTimeMillis() + (10 * 60 * 1000L) // 10 Minutos
        val pairingData = mapOf(
            "parentUid" to parentUid,
            "expiresAt" to expiryTime
        )
        
        val rootRef = com.google.firebase.database.FirebaseDatabase.getInstance().reference
        rootRef.child("pairing_codes").child(code).setValue(pairingData)
        // Se ejecuta sincrónicamente. Firebase subirá la data en segundo plano
        onResult(code)
    }

    fun linkWithCode(code: String, onResult: (String?) -> Unit) {
        val rootRef = com.google.firebase.database.FirebaseDatabase.getInstance().reference
        val upperCode = code.uppercase().replace(" ", "") // Limpiar formato
        rootRef.child("pairing_codes").child(upperCode).addListenerForSingleValueEvent(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val parentUid = snapshot.child("parentUid").getValue(String::class.java)
                val expiresAt = snapshot.child("expiresAt").getValue(Long::class.java) ?: 0L
                
                if (parentUid != null && System.currentTimeMillis() < expiresAt) {
                    // Limpiar código usado y retornar UID del padre
                    snapshot.ref.removeValue()
                    onResult(parentUid)
                } else {
                    onResult(null)
                }
            }
            override fun onCancelled(error: DatabaseError) {
                onResult(null)
            }
        })
    }

    // --- Downtime Sync ---
    fun syncDowntimeConfig(config: Map<String, Any>) {
        childRef.child("downtime_config").setValue(config)
    }

    fun listenForDowntimeConfig(onUpdate: (Map<String, Any>) -> Unit) {
        childRef.child("downtime_config").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val config = snapshot.value as? Map<String, Any> ?: emptyMap()
                onUpdate(config)
            }
            override fun onCancelled(error: DatabaseError) {}
        })
    }
}
