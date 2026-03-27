package com.example.parentalcontrol

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.parentalcontrol.models.Rule
import com.example.parentalcontrol.services.MonitoringService
import com.example.parentalcontrol.utils.RulesManager

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

        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = "Parental Control Setup", style = MaterialTheme.typography.headlineMedium)
            Spacer(modifier = Modifier.height(24.dp))

            PermissionButton("Usage Stats Permission", hasUsageStats) {
                startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
            }

            Spacer(modifier = Modifier.height(16.dp))

            PermissionButton("Overlay Permission", hasOverlay) {
                val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
                startActivity(intent)
            }

            Spacer(modifier = Modifier.height(32.dp))

            val rulesManager = remember { RulesManager(this@MainActivity) }
            var isSettingsBlocked by remember { mutableStateOf(rulesManager.isAppBlocked("com.android.settings")) }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Block Settings App")
                Switch(
                    checked = isSettingsBlocked,
                    onCheckedChange = { 
                        isSettingsBlocked = it
                        rulesManager.saveRules(listOf(Rule("com.android.settings", it)))
                    }
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = {
                    val intent = Intent(this@MainActivity, MonitoringService::class.java)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(intent)
                    } else {
                        startService(intent)
                    }
                },
                enabled = hasUsageStats && hasOverlay
            ) {
                Text("Start Monitoring Service")
            }
        }
    }

    @Composable
    fun PermissionButton(text: String, granted: Boolean, onClick: () -> Unit) {
        Button(
            onClick = onClick,
            colors = ButtonDefaults.buttonColors(
                containerColor = if (granted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
            )
        ) {
            Text(if (granted) "$text: GRANTED" else "Grant $text")
        }
    }

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
