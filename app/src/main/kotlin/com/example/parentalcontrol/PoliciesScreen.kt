package com.example.parentalcontrol

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PoliciesScreen(
    onAccept: () -> Unit,
    onBack: () -> Unit
) {
    var isAccepted by remember { mutableStateOf(false) }
    
    val primaryColor = Color(0xFF7B5400)
    val secondaryColor = Color(0xFFFEB300)
    val backgroundColor = Color(0xFFFFF5E7)
    val cardColor = Color(0xFFFFDF95)
    val textColor = Color(0xFF3C2C00)
    val gradient = Brush.linearGradient(listOf(primaryColor, secondaryColor))

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("KinderGuard", fontWeight = FontWeight.Bold, color = primaryColor) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = primaryColor)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = backgroundColor.copy(alpha = 0.8f))
            )
        },
        bottomBar = {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = backgroundColor.copy(alpha = 0.9f),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = isAccepted,
                            onCheckedChange = { isAccepted = it },
                            colors = CheckboxDefaults.colors(checkedColor = primaryColor)
                        )
                        Text(
                            text = "He leído y acepto los términos de servicio y la política de privacidad.",
                            style = MaterialTheme.typography.labelSmall,
                            color = textColor.copy(alpha = 0.7f),
                            modifier = Modifier.padding(start = 8.dp)
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Button(
                        onClick = onAccept,
                        enabled = isAccepted,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp)
                            .background(if (isAccepted) gradient else Brush.linearGradient(listOf(Color.Gray, Color.Gray)), RoundedCornerShape(28.dp)),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                        shape = RoundedCornerShape(28.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Acepto", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White)
                        }
                    }
                }
            }
        },
        containerColor = backgroundColor
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp)
        ) {
            // Hero Section
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(cardColor, RoundedCornerShape(16.dp))
                    .padding(24.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Nuestra Promesa de Seguridad",
                            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black),
                            color = primaryColor
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Construyendo un patio de juegos digital donde el crecimiento y la protección van de la mano.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = textColor
                        )
                    }
                    // Simplified representation of the image
                    Surface(
                        modifier = Modifier.size(80.dp),
                        shape = CircleShape,
                        color = Color(0xFF66B6FF).copy(alpha = 0.3f)
                    ) {
                        Icon(Icons.Default.Shield, contentDescription = null, modifier = Modifier.padding(16.dp), tint = primaryColor)
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Values Grid (Stacked for mobile)
            PolicyValueItem(
                title = "Privacy First",
                description = "Sus datos están cifrados y nunca se venden. Priorizamos el anonimato del menor.",
                icon = Icons.Default.Lock,
                iconColor = Color(0xFF66B6FF)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            PolicyValueItem(
                title = "Parent Control",
                description = "Usted define los límites. Supervisión en tiempo real con transparencia absoluta.",
                icon = Icons.Default.Shield,
                iconColor = Color(0xFFFFC4B3)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            PolicyValueItem(
                title = "Safe Environment",
                description = "Algoritmos curados por expertos para filtrar contenido inapropiado.",
                icon = Icons.Default.Star,
                iconColor = Color(0xFFFED980)
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Detailed Content
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                    .padding(24.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Description, contentDescription = null, tint = primaryColor)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Detalles de la Promesa", fontWeight = FontWeight.Bold)
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .border(1.dp, Color.Gray.copy(alpha = 0.1f), RoundedCornerShape(8.dp)),
                    color = Color.White.copy(alpha = 0.3f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .padding(16.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        Text(
                            text = "Última actualización: 24 de Mayo, 2024",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Bienvenido a KinderGuard. Al utilizar nuestra plataforma, usted acepta los siguientes términos de servicio diseñados para proteger la integridad de su familia y la seguridad digital de sus hijos.\n\n" +
                                   "1. Recopilación de Datos\nKinderGuard solo recopila la información estrictamente necesaria. No almacenamos conversaciones privadas.\n\n" +
                                   "2. Responsabilidad Parental\nEl servicio no sustituye la supervisión parental activa.\n\n" +
                                   "3. Seguridad del Entorno\nNuestra base de datos se recomienda actualizar cada hora.\n\n" +
                                   "4. Cancelación de Servicio\nUsted puede darse de baja en cualquier momento y sus datos serán eliminados.",
                            style = MaterialTheme.typography.bodySmall,
                            lineHeight = 18.sp
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(100.dp)) // Padding for bottom bar
        }
    }
}

@Composable
fun PolicyValueItem(title: String, description: String, icon: androidx.compose.ui.graphics.vector.ImageVector, iconColor: Color) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        shadowElevation = 2.dp
    ) {
        Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(modifier = Modifier.size(48.dp), shape = CircleShape, color = iconColor) {
                Icon(icon, contentDescription = null, modifier = Modifier.padding(12.dp), tint = Color.DarkGray)
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Text(description, style = MaterialTheme.typography.labelMedium, color = Color.Gray)
            }
        }
    }
}
