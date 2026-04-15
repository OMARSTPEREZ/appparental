package com.example.parentalcontrol.services

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.provider.Settings
import com.example.parentalcontrol.utils.FirebaseSyncManager
import com.example.parentalcontrol.utils.RulesManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class NotificationReaderService : NotificationListenerService() {

    private lateinit var firebaseSyncManager: FirebaseSyncManager
    private lateinit var rulesManager: RulesManager
    private val serviceScope = CoroutineScope(Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        rulesManager = RulesManager(this)
        val androidId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
        firebaseSyncManager = FirebaseSyncManager(androidId)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        sbn?.let {
            val packageName = it.packageName
            // Filtrar notificaciones del sistema
            if (packageName == "android" || packageName == "com.android.systemui") return
            
            // Verificar si el padre activó el monitoreo para esta app
            if (!rulesManager.isAppMonitored(packageName)) return
            
            val extras = it.notification.extras
            val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

            // Solo procesamos notificaciones que tengan texto comprensible 
            // (evitamos "Buscando GPS..." y otras notifs de sistema)
            if (title.isNotEmpty() && text.isNotEmpty()) {
                val timestamp = System.currentTimeMillis()
                
                serviceScope.launch {
                    firebaseSyncManager.syncNotification(
                        packageName = packageName,
                        title = title,
                        message = text,
                        timestamp = timestamp
                    )
                }
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}
