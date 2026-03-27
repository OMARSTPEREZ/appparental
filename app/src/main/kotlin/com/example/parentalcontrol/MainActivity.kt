package com.example.parentalcontrol

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.graphics.drawable.toBitmap
import android.provider.Settings
import com.example.parentalcontrol.models.Rule
import com.example.parentalcontrol.services.MonitoringService
import com.example.parentalcontrol.utils.FirebaseSyncManager
import com.example.parentalcontrol.utils.RulesManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ParentalControlTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    MainScreen()
                }
            }
        }
    }

    @Composable
    fun MainScreen() {
        var hasUsageStats by remember { mutableStateOf(hasUsageStatsPermission(this)) }
        var hasOverlay by remember { mutableStateOf(Settings.canDrawOverlays(this)) }
        val rulesManager = remember { RulesManager(this@MainActivity) }
        val androidId = remember { Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) }
        val firebaseSyncManager = remember { FirebaseSyncManager(androidId) }
        
        var installedApps by remember { mutableStateOf<List<AppInfo>>(emptyList()) }
        val scope = rememberCoroutineScope()

        LaunchedEffect(Unit) {
            installedApps = withContext(Dispatchers.IO) {
                getInstalledAppsWithNames()
            }
        }

        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = "Parental Admin Panel", style = MaterialTheme.typography.headlineMedium)
            Spacer(modifier = Modifier.height(16.dp))

            // Permission Status Row
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusChip("Usage Stats", hasUsageStats)
                StatusChip("Overlay", hasOverlay)
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Control Buttons
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Button(onClick = { startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)) }) {
                    Text("Permissions")
                }
                Button(
                    onClick = {
                        val intent = Intent(this@MainActivity, MonitoringService::class.java)
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(intent)
                        } else {
                            startService(intent)
                        }
                    },
                    enabled = hasUsageStats && hasOverlay,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                ) {
                    Text("Start Service")
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(8.dp))
            Text("Gestión de Aplicaciones", style = MaterialTheme.typography.titleMedium)
            
            LazyColumn(modifier = Modifier.fillWeight(1f)) {
                items(installedApps) { app ->
                    AppRuleItem(app, rulesManager, firebaseSyncManager)
                }
            }
        }
    }

    @Composable
    fun StatusChip(label: String, active: Boolean) {
        AssistChip(
            onClick = { },
            label = { Text(label, style = MaterialTheme.typography.labelSmall) },
            leadingIcon = {
                if (!active) Icon(Icons.Default.Warning, contentDescription = null, tint = MaterialTheme.colorScheme.error)
            }
        )
    }

    @Composable
    fun AppRuleItem(app: AppInfo, rulesManager: RulesManager, firebaseSyncManager: FirebaseSyncManager) {
        var isBlocked by remember { mutableStateOf(rulesManager.isAppBlocked(app.packageName)) }
        
        ListItem(
            headlineContent = { Text(app.name) },
            supportingContent = { Text(app.packageName, style = MaterialTheme.typography.labelSmall) },
            leadingContent = {
                app.icon?.let {
                    Image(
                        bitmap = it.toBitmap().asImageBitmap(),
                        contentDescription = null,
                        modifier = Modifier.size(40.dp)
                    )
                }
            },
            trailingContent = {
                Switch(
                    checked = isBlocked,
                    onCheckedChange = {
                        isBlocked = it
                        val currentRules = rulesManager.getRules().toMutableList()
                        currentRules.removeAll { r -> r.packageName == app.packageName }
                        currentRules.add(Rule(app.packageName, it))
                        rulesManager.saveRules(currentRules)
                        
                        // Sync with Firebase
                        firebaseSyncManager.updateRulesInCloud(currentRules)
                    }
                )
            }
        )
    }

    @Composable
    fun AppRuleItem(app: AppInfo, rulesManager: RulesManager, firebaseSyncManager: FirebaseSyncManager) {
        // Renaming to avoid conflict if needed, or just update the signature above
    }

    data class AppInfo(val name: String, val packageName: String, val icon: Drawable?)

    private fun getInstalledAppsWithNames(): List<AppInfo> {
        val pm = packageManager
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
        return apps
            .filter { (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 } // Filter out system apps mostly
            .map { AppInfo(it.loadLabel(pm).toString(), it.packageName, it.loadIcon(pm)) }
            .sortedBy { it.name }
    }

    private fun Modifier.fillWeight(weight: Float): Modifier = this.then(Modifier.weight(weight))

    private fun hasUsageStatsPermission(context: Context): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
        } else {
            appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }
}

@Composable
fun ParentalControlTheme(content: @Composable () -> Unit) {
    MaterialTheme(content = content)
}
