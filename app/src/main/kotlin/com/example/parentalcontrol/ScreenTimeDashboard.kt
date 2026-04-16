package com.example.parentalcontrol

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.parentalcontrol.utils.FirebaseSyncManager
import kotlin.math.max

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScreenTimeDashboard(
    onDismiss: () -> Unit,
    totalUsageMs: Long,
    dailyAppsUsage: List<Map<String, Any>>,
    syncManager: FirebaseSyncManager
) {
    var selectedFilter by remember { mutableStateOf("Diario") }
    val filters = listOf("Diario", "Semanal", "Mensual")
    var notificationCount by remember { mutableStateOf(0) }
    var isListExpanded by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        syncManager.listenForNotifications { notifs ->
            notificationCount = notifs.size
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tiempo en Pantalla", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.primary)
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {

            // --- Selector de Periodo ---
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    filters.forEach { filter ->
                        val isSelected = filter == selectedFilter
                        Surface(
                            onClick = { selectedFilter = filter },
                            shape = RoundedCornerShape(20.dp),
                            color = if (isSelected) MaterialTheme.colorScheme.primary else Color.White,
                            border = if (!isSelected) androidx.compose.foundation.BorderStroke(1.dp, Color.LightGray) else null,
                            modifier = Modifier.weight(1f).padding(horizontal = 4.dp)
                        ) {
                            Text(
                                text = filter,
                                color = if (isSelected) Color.White else Color.Gray,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(vertical = 8.dp),
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }

            // --- Grafica de Barras (Canvas) ---
            item {
                ScreenTimeBarChart(selectedFilter = selectedFilter, totalUsageMs = totalUsageMs)
            }

            // --- Contador de Notificaciones ---
            item {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White,
                    shadowElevation = 3.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFFFFF3E0),
                            modifier = Modifier.size(52.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    Icons.Default.Notifications,
                                    contentDescription = null,
                                    tint = Color(0xFFFFB300),
                                    modifier = Modifier.size(28.dp)
                                )
                            }
                        }
                        Spacer(Modifier.width(16.dp))
                        Column {
                            Text("Notificaciones Interceptadas", fontSize = 13.sp, color = Color.Gray)
                            Text(
                                "$notificationCount notificaciones hoy",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.DarkGray
                            )
                        }
                    }
                }
            }

            // --- Sección de Apps ---
            item {
                Text(
                    "Aplicaciones usadas hoy",
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                    color = Color.DarkGray
                )
            }

            if (dailyAppsUsage.isEmpty()) {
                item {
                    Text(
                        "Sin datos de aplicaciones aún. El celular del niño debe estar activo.",
                        color = Color.Gray,
                        fontStyle = FontStyle.Italic
                    )
                }
            } else {
                val displayCount = if (isListExpanded) dailyAppsUsage.size else minOf(4, dailyAppsUsage.size)

                itemsIndexed(dailyAppsUsage.take(displayCount)) { index, appInfo ->
                    val appName = appInfo["appName"] as? String ?: "App Desconocida"
                    val timeMs  = when (val t = appInfo["timeMs"]) {
                        is Long   -> t
                        is Number -> t.toLong()
                        else      -> 0L
                    }
                    AppUsageRow(rank = index + 1, appName = appName, timeMs = timeMs)
                }

                // Boton expandir si hay mas de 4
                if (dailyAppsUsage.size > 4) {
                    item {
                        TextButton(
                            onClick = { isListExpanded = !isListExpanded },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                if (isListExpanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                contentDescription = null
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                if (isListExpanded) "Ver menos"
                                else "Ver ${dailyAppsUsage.size - 4} aplicaciones más",
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            item { Spacer(Modifier.height(32.dp)) }
        }
    }
}

// --- Fila de App -------------------------------------------------------------

@Composable
fun AppUsageRow(rank: Int, appName: String, timeMs: Long) {
    val hours   = timeMs / (1000 * 60 * 60)
    val minutes = (timeMs / (1000 * 60)) % 60
    val timeLabel = buildString {
        if (hours > 0) append("${hours}h ")
        append("${minutes}m")
    }

    // Nice rank accent colors
    val accentColor = when (rank) {
        1    -> Color(0xFFFFD700)
        2    -> Color(0xFFB0C4DE)
        3    -> Color(0xFFCD7F32)
        else -> MaterialTheme.colorScheme.primaryContainer
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color.White,
        shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Rank badge
            Surface(shape = CircleShape, color = accentColor, modifier = Modifier.size(36.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Text("$rank", color = Color.White, fontWeight = FontWeight.Black, fontSize = 14.sp)
                }
            }
            Spacer(Modifier.width(12.dp))
            // App initial avatar
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(36.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        appName.firstOrNull()?.uppercaseChar()?.toString() ?: "?",
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Black
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            Text(
                text = if (appName.length > 22) appName.take(22) + "…" else appName,
                fontWeight = FontWeight.Bold,
                color = Color.DarkGray,
                modifier = Modifier.weight(1f)
            )
            Text(timeLabel, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary, fontSize = 15.sp)
        }
    }
}

// --- Gráfica de Barras -------------------------------------------------------

@Composable
fun ScreenTimeBarChart(selectedFilter: String, totalUsageMs: Long) {
    val realHoursToday = max(0f, (totalUsageMs / (1000f * 60 * 60)))

    val (chartData, labelData) = remember(selectedFilter, realHoursToday) {
        when (selectedFilter) {
            "Semanal" -> Pair(
                listOf(3.5f, 2.0f, 4.1f, 1.5f, realHoursToday),
                listOf("S1", "S2", "S3", "S4", "Esta\nSem")
            )
            "Mensual" -> Pair(
                listOf(45f, 30f, 50f, 25f, 40f, realHoursToday * 20),
                listOf("Ene", "Feb", "Mar", "Abr", "May", "Actual")
            )
            else -> Pair(
                listOf(2f, 1.5f, 4f, 3.2f, 1.8f, 5.0f, realHoursToday),
                listOf("L", "M", "M", "J", "V", "S", "Hoy")
            )
        }
    }

    val primaryColor = MaterialTheme.colorScheme.primary

    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color.White,
        shadowElevation = 4.dp,
        modifier = Modifier
            .fillMaxWidth()
            .height(230.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Consumo $selectedFilter", fontWeight = FontWeight.Bold, color = Color.Gray, fontSize = 13.sp)
            val totalH = chartData.last()
            val h = totalH.toInt(); val m = ((totalH % 1) * 60).toInt()
            Text("${h}h ${m}m", fontWeight = FontWeight.Black, fontSize = 26.sp, color = Color.DarkGray)

            Spacer(Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth().weight(1f),
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                val maxVal = max(chartData.maxOrNull() ?: 1f, 1f) * 1.1f

                chartData.forEachIndexed { i, value ->
                    val isToday = i == chartData.size - 1
                    val fraction = value / maxVal

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Bottom,
                        modifier = Modifier.weight(1f).fillMaxHeight()
                    ) {
                        // Bar
                        Canvas(modifier = Modifier.fillMaxWidth(0.65f).fillMaxHeight()) {
                            val h2 = size.height * fraction
                            val w  = size.width
                            val y  = size.height - h2
                            val r  = w / 2

                            val brush = if (isToday)
                                Brush.verticalGradient(listOf(primaryColor.copy(alpha = 0.6f), primaryColor))
                            else
                                Brush.verticalGradient(listOf(Color(0xFFE0E0E0), Color(0xFFBDBDBD)))

                            drawRoundRect(
                                brush = brush,
                                topLeft = Offset(0f, y),
                                size = Size(w, h2),
                                cornerRadius = CornerRadius(r, r)
                            )
                        }
                    }
                }
            }

            // Labels below
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                labelData.forEach { label ->
                    Text(
                        text = label,
                        fontSize = 10.sp,
                        textAlign = TextAlign.Center,
                        color = Color.Gray,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}
