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
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.ui.viewinterop.AndroidView
import com.google.zxing.*
import com.google.zxing.common.HybridBinarizer
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.Manifest
import android.content.pm.PackageManager

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
    var showQrScanner by remember { mutableStateOf(false) }
    
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) showQrScanner = true
        else android.widget.Toast.makeText(context, "Se necesita permiso de cámara", android.widget.Toast.LENGTH_SHORT).show()
    }
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

                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedButton(
                        onClick = {
                            if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                                showQrScanner = true
                            } else {
                                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("📷 ESCANEAR CÓDIGO QR", fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (pairingCodeInput.length == 8) {
                            showPairingCodeDialog = false
                            // Saltar selección de género y usar Niño (Azul) por defecto
                            onRoleSelected("CHILD_CODE:$pairingCodeInput", "BOY")
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

    if (showQrScanner) {
        QrScannerDialog(
            onDismiss = { showQrScanner = false },
            onCodeScanned = { code ->
                showQrScanner = false
                pairingCodeInput = code
                // Autoconfirmar si el código es válido
                if (code.length == 8) {
                    showPairingCodeDialog = false
                    onRoleSelected("CHILD_CODE:$code", "BOY")
                }
            }
        )
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

@Composable
fun QrScannerDialog(
    onDismiss: () -> Unit,
    onCodeScanned: (String) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = Color.Black
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                AndroidView(
                    factory = { ctx ->
                        val previewView = PreviewView(ctx)
                        val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                        
                        cameraProviderFuture.addListener({
                            val cameraProvider = cameraProviderFuture.get()
                            val preview = Preview.Builder().build().also {
                                it.setSurfaceProvider(previewView.surfaceProvider)
                            }
                            
                            val imageAnalysis = ImageAnalysis.Builder()
                                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                .build()
                            
                            imageAnalysis.setAnalyzer(ContextCompat.getMainExecutor(ctx)) { imageProxy ->
                                val buffer = imageProxy.planes[0].buffer
                                val data = ByteArray(buffer.remaining())
                                buffer.get(data)
                                
                                val source = PlanarYUVLuminanceSource(
                                    data, imageProxy.width, imageProxy.height,
                                    0, 0, imageProxy.width, imageProxy.height, false
                                )
                                val binarizer = HybridBinarizer(source)
                                val binaryBitmap = BinaryBitmap(binarizer)
                                
                                try {
                                    val result = MultiFormatReader().decode(binaryBitmap)
                                    val code = result.text
                                    if (code.startsWith("KIBOO_LINK:")) {
                                        val actualCode = code.substringAfter(":")
                                        onCodeScanned(actualCode)
                                    }
                                } catch (e: Exception) {
                                    // No QR found
                                } finally {
                                    imageProxy.close()
                                }
                            }
                            
                            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
                            
                            try {
                                cameraProvider.unbindAll()
                                cameraProvider.bindToLifecycle(
                                    lifecycleOwner, cameraSelector, preview, imageAnalysis
                                )
                            } catch (e: Exception) {
                                Log.e("QrScanner", "Camera binding failed", e)
                            }
                        }, ContextCompat.getMainExecutor(ctx))
                        
                        previewView
                    },
                    modifier = Modifier.fillMaxSize()
                )
                
                // Overlay
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(250.dp)
                            .border(2.dp, Color.White.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Text("Apunta al código QR del padre", color = Color.White, fontWeight = FontWeight.Bold)
                }
                
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier.align(Alignment.TopStart).padding(16.dp).statusBarsPadding()
                ) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Cerrar", tint = Color.White)
                }
            }
        }
    }
}
