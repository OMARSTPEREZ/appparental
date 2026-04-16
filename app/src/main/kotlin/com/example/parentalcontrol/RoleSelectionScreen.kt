package com.example.parentalcontrol

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Help
import androidx.compose.material3.*
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.border
import com.example.parentalcontrol.utils.SecurityManager
import androidx.compose.runtime.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.PasswordVisualTransformation
import com.example.parentalcontrol.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoleSelectionScreen(
    forcedRole: String? = null,
    onBack: () -> Unit = {},
    onRoleSelected: (String, String?) -> Unit
) {
    val context = LocalContext.current
    val securityManager = remember { SecurityManager(context) }
    
    var showSetPinDialog by remember { mutableStateOf(false) }
    var showVerifyPinDialog by remember { mutableStateOf(false) }
    var pinInput by remember { mutableStateOf("") }
    var pinError by remember { mutableStateOf<String?>(null) }
    var pairingCodeInput by remember { mutableStateOf("") }
    var pairingCodeError by remember { mutableStateOf<String?>(null) }
    var tempThemeForPairing by remember { mutableStateOf<String?>(null) }

    val backgroundColor = Color(0xFFFDF6EE)
    val cardColor = Color.White
    val adminIconColor = Color(0xFFFFCC80)
    val childIconColor = Color(0xFFBBDEFB)


    // Botón Atrás (General)
    Box(modifier = Modifier.fillMaxSize()) {
        IconButton(
            onClick = onBack,
            modifier = Modifier
                .statusBarsPadding()
                .padding(16.dp)
                .align(Alignment.TopStart)
        ) {
            Icon(Icons.Default.ArrowBack, contentDescription = "Atrás", tint = Color.Gray)
        }
    }

    var showGenderDialog by remember { mutableStateOf(false) }
    var showPairingCodeDialog by remember { mutableStateOf(forcedRole == "CHILD") }
    
    if (showGenderDialog) {
        AlertDialog(
            onDismissRequest = { showGenderDialog = false },
            title = {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Text("👶", fontSize = 40.sp)
                    Spacer(Modifier.height(8.dp))
                    Text("¿Quién usará este dispositivo?", fontWeight = FontWeight.Black, fontSize = 18.sp, textAlign = TextAlign.Center)
                    Text("Esto personalizará los colores y la experiencia", fontSize = 12.sp, color = Color.Gray, textAlign = TextAlign.Center)
                }
            },
            text = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Tarjeta Niño
                    Surface(
                        onClick = {
                            showGenderDialog = false
                            onRoleSelected("CHILD_CODE:$pairingCodeInput", "BOY")
                        },
                        shape = RoundedCornerShape(20.dp),
                        color = Color(0xFFE3F2FD),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(vertical = 24.dp, horizontal = 8.dp)
                        ) {
                            Text("👦", fontSize = 48.sp)
                            Spacer(Modifier.height(10.dp))
                            Text("Niño", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color(0xFF1565C0))
                            Spacer(Modifier.height(4.dp))
                            Text("Tema Azul", fontSize = 11.sp, color = Color(0xFF42A5F5))
                        }
                    }

                    // Tarjeta Niña
                    Surface(
                        onClick = {
                            showGenderDialog = false
                            onRoleSelected("CHILD_CODE:$pairingCodeInput", "GIRL")
                        },
                        shape = RoundedCornerShape(20.dp),
                        color = Color(0xFFFCE4EC),
                        modifier = Modifier.weight(1f)
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(vertical = 24.dp, horizontal = 8.dp)
                        ) {
                            Text("👧", fontSize = 48.sp)
                            Spacer(Modifier.height(10.dp))
                            Text("Niña", fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color(0xFFC2185B))
                            Spacer(Modifier.height(4.dp))
                            Text("Tema Rosa", fontSize = 11.sp, color = Color(0xFFEC407A))
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { 
                    showGenderDialog = false
                    showPairingCodeDialog = true
                }) {
                    Text("Volver", color = Color.Gray)
                }
            }
        )
    }

    if (showPairingCodeDialog) {
        AlertDialog(
            onDismissRequest = { 
                showPairingCodeDialog = false
                if (forcedRole == "CHILD") onBack()
            },
            title = {
                Box(modifier = Modifier.fillMaxWidth()) {
                    IconButton(
                        onClick = { 
                            showPairingCodeDialog = false
                            if (forcedRole == "CHILD") onBack()
                        },
                        modifier = Modifier.align(Alignment.TopStart).offset(x = (-12).dp, y = (-12).dp)
                    ) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Regresar", tint = Color.Gray)
                    }
                    
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                        Text("🔗", fontSize = 40.sp)
                        Spacer(Modifier.height(8.dp))
                        Text("Vincular con Tutor", fontWeight = FontWeight.Black)
                        Text("Ingresa el código de 8 dígitos de la app de tu padre", fontSize = 12.sp, color = Color.Gray, textAlign = TextAlign.Center)
                    }
                }
            },
            text = {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    BasicTextField(
                        value = pairingCodeInput,
                        onValueChange = { if (it.length <= 8) pairingCodeInput = it.uppercase() },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
                        decorationBox = { innerTextField ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                repeat(8) { index ->
                                    val char = pairingCodeInput.getOrNull(index)
                                    val isFocused = index == pairingCodeInput.length
                                    
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .aspectRatio(0.8f)
                                            .background(
                                                color = if (char != null) Color.White else Color(0xFFF5F5F5),
                                                shape = RoundedCornerShape(8.dp)
                                            )
                                            .border(
                                                width = if (isFocused) 2.dp else 1.dp,
                                                color = if (isFocused) MaterialTheme.colorScheme.primary else if (char != null) Color.LightGray else Color.Transparent,
                                                shape = RoundedCornerShape(8.dp)
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (char != null) {
                                            Text(
                                                text = char.toString(),
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.primary,
                                                fontSize = 20.sp
                                            )
                                        }
                                    }
                                    
                                    if (index == 3) {
                                        Spacer(modifier = Modifier.width(12.dp))
                                    } else if (index < 7) {
                                        Spacer(modifier = Modifier.width(4.dp))
                                    }
                                }
                            }
                        }
                    )
                    
                    if (pairingCodeError != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(pairingCodeError!!, color = Color.Red, fontSize = 12.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (pairingCodeInput.length == 8) {
                            showPairingCodeDialog = false
                            showGenderDialog = true
                        } else {
                            pairingCodeError = "Ingresa 8 caracteres"
                        }
                    },
                    shape = RoundedCornerShape(12.dp)
                ) { Text("Siguiente") }
            },
            dismissButton = {
                TextButton(onClick = { 
                    showPairingCodeDialog = false
                    if (forcedRole == "CHILD") onBack() 
                }) { Text("Cancelar") }
            }
        )
    }

    if (forcedRole == "CHILD") {
        Box(modifier = Modifier.fillMaxSize().background(backgroundColor))
    } else {
        Scaffold(
            containerColor = backgroundColor,
            topBar = {
                TopAppBar(
                    title = { 
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(painterResource(id = R.drawable.img_floating_icons), contentDescription = null, modifier = Modifier.size(24.dp), tint = Color(0xFF8B5E00))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Kiboo", fontWeight = FontWeight.Black, color = Color(0xFF3E2723))
                        }
                    },
                    actions = {
                        IconButton(onClick = { /* Help */ }) {
                            Icon(Icons.Default.Info, contentDescription = "Info", tint = Color.Gray)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
                )
            },
            bottomBar = {
                BottomAppBar(
                    containerColor = Color.Transparent,
                    tonalElevation = 0.dp
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable { }) {
                            Icon(Icons.Default.Help, contentDescription = "Help")
                            Text("Help", style = MaterialTheme.typography.labelSmall)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable { }) {
                            Icon(Icons.Default.Settings, contentDescription = "Settings")
                            Text("Settings", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(20.dp))
                
                Text(
                    text = "¿Quién usará este\ndispositivo?",
                    style = MaterialTheme.typography.headlineLarge.copy(
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center,
                        color = Color(0xFF3E2723),
                        lineHeight = 40.sp
                    )
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Text(
                    text = "Selecciona tu perfil para comenzar la configuración personalizada.",
                    style = MaterialTheme.typography.bodyMedium.copy(
                        textAlign = TextAlign.Center,
                        color = Color.Gray
                    ),
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
                
                Spacer(modifier = Modifier.height(48.dp))
                
                // Perfil Padre
                RoleCard(
                    title = "Padre / Administrador",
                    description = "Controla el tiempo de pantalla, bloquea aplicaciones y supervisa la actividad.",
                    icon = painterResource(id = R.drawable.img_robot),
                    iconBackgroundColor = adminIconColor,
                    tag = "ADMIN",
                    onClick = { onRoleSelected("ADMIN", null) }
                )
                
                Spacer(modifier = Modifier.height(24.dp))
                
                // Perfil Hijo
                RoleCard(
                    title = "Hijo",
                    description = "Usa el dispositivo de forma segura bajo la guía de tus padres.",
                    icon = painterResource(id = R.drawable.img_robot),
                    iconBackgroundColor = childIconColor,
                    onClick = { showPairingCodeDialog = true }
                )
            }
        }
    }
}

@Composable
fun RoleCard(
    title: String,
    description: String,
    icon: androidx.compose.ui.graphics.painter.Painter,
    iconBackgroundColor: Color,
    tag: String? = null,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(32.dp),
        color = Color.White,
        shadowElevation = 4.dp
    ) {
        Box {
            if (tag != null) {
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(top = 16.dp, end = 24.dp),
                    color = Color(0xFF64B5F6),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        text = tag,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                        color = Color.White
                    )
                }
            }
            
            Row(
                modifier = Modifier
                    .padding(24.dp)
                    .fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    modifier = Modifier.size(64.dp),
                    shape = CircleShape,
                    color = iconBackgroundColor
                ) {
                    Image(
                        painter = icon,
                        contentDescription = null,
                        modifier = Modifier.padding(12.dp)
                    )
                }
                
                Spacer(modifier = Modifier.width(20.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        color = Color(0xFF3E2723)
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = description,
                        style = MaterialTheme.typography.bodyMedium.copy(color = Color.Gray),
                        lineHeight = 20.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Icon(
                        Icons.Default.ArrowForward,
                        contentDescription = null,
                        tint = Color(0xFFE65100),
                        modifier = Modifier.align(Alignment.End)
                    )
                }
            }
        }
    }
}
