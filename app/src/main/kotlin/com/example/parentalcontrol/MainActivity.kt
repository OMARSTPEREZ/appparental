package com.example.parentalcontrol

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import android.os.PowerManager
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import android.graphics.ImageDecoder
import android.provider.MediaStore
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.clickable
import androidx.compose.ui.layout.ContentScale
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.QuestionAnswer
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Update
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.Map
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Info
import androidx.compose.ui.platform.LocalContext
import android.media.AudioTrack
import android.media.AudioFormat
import android.media.AudioManager
import java.io.File
import java.io.FileOutputStream
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.VideoLibrary

import androidx.core.graphics.drawable.toBitmap
import androidx.core.content.ContextCompat
import androidx.compose.ui.graphics.Brush
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.animation.core.*
import androidx.compose.foundation.border
import androidx.compose.material.icons.filled.TouchApp
import androidx.compose.material.icons.filled.PanTool
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Audiotrack
import android.util.Base64
import android.graphics.BitmapFactory
import com.example.parentalcontrol.models.Rule
import com.example.parentalcontrol.models.SubscriptionData
import com.example.parentalcontrol.services.MonitoringService
import com.example.parentalcontrol.utils.FirebaseSyncManager
import com.example.parentalcontrol.utils.RulesManager
import com.example.parentalcontrol.utils.SessionManager
import com.example.parentalcontrol.ui.AnimatedKibooIcon
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.Dispatchers
import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.withContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.background
import androidx.compose.ui.res.painterResource
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import com.example.parentalcontrol.utils.SecurityManager
import com.example.parentalcontrol.R
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import com.example.parentalcontrol.utils.AdminReceiver
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap

fun generateQrBitmap(content: String, size: Int = 512): Bitmap {
    val hints = mapOf(EncodeHintType.MARGIN to 1)
    val bits = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, size, size, hints)
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
    for (x in 0 until size) {
        for (y in 0 until size) {
            bmp.setPixel(x, y, if (bits[x, y]) AndroidColor.BLACK else AndroidColor.WHITE)
        }
    }
    return bmp
}

class MainActivity : ComponentActivity() {
    private lateinit var auth: FirebaseAuth
    private lateinit var googleSignInClient: GoogleSignInClient
    private lateinit var sessionManager: SessionManager
    private var isLoading by mutableStateOf(false)

    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                val account = task.getResult(ApiException::class.java)!!
                firebaseAuthWithGoogle(account.idToken!!)
            } catch (e: ApiException) {
                isLoading = false
                android.util.Log.e("MainActivity", "Google sign in failed", e)
                Toast.makeText(this, "Error de Google: ${e.statusCode}", Toast.LENGTH_LONG).show()
            }
        } else {
            isLoading = false
            android.util.Log.e("MainActivity", "Google sign in result failed: ${result.resultCode}")
            Toast.makeText(this, "Inicio de sesión cancelado o fallido (${result.resultCode})", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        auth = Firebase.auth
        sessionManager = SessionManager(this)
        
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id)) 
            .requestEmail()
            .build()
        googleSignInClient = GoogleSignIn.getClient(this, gso)

        setContent {
            var currentUser by remember { mutableStateOf(auth.currentUser) }
            var userRole by remember { mutableStateOf(sessionManager.getUserRole()) }
            var showRegisterScreen by remember { mutableStateOf(false) }
            var showPoliciesScreen by remember { mutableStateOf(false) }
            var nextStepAfterPolicies by remember { mutableStateOf("MANUAL") } // "MANUAL" o "GOOGLE"
            var showRoleSelectionForChild by remember { mutableStateOf(false) }

            // Auto-asignación segura de rol Admin tras inicio de sesión exitoso
            LaunchedEffect(currentUser, showRoleSelectionForChild) {
                if (currentUser != null && userRole == SessionManager.ROLE_NONE && !showRoleSelectionForChild) {
                    sessionManager.saveUserRole(SessionManager.ROLE_ADMIN)
                    userRole = SessionManager.ROLE_ADMIN
                }
            }
            
            var globalAppTheme by remember { mutableStateOf(sessionManager.getAppTheme()) }
            val firebaseSyncManager = remember(currentUser) { FirebaseSyncManager(currentUser?.uid ?: "anonymous") }
            
            // Perfil del niño (Estados elevados)
            var childName by remember { mutableStateOf("") }
            var childAvatar by remember { mutableStateOf("🤖") }
            var childBirthDate by remember { mutableStateOf(0L) }
            var childAge by remember { mutableStateOf(0) }
            var linkedParentUid by remember { mutableStateOf<String?>(null) }
            
            // Gestor de imagen de galería
            val galleryLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: android.net.Uri? ->
                uri?.let {
                    try {
                        val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                            android.graphics.ImageDecoder.decodeBitmap(android.graphics.ImageDecoder.createSource(contentResolver, it))
                        } else {
                            android.provider.MediaStore.Images.Media.getBitmap(contentResolver, it)
                        }
                        val stream = java.io.ByteArrayOutputStream()
                        bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 50, stream)
                        childAvatar = android.util.Base64.encodeToString(stream.toByteArray(), android.util.Base64.DEFAULT)
                    } catch (e: Exception) {
                        Toast.makeText(this, "Error al procesar imagen", Toast.LENGTH_SHORT).show()
                    }
                }
            }

            Box(modifier = Modifier.fillMaxSize()) {
                ParentalControlTheme(appTheme = globalAppTheme) {
                    Box(modifier = Modifier.fillMaxSize()) {
                        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                            var showDisclosures by remember { mutableStateOf(false) }
                            var showTutorConsent by remember { mutableStateOf(false) }
                            var showChildProfileSetup by remember { mutableStateOf(false) }
                            var tempSelectedRole by remember { mutableStateOf<String?>(null) }

                            // DIÁLOGO DE PERFIL DEL NIÑO (NUEVO)
                        if (showChildProfileSetup) {
                            AlertDialog(
                                onDismissRequest = { },
                                title = { 
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                                        Text("🎨", fontSize = 40.sp)
                                        Spacer(Modifier.height(8.dp))
                                        Text("Configura el Perfil", fontWeight = FontWeight.Black, fontSize = 20.sp) 
                                    }
                                },
                                text = {
                                    Column(verticalArrangement = Arrangement.spacedBy(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                        // Avatar Selection
                                        Box(contentAlignment = Alignment.BottomEnd) {
                                            Surface(
                                                modifier = Modifier.size(100.dp),
                                                shape = CircleShape,
                                                color = MaterialTheme.colorScheme.primaryContainer
                                            ) {
                                                Box(contentAlignment = Alignment.Center) {
                                                    if (childAvatar.length < 5) { // Es un emoji
                                                        Text(childAvatar, fontSize = 50.sp)
                                                    } else { // Es Base64
                                                        val bytes = android.util.Base64.decode(childAvatar, android.util.Base64.DEFAULT)
                                                        val bitmap = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                                                        Image(
                                                            bitmap = bitmap.asImageBitmap(), 
                                                            contentDescription = null, 
                                                            modifier = Modifier.fillMaxSize().clip(CircleShape),
                                                            contentScale = ContentScale.Crop
                                                        )
                                                    }
                                                }
                                            }
                                            IconButton(
                                                onClick = { galleryLauncher.launch("image/*") },
                                                modifier = Modifier.background(MaterialTheme.colorScheme.primary, CircleShape).size(32.dp)
                                            ) {
                                                Icon(Icons.Default.Add, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                            }
                                        }

                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            listOf("🤖", "🐱", "🐶", "🦊", "🦁").forEach { emoji ->
                                                Surface(
                                                    onClick = { childAvatar = emoji },
                                                    shape = CircleShape,
                                                    color = if (childAvatar == emoji) MaterialTheme.colorScheme.secondaryContainer else Color.Transparent,
                                                    border = if (childAvatar == emoji) androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null
                                                ) {
                                                    Text(emoji, fontSize = 24.sp, modifier = Modifier.padding(8.dp))
                                                }
                                            }
                                        }

                                        OutlinedTextField(
                                            value = childName,
                                            onValueChange = { childName = it },
                                            label = { Text("Nombre del Niño(a)") },
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp)
                                        )

                                        Button(
                                            onClick = {
                                                val calendar = java.util.Calendar.getInstance()
                                                val datePickerDialog = android.app.DatePickerDialog(
                                                    this@MainActivity,
                                                    { _, year, month, day ->
                                                        val birth = java.util.Calendar.getInstance()
                                                        birth.set(year, month, day)
                                                        childBirthDate = birth.timeInMillis
                                                        val today = java.util.Calendar.getInstance()
                                                        var age = today.get(java.util.Calendar.YEAR) - birth.get(java.util.Calendar.YEAR)
                                                        if (today.get(java.util.Calendar.DAY_OF_YEAR) < birth.get(java.util.Calendar.DAY_OF_YEAR)) age--
                                                        childAge = age
                                                    },
                                                    calendar.get(java.util.Calendar.YEAR) - 10,
                                                    calendar.get(java.util.Calendar.MONTH),
                                                    calendar.get(java.util.Calendar.DAY_OF_MONTH)
                                                )
                                                datePickerDialog.show()
                                            },
                                            modifier = Modifier.fillMaxWidth(),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color.Gray.copy(alpha = 0.1f)),
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Text(
                                                if (childBirthDate == 0L) "📅 Seleccionar Fecha de Nacimiento" 
                                                else "🎂 Edad: $childAge años",
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                        }
                                    }
                                },
                                confirmButton = {
                                    Button(
                                        onClick = {
                                            showChildProfileSetup = false
                                            showTutorConsent = true
                                            firebaseSyncManager.syncChildProfile(childName, childAvatar, childBirthDate, childAge)
                                            
                                            // REGISTRO EN LISTA DEL PADRE
                                            linkedParentUid?.let { parentUid ->
                                                val androidId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
                                                firebaseSyncManager.registerDeviceToParent(
                                                    parentUid = parentUid,
                                                    childId = androidId,
                                                    name = childName,
                                                    avatar = childAvatar
                                                )
                                            }
                                        },
                                        enabled = childName.isNotBlank() && childBirthDate != 0L,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text("SIGUIENTE")
                                    }
                                },
                                dismissButton = {
                                    TextButton(onClick = { showChildProfileSetup = false }) { Text("Cancelar") }
                                }
                            )
                        }
                        
                        // DIÁLOGO DE CONSENTIMIENTO DEL TUTOR (NUEVO)
                        if (showTutorConsent) {
                            var acceptedTerms by remember { mutableStateOf(false) }
                            var acceptedLaws by remember { mutableStateOf(false) }

                            AlertDialog(
                                onDismissRequest = { },
                                title = { 
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                                        Text("🛡️", fontSize = 40.sp)
                                        Spacer(Modifier.height(8.dp))
                                        Text("Conocimiento del Tutor", fontWeight = FontWeight.Black, fontSize = 20.sp) 
                                    }
                                },
                                text = {
                                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                        Text(
                                            "Confirmo que soy el tutor o representante legal y he instalado esta aplicación voluntariamente para mi hijo(a). Autorizo el uso de Kiboo para la protección y supervisión de este dispositivo.",
                                            style = MaterialTheme.typography.bodyMedium,
                                            textAlign = TextAlign.Center
                                        )
                                        
                                        Divider(color = Color.LightGray.copy(alpha = 0.5f))

                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Checkbox(checked = acceptedTerms, onCheckedChange = { acceptedTerms = it })
                                            Text("He leído y acepto las políticas y términos.", fontSize = 12.sp, modifier = Modifier.clickable { acceptedTerms = !acceptedTerms })
                                        }

                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Checkbox(checked = acceptedLaws, onCheckedChange = { acceptedLaws = it })
                                            Text("Acepto cumplir con todas las leyes y normativas de la aplicación.", fontSize = 12.sp, modifier = Modifier.clickable { acceptedLaws = !acceptedLaws })
                                        }
                                        
                                        Text(
                                            "Si tocas el botón aceptar confirmas que eres el tutor legal del usuario de este dispositivo.",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color.Gray,
                                            textAlign = TextAlign.Center,
                                            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)
                                        )
                                    }
                                },
                                confirmButton = {
                                    Button(
                                        onClick = {
                                            showTutorConsent = false
                                            showDisclosures = true
                                        },
                                        enabled = acceptedTerms && acceptedLaws,
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Text("ACEPTAR")
                                    }
                                },
                                dismissButton = {
                                    TextButton(onClick = { showTutorConsent = false }) { Text("Cancelar", color = Color.Gray) }
                                },
                                containerColor = Color.White,
                                shape = RoundedCornerShape(28.dp)
                            )
                        }

                        if (showDisclosures) {
                            AlertDialog(
                                onDismissRequest = { },
                                title = { Text("Privacidad y Permisos", fontWeight = FontWeight.Bold) },
                                text = {
                                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text("Kiboo requiere accesos de sistema para proteger este dispositivo:")
                                        Text("• Administrador del Equipo: Para prevenir desinstalaciones.", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        Text("• Accesibilidad y Notificaciones: Para recolectar tiempo en pantalla interceptar mensajes.", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        Text("• Superposición: Para sobreescribir y bloquear visualmente otras apps.", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        Text("Al aceptar, otorgas el consentimiento explícito de monitoreo constante de la actividad del equipo hacia la cuenta del Administrador.")
                                    }
                                },
                                confirmButton = {
                                    Button(onClick = {
                                        showDisclosures = false
                                        val role = tempSelectedRole!!
                                        sessionManager.saveUserRole(role)
                                        userRole = role
                                        
                                        val componentName = ComponentName(this@MainActivity, AdminReceiver::class.java)
                                        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                                            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, componentName)
                                            putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Necesario para restringir la desinstalación y proteger el dispositivo.")
                                        }
                                        startActivity(intent)

                                        startMonitoringService()
                                    }) { Text("Aceptar y Continuar") }
                                },
                                dismissButton = {
                                    TextButton(onClick = { showDisclosures = false }) { Text("Cancelar") }
                                }
                            )
                        }

                        if (currentUser == null && !showRoleSelectionForChild) {
                            if (showPoliciesScreen) {
                                PoliciesScreen(
                                    onAccept = {
                                        showPoliciesScreen = false
                                        if (nextStepAfterPolicies == "MANUAL") {
                                            showRegisterScreen = true
                                        } else {
                                            isLoading = true
                                            signInWithGoogle()
                                        }
                                    },
                                    onBack = { showPoliciesScreen = false }
                                )
                            } else if (showRegisterScreen) {
                                RegisterScreen(
                                    onRegisterSuccess = { email, pass ->
                                        isLoading = true
                                        registerWithEmailPassword(email, pass) { success ->
                                            isLoading = false
                                            if (success) {
                                                currentUser = auth.currentUser
                                                showRegisterScreen = false
                                            }
                                        }
                                    },
                                    onBackClick = { showRegisterScreen = false }
                                )
                            } else {
                                OnboardingScreen(
                                    onRegisterClick = { 
                                        nextStepAfterPolicies = "MANUAL"
                                        showPoliciesScreen = true 
                                    },
                                    onGoogleSignInClick = { 
                                        nextStepAfterPolicies = "GOOGLE"
                                        showPoliciesScreen = true
                                    },
                                    onChildLoginClick = {
                                        // Entrada Directa para el Hijo
                                        userRole = SessionManager.ROLE_NONE
                                        showRoleSelectionForChild = true
                                    }
                                )
                            }
                        } else if (userRole == SessionManager.ROLE_NONE) {
                            if (showRoleSelectionForChild || userRole == SessionManager.ROLE_NONE) {
                                RoleSelectionScreen(
                                    forcedRole = if (showRoleSelectionForChild) "CHILD" else null,
                                    onBack = { 
                                        showRoleSelectionForChild = false 
                                        // Si el usuario no está logueado, regresará al Onboarding automáticamente
                                    },
                                    onRoleSelected = { role, theme ->
                                    if (role.startsWith("CHILD_CODE:")) {
                                        val code = role.substringAfter(":")
                                        isLoading = true
                                        firebaseSyncManager.linkWithCode(code) { parentUid ->
                                            isLoading = false
                                            if (parentUid != null) {
                                                if (theme != null) {
                                                    globalAppTheme = theme
                                                    sessionManager.setAppTheme(theme)
                                                }
                                                // Redireccionar al wizard de perfil en lugar de entrar de golpe
                                                linkedParentUid = parentUid
                                                tempSelectedRole = SessionManager.ROLE_CHILD
                                                showChildProfileSetup = true
                                            } else {
                                                Toast.makeText(this@MainActivity, "Código inválido o expirado", Toast.LENGTH_LONG).show()
                                            }
                                        }
                                    } else if (role == SessionManager.ROLE_CHILD) {
                                        // Este camino es si el usuario elige manual (ya no es común con el botón directo)
                                        tempSelectedRole = role
                                        if (theme != null) {
                                            globalAppTheme = theme
                                            sessionManager.setAppTheme(theme)
                                        }
                                        showChildProfileSetup = true 
                                    } else {
                                        // Este camino es si entra como Padre manual
                                        sessionManager.saveUserRole(role)
                                        userRole = role
                                        showRoleSelectionForChild = false
                                    }
                                })
                            }
                        } else {
                            if (userRole == SessionManager.ROLE_ADMIN) {
                                MainScreen(
                                    appTheme = globalAppTheme,
                                    syncManager = firebaseSyncManager,
                                    onThemeChange = { newTheme -> 
                                        globalAppTheme = newTheme
                                        sessionManager.setAppTheme(newTheme)
                                    },
                                    onLogout = {
                                        auth.signOut()
                                        googleSignInClient.signOut()
                                        sessionManager.clearSession()
                                        currentUser = null
                                        userRole = SessionManager.ROLE_NONE
                                    }
                                )
                            } else {
                                ChildDashboard(
                                    onLogout = {
                                        auth.signOut()
                                        sessionManager.clearSession()
                                        currentUser = null
                                        userRole = SessionManager.ROLE_NONE
                                    },
                                    syncManager = firebaseSyncManager,
                                    appTheme = globalAppTheme
                                )
                            }
                        }
                    }

                    // Loading Overlay
                    if (isLoading) {
                        Surface(
                            modifier = Modifier.fillMaxSize(),
                            color = Color.Black.copy(alpha = 0.5f)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxSize(),
                                verticalArrangement = Arrangement.Center,
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                CircularProgressIndicator(color = Color.White)
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    text = "Iniciando sesión...",
                                    color = Color.White,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
                
                // ASISTENTE DE AYUDA GLOBAL (Flotante)
                HelpAssistantFloatingButton(modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp))
            }
        }
    }
}

    private fun startMonitoringService() {
        val intent = Intent(this, MonitoringService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun registerWithEmailPassword(email: String, pass: String, onResult: (Boolean) -> Unit) {
        auth.createUserWithEmailAndPassword(email, pass)
            .addOnCompleteListener(this) { task ->
                if (task.isSuccessful) {
                    onResult(true)
                } else {
                    val errorMsg = task.exception?.message ?: "Error desconocido"
                    android.util.Log.e("MainActivity", "Registro fallido: $errorMsg")
                    Toast.makeText(this, "Registro fallido: $errorMsg", Toast.LENGTH_LONG).show()
                    onResult(false)
                }
            }
    }

    private fun signInWithGoogle() {
        val signInIntent = googleSignInClient.signInIntent
        googleSignInLauncher.launch(signInIntent)
    }

    private fun firebaseAuthWithGoogle(idToken: String) {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        auth.signInWithCredential(credential)
            .addOnCompleteListener(this) { task ->
                isLoading = false
                if (task.isSuccessful) {
                    recreate()
                } else {
                    Toast.makeText(this, "Authentication Failed.", Toast.LENGTH_SHORT).show()
                }
            }
    }

    @Composable
    fun ChildDashboard(onLogout: () -> Unit, syncManager: FirebaseSyncManager, appTheme: String) {
        val securityManager = remember { SecurityManager(this@MainActivity) }
        var showLogoutConfirmation by remember { mutableStateOf(false) }
        var pinInput by remember { mutableStateOf("") }
        var pinError by remember { mutableStateOf(false) }

        // Datos del perfil sincronizados
        var childName by remember { mutableStateOf("Kiboo") }
        var childAvatar by remember { mutableStateOf("🤖") }
        var childAge by remember { mutableStateOf(0) }

        // Estados de Permisos
        var hasUsageStats by remember { mutableStateOf(hasUsageStatsPermission(this)) }
        var hasOverlay by remember { mutableStateOf(Settings.canDrawOverlays(this)) }
        var hasNotification by remember { mutableStateOf(isNotificationListenerEnabled(this)) }
        
        // Device Admin State
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, AdminReceiver::class.java)
        var isAdminActive by remember { mutableStateOf(dpm.isAdminActive(adminComponent)) }

        // Battery Optimization State
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        var isIgnoringBattery by remember { mutableStateOf(powerManager.isIgnoringBatteryOptimizations(packageName)) }

        val allPermissionsOk = hasUsageStats && hasOverlay && hasNotification && isAdminActive && isIgnoringBattery
        
        var showPermissionsDialog by remember { mutableStateOf(false) }
        var showNoticeDialog by remember { mutableStateOf(!allPermissionsOk) }
        var showAdvancedDialog by remember { mutableStateOf(false) }
        var showLevel3Dialog by remember { mutableStateOf(false) }
        var isStudyModeActive by remember { mutableStateOf(false) }
        var selectedGuidePermission by remember { mutableStateOf<String?>(null) }

        // Datos del Tutor
        val tutorEmail = auth.currentUser?.email ?: "Administrador"


        // Lanzador de permisos avanzados
        val advancedPermissionsLauncher = rememberLauncherForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { results ->
            if (results.all { it.value }) {
                Toast.makeText(this@MainActivity, "🛡️ Protección Total Activada", Toast.LENGTH_SHORT).show()
            }
            showAdvancedDialog = false
            showLevel3Dialog = true // Sigiente nivel: Persistencia
        }

        // Diálogo de Aviso Inicial (Si faltan permisos)
        if (showNoticeDialog && !allPermissionsOk) {
            PermissionNoticeDialog(
                onDismiss = { 
                    showNoticeDialog = false
                    showAdvancedDialog = true 
                },
                onGrantClicked = {
                    showNoticeDialog = false
                    showPermissionsDialog = true
                },
                missingNotifications = !hasNotification,
                missingLocation = true
            )
        }

        // Diálogo de Protección Total (Nivel 2)
        if (showAdvancedDialog) {
            AdvancedProtectionDialog(
                onDismiss = { 
                    showAdvancedDialog = false
                    showLevel3Dialog = true 
                },
                onEnableClicked = {
                    val permissions = mutableListOf(
                        android.Manifest.permission.READ_CONTACTS,
                        android.Manifest.permission.READ_SMS
                    )
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        permissions.add(android.Manifest.permission.READ_MEDIA_IMAGES)
                    } else {
                        permissions.add(android.Manifest.permission.READ_EXTERNAL_STORAGE)
                    }
                    advancedPermissionsLauncher.launch(permissions.toTypedArray())
                }
            )
        }

        // Diálogo Final: Persistencia (Nivel 3)
        if (showLevel3Dialog) {
            Level3ProtectionDialog(
                isAdminActive = isAdminActive,
                isIgnoringBattery = isIgnoringBattery,
                onDismiss = { showLevel3Dialog = false },
                onToggleAdmin = {
                    val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
                        putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
                        putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Kiboo Shield necesita ser administrador para evitar que el niño desinstale la protección.")
                    }
                    startActivity(intent)
                },
                onToggleBatteryOpt = {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                },
                onOpenAutoStart = {
                    val intent = Intent().apply {
                        component = ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")
                    }
                    try { startActivity(intent) } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "Busca 'Auto-inicio' en Ajustes", Toast.LENGTH_LONG).show()
                    }
                },
                onOpenBatterySaver = {
                    startActivity(Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS))
                },
                onDone = { showLevel3Dialog = false }
            )
        }

        // Diálogo de Guía Visual (Al pulsar en el gestor)
        if (selectedGuidePermission != null) {
            PermissionGuideDialog(
                permissionKey = selectedGuidePermission!!,
                onDismiss = { selectedGuidePermission = null },
                onConfirmed = {
                    val p = selectedGuidePermission!!
                    selectedGuidePermission = null
                    // Ejecutar el intent correspondiente
                    when(p) {
                        "USAGE" -> startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                        "OVERLAY" -> startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                        "NOTIFICATION" -> startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                        "ACCESSIBILITY" -> startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    }
                }
            )
        }

        // Verificación periódica al volver a la app
        val lifecycleOwner = androidx.compose.ui.platform.LocalLifecycleOwner.current
        DisposableEffect(lifecycleOwner) {
            val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
                if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                    hasUsageStats = hasUsageStatsPermission(this@MainActivity)
                    hasOverlay = Settings.canDrawOverlays(this@MainActivity)
                    hasNotification = isNotificationListenerEnabled(this@MainActivity)
                }
            }
            lifecycleOwner.lifecycle.addObserver(observer)
            onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
        }

        // Sincronización remota
        LaunchedEffect(Unit) {
            syncManager.listenForAdminPin { newPin ->
                securityManager.savePin(newPin)
                Toast.makeText(this@MainActivity, "🔒 PIN de Seguridad actualizado", Toast.LENGTH_SHORT).show()
            }
            syncManager.listenForChildProfile { name, avatar, age ->
                if (name.isNotBlank()) childName = name
                childAvatar = avatar
                childAge = age
            }
        }

        // Colores Dinámicos según Tema
        val dashboardGradient = when(appTheme) {
            SessionManager.THEME_GIRL -> listOf(Color(0xFF4A148C), Color(0xFF880E4F)) // Púrpura a Magenta
            SessionManager.THEME_DARK -> listOf(Color(0xFF121212), Color(0xFF263238)) // Negro a Gris
            else -> listOf(Color(0xFF0F172A), Color(0xFF1E293B)) // Azul Tecnológico (Boy)
        }
        val accentColor = when(appTheme) {
            SessionManager.THEME_GIRL -> Color(0xFFFF4081)
            SessionManager.THEME_DARK -> Color(0xFFFFB142)
            else -> Color(0xFF00B0FF)
        }

        var showAdminAccess by remember { mutableStateOf(false) }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(dashboardGradient))
        ) {
            // Botón de ayuda/configuración (ADMIN OCULTO)
            IconButton(
                onClick = { showAdminAccess = !showAdminAccess },
                modifier = Modifier
                    .statusBarsPadding()
                    .padding(16.dp)
                    .align(Alignment.TopEnd)
            ) {
                Icon(
                    imageVector = Icons.Default.Info, 
                    contentDescription = "Ayuda", 
                    tint = Color.White.copy(alpha = 0.6f),
                    modifier = Modifier.size(28.dp)
                )
            }
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Escudo protector animado con AVATAR PERSONALIZADO
                Box(contentAlignment = Alignment.Center) {
                    Surface(
                        modifier = Modifier.size(180.dp),
                        shape = CircleShape,
                        color = accentColor.copy(alpha = 0.1f),
                        border = androidx.compose.foundation.BorderStroke(2.dp, accentColor)
                    ) {}
                    
                    if (childAvatar == "🤖") {
                        Image(
                            painter = painterResource(id = R.drawable.img_robot),
                            contentDescription = "Robot Kiboo",
                            modifier = Modifier.size(120.dp).clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    } else if (childAvatar.length < 5) {
                        Text(childAvatar, fontSize = 80.sp)
                    } else {
                        val bytes = android.util.Base64.decode(childAvatar, android.util.Base64.DEFAULT)
                        val bitmap = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                        Image(
                            bitmap = bitmap.asImageBitmap(), 
                            contentDescription = "Avatar",
                            modifier = Modifier.size(120.dp).clip(CircleShape),
                            contentScale = ContentScale.Crop
                        )
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                Text(
                    text = "¡Hola, $childName! 👋",
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Black),
                    color = Color.White
                )
                
                Text(
                    text = if (childAge > 0) "Modo Protección On ($childAge años) 🛡️" else "Kiboo Shield Active 🛡️",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.LightGray,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Tarjeta de Estado de Protección
                Surface(
                    onClick = { showPermissionsDialog = true },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = if (allPermissionsOk) Color(0xFF4CAF50).copy(alpha = 0.1f) else Color(0xFFFF9800).copy(alpha = 0.1f),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp, 
                        if (allPermissionsOk) Color(0xFF4CAF50).copy(alpha = 0.3f) else Color(0xFFFF9800).copy(alpha = 0.3f)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = if (allPermissionsOk) Color(0xFF4CAF50) else Color(0xFFFF9800),
                            modifier = Modifier.size(40.dp)
                        ) {
                            Icon(
                                if (allPermissionsOk) Icons.Default.Lock else Icons.Default.Warning,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                        
                        Spacer(modifier = Modifier.width(16.dp))
                        
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                if (allPermissionsOk) "Protección Blindada Active" else "Protección Parcial",
                                fontWeight = FontWeight.Bold,
                                color = if (allPermissionsOk) Color(0xFF81C784) else Color(0xFFFFB74D)
                            )
                            Text(
                                if (allPermissionsOk) "Kiboo está vigilando este dispositivo." else "Faltan permisos críticos para el escudo.",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.LightGray
                            )
                        }
                        
                        if (!allPermissionsOk) {
                            Icon(Icons.Default.Add, contentDescription = null, tint = Color.White)
                        }
                    }
                }

                if (showPermissionsDialog) {
                    PermissionsManagerDialog(
                        context = this@MainActivity,
                        onDismiss = { showPermissionsDialog = false },
                        hasUsageStats = hasUsageStats,
                        hasOverlay = hasOverlay,
                        hasCamera = true, 
                        hasLocation = true,
                        hasNotification = hasNotification,
                        onTriggerGuide = { permissionKey ->
                            selectedGuidePermission = permissionKey
                        }
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))

                Surface(
                    onClick = { 
                        Toast.makeText(this@MainActivity, "⚠️ Alerta SOS enviada", Toast.LENGTH_LONG).show() 
                    },
                    shape = RoundedCornerShape(24.dp),
                    color = accentColor.copy(alpha = 0.2f),
                    border = androidx.compose.foundation.BorderStroke(2.dp, accentColor),
                    modifier = Modifier.fillMaxWidth().height(64.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxSize(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("🚨 CONTACTAR A PAPÁ", fontWeight = FontWeight.Black, color = accentColor)
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Diálogo de Desvinculación (ADMIN)
                if (showAdminAccess) {
                    AlertDialog(
                        onDismissRequest = { showAdminAccess = false },
                        title = { Text("⚠️ Zona Administrativa", fontWeight = FontWeight.Black) },
                        text = {
                            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                Text("Introduce el PIN para realizar cambios profundos o desvincular el dispositivo.")
                                OutlinedTextField(
                                    value = pinInput,
                                    onValueChange = { 
                                        pinInput = it
                                        pinError = false
                                    },
                                    label = { Text("PIN o Contraseña") },
                                    visualTransformation = PasswordVisualTransformation(),
                                    keyboardOptions = KeyboardOptions(
                                        keyboardType = if (pinInput.any { it.isLetter() }) KeyboardType.Text else KeyboardType.NumberPassword
                                    ),
                                    modifier = Modifier.fillMaxWidth(),
                                    isError = pinError,
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = accentColor,
                                        unfocusedBorderColor = Color.Gray
                                    )
                                )
                                
                                TextButton(
                                    onClick = {
                                        if (securityManager.verifyPin(pinInput)) {
                                            showLogoutConfirmation = true
                                        } else {
                                            pinError = true
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Desvincular Dispositivo", color = Color.Red, fontWeight = FontWeight.Bold)
                                }
                            }
                        },
                        confirmButton = {
                            Button(onClick = { showAdminAccess = false }) { Text("Cerrar") }
                        },
                        containerColor = Color.White
                    )
                }
            }
        }

        if (showLogoutConfirmation) {
            AlertDialog(
                onDismissRequest = { showLogoutConfirmation = false },
                title = { Text("⚠️ Desvinculación de Seguridad") },
                text = { Text("¿Confirmas que deseas desactivar la protección Kiboo en este dispositivo? El administrador recibirá una notificación.") },
                confirmButton = {
                    Button(
                        onClick = {
                            showLogoutConfirmation = false
                            onLogout()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F))
                    ) {
                        Text("Sí, Desvincular")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showLogoutConfirmation = false }) {
                        Text("Cancelar")
                    }
                }
            )
        }
    }


    @Composable
    fun MainScreen(
        appTheme: String,
        syncManager: FirebaseSyncManager,
        onThemeChange: (String) -> Unit,
        onLogout: () -> Unit
    ) {
        val currentUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
        var hasUsageStats by remember { mutableStateOf(hasUsageStatsPermission(this@MainActivity)) }
        var hasOverlay by remember { mutableStateOf(Settings.canDrawOverlays(this@MainActivity)) }
        
        var hasCamera by remember { mutableStateOf(ContextCompat.checkSelfPermission(this@MainActivity, android.Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) }
        var hasLocation by remember { mutableStateOf(ContextCompat.checkSelfPermission(this@MainActivity, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) }
        var hasNotification by remember { mutableStateOf(isNotificationListenerEnabled(this@MainActivity)) }
        
        val rulesManager = remember { RulesManager(this@MainActivity) }
        
        var installedApps by remember { mutableStateOf<List<Map<String, String>>>(emptyList()) }
        var searchQuery by remember { mutableStateOf("") }
        var showInviteDialog by remember { mutableStateOf(false) }
        var showThemeSettingsDialog by remember { mutableStateOf(false) }
        var showChangePinDialog by remember { mutableStateOf(false) }
        
        var childName by remember { mutableStateOf("") }
        var hasNotifiedLink by remember { mutableStateOf(false) }

        if (showChangePinDialog) {
            var newPin by remember { mutableStateOf("") }
            AlertDialog(
                onDismissRequest = { showChangePinDialog = false },
                title = { Text("🔐 Restablecer PIN Maestro", fontWeight = FontWeight.Black) },
                text = {
                    Column {
                        var useLetters by remember { mutableStateOf(newPin.any { it.isLetter() }) }
                        Text("Este PIN se sincronizará automáticamente con todos los dispositivos de tus hijos.", fontSize = 12.sp, color = Color.Gray)
                        Spacer(Modifier.height(16.dp))
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                            Checkbox(checked = useLetters, onCheckedChange = { useLetters = it })
                            Text("Incluir letras (Contraseña)", fontSize = 14.sp)
                        }
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(
                            value = newPin,
                            onValueChange = { newPin = it },
                            label = { Text(if (useLetters) "Nueva Contraseña" else "Nuevo PIN numérico") },
                            keyboardOptions = KeyboardOptions(keyboardType = if (useLetters) KeyboardType.Text else KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            if (newPin.length >= 4) {
                                syncManager.syncAdminPin(newPin)
                                showChangePinDialog = false
                                Toast.makeText(this@MainActivity, "✅ PIN actualizado remotamente", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(this@MainActivity, "El PIN debe ser de al menos 4 dígitos", Toast.LENGTH_SHORT).show()
                            }
                        },
                        shape = RoundedCornerShape(12.dp)
                    ) { Text("Confirmar Cambio") }
                },
                dismissButton = {
                    TextButton(onClick = { showChangePinDialog = false }) { Text("Cancelar") }
                }
            )
        }

        if (showThemeSettingsDialog) {
            AlertDialog(
                onDismissRequest = { showThemeSettingsDialog = false },
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                        Text("✨", fontSize = 36.sp)
                        Spacer(Modifier.height(4.dp))
                        Text("Personalizar Panel", fontWeight = FontWeight.Black, fontSize = 18.sp)
                        Text("Elige el tema visual de Kiboo", fontSize = 12.sp, color = Color.Gray)
                    }
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Surface(
                            onClick = { onThemeChange("BOY") },
                            shape = RoundedCornerShape(16.dp),
                            color = if (appTheme == "BOY") Color(0xFF1976D2) else Color(0xFFE3F2FD),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("👦", fontSize = 32.sp)
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Modo Niño", fontWeight = FontWeight.Black, color = if (appTheme == "BOY") Color.White else Color(0xFF1565C0))
                                    Text("Azul y Celeste", fontSize = 12.sp, color = if (appTheme == "BOY") Color.White.copy(0.8f) else Color(0xFF42A5F5))
                                }
                                if (appTheme == "BOY") Text("✓", color = Color.White, fontWeight = FontWeight.Black, fontSize = 18.sp)
                            }
                        }
                        Surface(
                            onClick = { onThemeChange("GIRL") },
                            shape = RoundedCornerShape(16.dp),
                            color = if (appTheme == "GIRL") Color(0xFFE91E63) else Color(0xFFFCE4EC),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("👧", fontSize = 32.sp)
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Modo Niña", fontWeight = FontWeight.Black, color = if (appTheme == "GIRL") Color.White else Color(0xFFC2185B))
                                    Text("Rosa y Magenta", fontSize = 12.sp, color = if (appTheme == "GIRL") Color.White.copy(0.8f) else Color(0xFFEC407A))
                                }
                                if (appTheme == "GIRL") Text("✓", color = Color.White, fontWeight = FontWeight.Black, fontSize = 18.sp)
                            }
                        }
                        Surface(
                            onClick = { onThemeChange("DARK") },
                            shape = RoundedCornerShape(16.dp),
                            color = if (appTheme == "DARK") Color(0xFF212121) else Color(0xFFEEEEEE),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text("🌙", fontSize = 32.sp)
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Modo Oscuro", fontWeight = FontWeight.Black, color = if (appTheme == "DARK") Color.White else Color(0xFF424242))
                                    Text("Carbón y Naranja", fontSize = 12.sp, color = if (appTheme == "DARK") Color.White.copy(0.8f) else Color.Gray)
                                }
                                if (appTheme == "DARK") Text("✓", color = Color(0xFFFFB142), fontWeight = FontWeight.Black, fontSize = 18.sp)
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(onClick = { showThemeSettingsDialog = false }, modifier = Modifier.fillMaxWidth()) { Text("Guardar", fontWeight = FontWeight.Bold) }
                }
            )
        }
        if (showInviteDialog) {
            AlertDialog(
                onDismissRequest = { showInviteDialog = false },
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                        Text("🔗", fontSize = 40.sp)
                        Spacer(Modifier.height(8.dp))
                        Text("Vinculación Automática", fontWeight = FontWeight.Black)
                        Text("Ingresa este código en el celular del niño", fontSize = 12.sp, color = Color.Gray, textAlign = TextAlign.Center)
                    }
                },
                text = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        var internalPairingCode by remember { mutableStateOf<String?>(null) }
                        LaunchedEffect(Unit) {
                            syncManager.generatePairingCode(auth.currentUser?.uid ?: "anonymous") { code ->
                                internalPairingCode = code ?: "ERROR"
                            }
                        }
                        if (internalPairingCode != null && internalPairingCode != "ERROR") {
                            val formattedCode = if (internalPairingCode!!.length == 8) "${internalPairingCode!!.substring(0, 4)} ${internalPairingCode!!.substring(4)}" else internalPairingCode!!
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(text = formattedCode, fontSize = 42.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary, letterSpacing = 4.sp, textAlign = TextAlign.Center)
                                Spacer(modifier = Modifier.width(8.dp))
                                val context = LocalContext.current
                                IconButton(onClick = {
                                    val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                                    val clip = android.content.ClipData.newPlainText("Código", internalPairingCode!!)
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "Código copiado", Toast.LENGTH_SHORT).show()
                                }) { Icon(Icons.Default.Share, contentDescription = "Copiar Código", tint = MaterialTheme.colorScheme.primary) }
                            }
                            Text("Expira en 10 minutos por seguridad", color = Color.Red, style = MaterialTheme.typography.labelSmall)
                        } else if (internalPairingCode == "ERROR") {
                            Text("Error de red. Intenta de nuevo.", color = Color.Red, fontWeight = FontWeight.Bold)
                        } else {
                            CircularProgressIndicator(modifier = Modifier.size(32.dp), color = MaterialTheme.colorScheme.primary)
                        }
                        Spacer(Modifier.height(8.dp))
                        Text("Instala Kiboo en el dispositivo de tu hijo y selecciona el modo 'Hijo' para ingresar este código.", fontSize = 13.sp, textAlign = TextAlign.Center, color = Color.Gray)
                    }
                },
                confirmButton = {
                    Button(onClick = { showInviteDialog = false }, modifier = Modifier.fillMaxWidth()) { Text("Entendido", fontWeight = FontWeight.Bold) }
                }
            )
        }

        var totalUsageMs by remember { mutableStateOf(0L) }
        var dailyAppsUsage by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
        var showScreenTimeDashboard by remember { mutableStateOf(false) }
        var linkedDevices by remember { mutableStateOf<List<Map<String, String>>>(emptyList()) }
        var selectedDevice by remember { mutableStateOf<Map<String, String>?>(null) }
        var deviceMenuExpanded by remember { mutableStateOf(false) }
        var showAppsManagement by remember { mutableStateOf(false) }
        var showDowntimeScreen by remember { mutableStateOf(false) }
        var subscriptionData by remember { mutableStateOf(SubscriptionData()) }

        LaunchedEffect(currentUser) {
            syncManager.listenForInstalledApps { apps ->
                val uniqueApps = apps.distinctBy { it["packageName"] }
                installedApps = uniqueApps
            }
            syncManager.listenForUsageStats { total, apps ->
                totalUsageMs = total
                dailyAppsUsage = apps
            }
            syncManager.listenForChildProfile { name, _, _ ->
                if (name.isNotBlank() && !hasNotifiedLink) {
                    childName = name
                    hasNotifiedLink = true
                    Toast.makeText(this@MainActivity, "✨ Dispositivo \"$name\" vinculado correctamente.", Toast.LENGTH_LONG).show()
                }
            }
            currentUser?.uid?.let { uid ->
                syncManager.listenForLinkedDevices(uid) { devices ->
                    linkedDevices = devices
                    if (selectedDevice == null && devices.isNotEmpty()) {
                        selectedDevice = devices.first()
                        syncManager.updateChildId(devices.first()["childId"] ?: "")
                    }
                }
                syncManager.listenForSubscription(uid) { sub ->
                    subscriptionData = sub
                }
            }
        }

        if (showScreenTimeDashboard) {
            ScreenTimeDashboard(
                onDismiss = { showScreenTimeDashboard = false },
                totalUsageMs = totalUsageMs,
                dailyAppsUsage = dailyAppsUsage,
                syncManager = syncManager
            )
        } else {
            Box(modifier = Modifier.fillMaxSize()) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // --- CABECERA PREMIUM REDISEÑADA ---
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                brush = Brush.verticalGradient(colors = listOf(Color(0xFF1976D2), Color(0xFF42A5F5))),
                                shape = RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp)
                            )
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .statusBarsPadding()
                                .padding(horizontal = 24.dp, vertical = 24.dp),
                            horizontalAlignment = Alignment.Start
                        ) {
                            // Fila Superior: Selector y Menú
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box {
                                    Row(
                                        modifier = Modifier
                                            .background(Color.White.copy(alpha = 0.15f), RoundedCornerShape(20.dp))
                                            .clickable { if (linkedDevices.isNotEmpty()) deviceMenuExpanded = true }
                                            .padding(horizontal = 12.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Surface(modifier = Modifier.size(24.dp), shape = CircleShape, color = Color.White.copy(alpha = 0.2f)) {
                                            Box(contentAlignment = Alignment.Center) {
                                                val avatar = selectedDevice?.get("avatar") ?: "🤖"
                                                if (avatar.length < 5) Text(avatar, fontSize = 14.sp)
                                                else {
                                                    val bytes = Base64.decode(avatar, Base64.DEFAULT)
                                                    val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                                                    Image(bitmap = bitmap.asImageBitmap(), contentDescription = null, modifier = Modifier.fillMaxSize().clip(CircleShape), contentScale = ContentScale.Crop)
                                                }
                                            }
                                        }
                                        Text(selectedDevice?.get("name") ?: "Seleccionar Dispositivo", color = Color.White, fontWeight = FontWeight.Black, fontSize = 14.sp)
                                        Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    }
                                    DropdownMenu(expanded = deviceMenuExpanded, onDismissRequest = { deviceMenuExpanded = false }, modifier = Modifier.background(Color.White).width(200.dp)) {
                                        linkedDevices.forEach { device ->
                                            DropdownMenuItem(
                                                text = { Text(device["name"] ?: "", fontWeight = FontWeight.Bold) },
                                                onClick = {
                                                    selectedDevice = device
                                                    deviceMenuExpanded = false
                                                    syncManager.updateChildId(device["childId"] ?: "")
                                                }
                                            )
                                        }
                                    }
                                }

                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Surface(onClick = { showInviteDialog = true }, shape = CircleShape, color = Color.White.copy(alpha = 0.15f), modifier = Modifier.size(40.dp)) {
                                        Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.PersonAdd, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp)) }
                                    }
                                    var menuExpanded by remember { mutableStateOf(false) }
                                    Box {
                                        Surface(onClick = { menuExpanded = true }, shape = RoundedCornerShape(16.dp), color = Color.White.copy(alpha = 0.15f), modifier = Modifier.width(36.dp).height(48.dp)) {
                                            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.MoreVert, contentDescription = null, tint = Color.White) }
                                        }
                                        DropdownMenu(expanded = menuExpanded, onDismissRequest = { menuExpanded = false }, modifier = Modifier.background(Color.White).width(200.dp)) {
                                            DropdownMenuItem(text = { Text("⚙️ Configuración") }, onClick = { menuExpanded = false; showThemeSettingsDialog = true })
                                            DropdownMenuItem(text = { Text("🔐 Seguridad") }, onClick = { menuExpanded = false; showChangePinDialog = true })
                                            Divider()
                                            DropdownMenuItem(text = { Text("🚪 Cerrar Sesión", color = Color.Red) }, onClick = { menuExpanded = false; onLogout() })
                                        }
                                    }
                                }
                            }

                            // --- Trial Timer Banner (Discrete Top) ---
                            if (subscriptionData.isTrial && !subscriptionData.isPaid) {
                                val remainingMs = subscriptionData.trialEndsAt - System.currentTimeMillis()
                                if (remainingMs > 0) {
                                    val days = remainingMs / (24 * 3600 * 1000)
                                    val hours = (remainingMs % (24 * 3600 * 1000)) / (3600 * 1000)
                                    val minutes = (remainingMs % (3600 * 1000)) / (60 * 1000)
                                    
                                    Surface(
                                        modifier = Modifier.padding(top = 8.dp).fillMaxWidth(),
                                        color = Color.White.copy(alpha = 0.12f),
                                        shape = RoundedCornerShape(12.dp),
                                        border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.3f))
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.Center
                                        ) {
                                            Text("⏱️", fontSize = 12.sp)
                                            Spacer(Modifier.width(8.dp))
                                            Text(
                                                text = "Prueba Gratuita: ${days}d ${hours}h ${minutes}m restantes",
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 11.sp
                                            )
                                        }
                                    }
                                }
                            }

                            Spacer(Modifier.height(16.dp))
                            val firstName = currentUser?.displayName?.split(" ")?.firstOrNull() ?: "Tutor"
                            Text("Hola, $firstName", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Black)
                            
                            Spacer(Modifier.height(20.dp))

                            Spacer(Modifier.height(16.dp))
                            Surface(
                                onClick = { showScreenTimeDashboard = true },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                color = Color.White.copy(alpha = 0.15f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.2f))
                            ) {
                                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                    Column {
                                        Text("⏱️ Tiempo Hoy", color = Color.White.copy(alpha = 0.7f), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        val h = totalUsageMs / 3600000; val m = (totalUsageMs / 60000) % 60
                                        Text("${h}h ${m}m", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Black)
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(-8.dp)) {
                                        dailyAppsUsage.take(3).forEach { app ->
                                            Surface(shape = CircleShape, color = Color.White.copy(0.3f), modifier = Modifier.size(32.dp), border = androidx.compose.foundation.BorderStroke(1.dp, Color.White)) {
                                                Box(contentAlignment = Alignment.Center) { Text(app["appName"].toString().take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold) }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    var currentTab by remember { mutableStateOf(0) }
                    TabRow(
                        selectedTabIndex = currentTab,
                        containerColor = Color.Transparent,
                        contentColor = Color(0xFF1976D2),
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        indicator = { tabPositions ->
                            TabRowDefaults.Indicator(Modifier.tabIndicatorOffset(tabPositions[currentTab]), color = Color(0xFF1976D2))
                        }
                    ) {
                        Tab(selected = currentTab == 0, onClick = { currentTab = 0 }, text = { Text("Control", fontWeight = FontWeight.Bold) })
                        Tab(selected = currentTab == 1, onClick = { currentTab = 1 }, text = { Text("Monitor", fontWeight = FontWeight.Bold) })
                        Tab(selected = currentTab == 2, onClick = { currentTab = 2 }, text = { Text("Ubicación", fontWeight = FontWeight.Bold) })
                    }

                    if (currentTab == 0) {
                        AppsMenuTab(
                            onManageApps = { showAppsManagement = true },
                            onOpenDowntime = { showDowntimeScreen = true },
                            onToggleInstantBlock = { blocked, duration -> 
                                val command = if (blocked) {
                                    if (duration != null) "BLOCK_ALL_$duration" else "BLOCK_ALL"
                                } else "UNBLOCK_ALL"
                                syncManager.sendCommand(command) 
                            }
                        )
                    } else if (currentTab == 1) {
                        MonitorScreen(syncManager = syncManager)
                    } else {
                        LocationTrackerScreen(syncManager = syncManager)
                    }
                }

                if (showAppsManagement) {
                    AppsManagementScreen(
                        installedApps = installedApps,
                        rulesManager = rulesManager,
                        syncManager = syncManager,
                        onDismiss = { showAppsManagement = false }
                    )
                }

                if (showDowntimeScreen) {
                    DowntimeScreen(
                        syncManager = syncManager,
                        onDismiss = { showDowntimeScreen = false }
                    )
                }
            }
        }
    }

    @Composable
    fun DashboardStat(count: String, label: String, color: Color = Color.White) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = count, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Black, color = color)
            Text(text = label, style = MaterialTheme.typography.labelSmall, color = color.copy(alpha = 0.7f))
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
    fun AppRuleItem(app: Map<String, String>, rulesManager: RulesManager, syncManager: FirebaseSyncManager) {
        val packageName = app["packageName"] ?: ""
        val name = app["name"] ?: ""
        
        var isBlocked by remember { mutableStateOf(rulesManager.isAppBlocked(packageName)) }
        var isMonitored by remember { mutableStateOf(rulesManager.isAppMonitored(packageName)) }
        
        Surface(
            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
            shape = RoundedCornerShape(20.dp),
            color = Color.White,
            shadowElevation = 3.dp
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    modifier = Modifier.size(52.dp),
                    shape = RoundedCornerShape(14.dp),
                    color = if (isBlocked) Color(0xFFFFEBEE) else Color(0xFFE8F5E9)
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        AnimatedKibooIcon(
                            imageVector = if (isBlocked) Icons.Default.Lock else Icons.Default.Apps,
                            contentDescription = null,
                            tint = if (isBlocked) Color.Red else Color(0xFF2E7D32),
                            size = 28.dp,
                            isChildMode = false
                        )
                    }
                }
                
                Spacer(modifier = Modifier.width(16.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, color = Color.DarkGray)
                    Text(text = packageName, style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                }
                
                Column(horizontalAlignment = Alignment.End) {
                    // Control de Bloqueo
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = CircleShape,
                            color = if (isBlocked) Color.Red.copy(0.1f) else Color.Transparent
                        ) {
                            Text(
                                if (isBlocked) "BLOQUEADA" else "PERMITIDA", 
                                fontSize = 10.sp, 
                                fontWeight = FontWeight.Black, 
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                color = if (isBlocked) Color.Red else Color.Gray
                            )
                        }
                        Switch(
                            checked = isBlocked,
                            onCheckedChange = {
                                isBlocked = it
                                val currentRules = rulesManager.getRules().toMutableList()
                                currentRules.removeAll { r -> r.packageName == packageName }
                                currentRules.add(Rule(packageName, isBlocked = it, isMonitored = isMonitored))
                                rulesManager.saveRules(currentRules)
                                syncManager.updateRulesInCloud(currentRules)
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = Color.Red
                            ),
                            modifier = Modifier.scale(0.8f)
                        )
                    }
                    
                    // Control de Monitoreo
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            if (isMonitored) "RASTREANDO" else "PRIVADA", 
                            fontSize = 10.sp, 
                            fontWeight = FontWeight.Bold,
                            color = if (isMonitored) Color(0xFF1976D2) else Color.LightGray
                        )
                        Switch(
                            checked = isMonitored,
                            onCheckedChange = {
                                isMonitored = it
                                val currentRules = rulesManager.getRules().toMutableList()
                                currentRules.removeAll { r -> r.packageName == packageName }
                                currentRules.add(Rule(packageName, isBlocked = isBlocked, isMonitored = it))
                                rulesManager.saveRules(currentRules)
                                syncManager.updateRulesInCloud(currentRules)
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = Color(0xFF1976D2)
                            ),
                            modifier = Modifier.scale(0.8f)
                        )
                    }
                }
            }
        }
    }


    @Composable
    fun MonitorScreen(syncManager: FirebaseSyncManager) {
        val context = LocalContext.current
        var isCameraStreaming by remember { mutableStateOf(false) }
        var isScreenStreaming by remember { mutableStateOf(false) }
        var isRemoteControlActive by remember { mutableStateOf(false) }
        var isAudioStreaming by remember { mutableStateOf(false) }
        var isRecordingAudio by remember { mutableStateOf(false) }
        
        var cameraFrame by remember { mutableStateOf<String?>(null) }
        var screenFrame by remember { mutableStateOf<String?>(null) }
        var notifications by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
        
        var audioOutputFile: File? by remember { mutableStateOf(null) }
        var audioOutputStream: FileOutputStream? by remember { mutableStateOf(null) }
        
        var deviceLocation by remember { mutableStateOf<Pair<Double, Double>?>(null) }
        
        // --- Audio Track Setup ---
        val audioTrack = remember {
            val sampleRate = 16000
            val channelConfig = AudioFormat.CHANNEL_OUT_MONO
            val audioFormat = AudioFormat.ENCODING_PCM_16BIT
            val bufferSize = AudioTrack.getMinBufferSize(sampleRate, channelConfig, audioFormat)
            AudioTrack(
                AudioManager.STREAM_MUSIC,
                sampleRate,
                channelConfig,
                audioFormat,
                bufferSize,
                AudioTrack.MODE_STREAM
            )
        }

        LaunchedEffect(Unit) {
            syncManager.listenForCameraFrame { cameraFrame = it }
            syncManager.listenForScreenFrame { screenFrame = it }
            syncManager.listenForNotifications { notifications = it }
            syncManager.listenForLocation { lat, lng ->
                deviceLocation = Pair(lat, lng)
            }
            
            syncManager.listenForAudioChunk { base64 ->
                if (isAudioStreaming) {
                    val bytes = Base64.decode(base64, Base64.DEFAULT)
                    audioTrack.write(bytes, 0, bytes.size)
                    if (audioTrack.playState != AudioTrack.PLAYSTATE_PLAYING) {
                        audioTrack.play()
                    }
                    if (isRecordingAudio) {
                        audioOutputStream?.write(bytes)
                    }
                }
            }
        }

        DisposableEffect(Unit) {
            onDispose {
                audioTrack.stop()
                audioTrack.release()
                audioOutputStream?.close()
            }
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.verticalGradient(listOf(Color(0xFFF8F9FA), Color(0xFFE9ECEF)))),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(16.dp)
        ) {
            // --- Header Summary ---
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AnimatedKibooIcon(
                        Icons.Default.Cloud, 
                        contentDescription = null, 
                        tint = Color(0xFF1976D2), 
                        size = 32.dp
                    )
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("Estado del Monitoreo", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
                        Text("Sincronización en tiempo real activa", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    }
                }
            }

            // --- Live Screen Section (PREMIUM DESIGN) ---
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    color = Color.White,
                    shadowElevation = 8.dp
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Duplicar Pantalla", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(modifier = Modifier.size(8.dp).background(if (isScreenStreaming) Color(0xFF4CAF50) else Color.Gray, CircleShape))
                                    Spacer(Modifier.width(6.dp))
                                    Text(if (isScreenStreaming) "En Vivo" else "Fuera de Línea", fontSize = 12.sp, color = Color.Gray)
                                }
                            }
                            Switch(
                                checked = isScreenStreaming,
                                onCheckedChange = { 
                                    isScreenStreaming = it
                                    if (it) syncManager.sendCommand("START_SCREEN") else syncManager.sendCommand("STOP_SCREEN")
                                },
                                colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF1976D2))
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(300.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(Color.Black)
                                .pointerInput(isRemoteControlActive) {
                                    if (isRemoteControlActive && isScreenStreaming) {
                                        detectTapGestures { offset ->
                                            val xPct = (offset.x / size.width) * 100
                                            val yPct = (offset.y / size.height) * 100
                                            syncManager.sendCommand("REMOTE_TOUCH:${xPct.toInt()},${yPct.toInt()}")
                                        }
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            if (isScreenStreaming && screenFrame != null) {
                                val bitmap = try {
                                    val bytes = Base64.decode(screenFrame, Base64.DEFAULT)
                                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                                } catch (e: Exception) { null }
                                
                                bitmap?.let {
                                    Image(
                                        bitmap = it.asImageBitmap(),
                                        contentDescription = "Screen Stream",
                                        modifier = Modifier.fillMaxSize(),
                                        contentScale = ContentScale.Fit
                                    )
                                }
                                
                                if (isRemoteControlActive) {
                                    Box(
                                        modifier = Modifier.fillMaxSize().background(Color.Blue.copy(alpha = 0.05f)),
                                        contentAlignment = Alignment.TopCenter
                                    ) {
                                        Surface(
                                            color = Color.Blue.copy(alpha = 0.8f),
                                            shape = RoundedCornerShape(bottomStart = 12.dp, bottomEnd = 12.dp)
                                        ) {
                                            Text("MODO CONTROL ACTIVO", color = Color.White, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp), fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            } else {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Default.Tv, contentDescription = null, tint = Color.DarkGray, modifier = Modifier.size(64.dp))
                                    Spacer(Modifier.height(8.dp))
                                    Text("Pantalla en Espera", color = Color.Gray, fontWeight = FontWeight.Medium)
                                }
                            }
                        }

                        if (isScreenStreaming) {
                            Spacer(Modifier.height(16.dp))
                            Surface(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                color = if (isRemoteControlActive) Color(0xFFE3F2FD) else Color(0xFFF5F5F5),
                                onClick = { isRemoteControlActive = !isRemoteControlActive }
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        if (isRemoteControlActive) Icons.Default.TouchApp else Icons.Default.PanTool, 
                                        contentDescription = null, 
                                        tint = if (isRemoteControlActive) Color(0xFF1976D2) else Color.Gray
                                    )
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text("Manipulación Remota", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Text(if (isRemoteControlActive) "Toca para controlar el dispositivo del niño" else "Activar para controlar con toques", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                                    }
                                    Checkbox(checked = isRemoteControlActive, onCheckedChange = { isRemoteControlActive = it })
                                }
                            }
                        }
                    }
                }
            }

            // --- Audio Card (PREMIUM) ---
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    color = Color.White,
                    shadowElevation = 4.dp
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            AnimatedKibooIcon(
                                Icons.Default.VolumeUp, 
                                contentDescription = null, 
                                tint = Color(0xFFD32F2F), 
                                size = 28.dp
                            )
                            Spacer(Modifier.width(12.dp))
                            Text("Escucha Ambiental", fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleMedium)
                        }
                        
                        val infiniteTransition = rememberInfiniteTransition()
                        val waveScale by infiniteTransition.animateFloat(
                            initialValue = 1f, targetValue = 1.3f, 
                            animationSpec = infiniteRepeatable(tween(500), RepeatMode.Reverse)
                        )

                        Spacer(modifier = Modifier.height(20.dp))
                        
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier
                                    .size(56.dp)
                                    .background(if (isAudioStreaming) Color(0xFFFFEBEE) else Color(0xFFF5F5F5), CircleShape)
                                    .clickable {
                                        if (isAudioStreaming) {
                                            isAudioStreaming = false
                                            syncManager.sendCommand("STOP_AUDIO")
                                            audioTrack.pause()
                                            audioTrack.flush()
                                        } else {
                                            isAudioStreaming = true
                                            syncManager.sendCommand("START_AUDIO")
                                        }
                                    }
                            ) {
                                Icon(
                                    if (isAudioStreaming) Icons.Default.Stop else Icons.Default.PlayArrow,
                                    contentDescription = null,
                                    tint = if (isAudioStreaming) Color.Red else Color.Gray,
                                    modifier = Modifier.size(32.dp).graphicsLayer(scaleX = if (isAudioStreaming) waveScale else 1f, scaleY = if (isAudioStreaming) waveScale else 1f)
                                )
                            }
                            
                            Spacer(Modifier.width(20.dp))
                            
                            Column(modifier = Modifier.weight(1f)) {
                                Text(if (isAudioStreaming) "Capturando Audio..." else "Presiona para escuchar", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                if (isAudioStreaming) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        repeat(5) { i ->
                                            Box(modifier = Modifier.width(4.dp).height(12.dp).background(Color.Red, RoundedCornerShape(2.dp)))
                                        }
                                    }
                                } else {
                                    Text("Micrófono del dispositivo está silenciado", fontSize = 12.sp, color = Color.Gray)
                                }
                            }

                            // RECORDING BUTTON
                            Surface(
                                shape = CircleShape,
                                color = if (isRecordingAudio) Color.Red else Color.Transparent,
                                modifier = Modifier.border(1.dp, if (isRecordingAudio) Color.Red else Color.LightGray, CircleShape),
                                onClick = {
                                    if (isRecordingAudio) {
                                        isRecordingAudio = false
                                        audioOutputStream?.close()
                                        audioOutputStream = null
                                        Toast.makeText(context, "Grabación guardada", Toast.LENGTH_SHORT).show()
                                    } else if (isAudioStreaming) {
                                        val folder = File(context.filesDir, "KibooRecordings")
                                        if (!folder.exists()) folder.mkdirs()
                                        val file = File(folder, "REC_${System.currentTimeMillis()}.pcm")
                                        audioOutputFile = file
                                        audioOutputStream = FileOutputStream(file)
                                        isRecordingAudio = true
                                        Toast.makeText(context, "Grabando...", Toast.LENGTH_SHORT).show()
                                    } else {
                                        Toast.makeText(context, "Activa el audio primero", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            ) {
                                Icon(
                                    Icons.Default.Mic, 
                                    contentDescription = null, 
                                    tint = if (isRecordingAudio) Color.White else Color.Gray,
                                    modifier = Modifier.padding(12.dp)
                                )
                            }
                        }
                    }
                }
            }

            // --- List Items Sections ---
            item {
                Text("Herramientas Adicionales", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = Color.DarkGray)
            }

            // Recordings and Notifications list items follow here...
            // (Keeping current logic for records but wrapping in better Surfaces)
            val recordingsFolder = File(context.filesDir, "KibooRecordings")
            val recordingFiles = recordingsFolder.listFiles()?.filter { it.extension == "pcm" }?.sortedByDescending { it.lastModified() } ?: emptyList()

            if (recordingFiles.isEmpty()) {
                item { 
                    Surface(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), color = Color.White.copy(0.5f)) {
                        Text("No hay grabaciones archivadas", modifier = Modifier.padding(16.dp), textAlign = TextAlign.Center, color = Color.Gray, fontSize = 12.sp) 
                    }
                }
            } else {
                items(recordingFiles) { file ->
                    var isPlayingItem by remember { mutableStateOf(false) }
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        color = Color.White,
                        onClick = {
                            if (!isPlayingItem) {
                                isPlayingItem = true
                                Thread {
                                    val bytes = file.readBytes()
                                    audioTrack.play()
                                    audioTrack.write(bytes, 0, bytes.size)
                                    isPlayingItem = false
                                }.start()
                            }
                        }
                    ) {
                        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(modifier = Modifier.size(40.dp).background(Color(0xFFE8F5E9), CircleShape), contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Audiotrack, contentDescription = null, tint = Color(0xFF2E7D32), modifier = Modifier.size(20.dp))
                            }
                            Spacer(Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(file.name, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                Text("${file.length() / 1024} KB • Archivo Local", fontSize = 11.sp, color = Color.Gray)
                            }
                            IconButton(onClick = { 
                                file.delete()
                                Toast.makeText(context, "Eliminado", Toast.LENGTH_SHORT).show()
                            }) {
                                Icon(Icons.Default.Delete, contentDescription = null, tint = Color.Red.copy(0.4f))
                            }
                        }
                    }
                }
            }
        }
    }


    @Composable
    fun StatusCard(title: String, value: String, modifier: Modifier = Modifier, valueColor: Color = Color.Black) {
        Surface(
            modifier = modifier,
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 1.dp
        ) {
            Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(title, style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                Spacer(modifier = Modifier.height(4.dp))
                Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = valueColor)
            }
        }
    }

    @Composable
    fun PermissionsManagerDialog(
        context: Context,
        onDismiss: () -> Unit,
        hasUsageStats: Boolean,
        hasOverlay: Boolean,
        hasCamera: Boolean,
        hasLocation: Boolean,
        hasNotification: Boolean,
        onTriggerGuide: (String) -> Unit
    ) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = {
                Text("Gestor de Permisos", fontWeight = FontWeight.Bold, color = Color(0xFF3E2723))
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Toca los interruptores para ver la guía de configuración.", style = MaterialTheme.typography.bodyMedium, color = Color.Gray)
                    
                    PermissionSwitchRow(
                        title = "Uso de Aplicaciones",
                        subtitle = "Ver actividad en el dispositivo",
                        description = "Permite a Kiboo saber cuánto tiempo pasa tu hijo en cada app.",
                        isEnabled = hasUsageStats,
                        onClick = { onTriggerGuide("USAGE") }
                    )
                    
                    PermissionSwitchRow(
                        title = "Accesibilidad (Control Total)",
                        subtitle = "Bloqueo y Filtro Web",
                        description = "Es el motor del escudo. Permite bloquear apps al instante.",
                        isEnabled = false,
                        onClick = { onTriggerGuide("ACCESSIBILITY") }
                    )

                    PermissionSwitchRow(
                        title = "Superposición (Overlay)",
                        subtitle = "Pantallas de Bloqueo",
                        description = "Permite mostrar la pantalla de 'Tiempo Agotado' sobre otras apps.",
                        isEnabled = hasOverlay,
                        onClick = { onTriggerGuide("OVERLAY") }
                    )
                    
                    PermissionSwitchRow(
                        title = "Leer Notificaciones",
                        subtitle = "Notificación de mensajes",
                        description = "Kiboo leerá las alertas entrantes para detectar acoso.",
                        isEnabled = hasNotification,
                        onClick = { onTriggerGuide("NOTIFICATION") }
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = onDismiss) { Text("Hecho", fontWeight = FontWeight.Bold) }
            },
            dismissButton = {
                TextButton(onClick = onDismiss) { Text("Omitir", color = Color.Gray) }
            },
            containerColor = Color.White
        )
    }

    @Composable
    fun SecurityLevelRow(label: String, isActive: Boolean) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(label, style = MaterialTheme.typography.bodyMedium)
            Surface(
                shape = CircleShape,
                color = if (isActive) Color(0xFFE8F5E9) else Color(0xFFFFEBEE),
                modifier = Modifier.padding(start = 8.dp)
            ) {
                Text(
                    if (isActive) "Activado" else "Pendiente",
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (isActive) Color(0xFF2E7D32) else Color(0xFFC62828),
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }

    @Composable
    fun PermissionSwitchRow(title: String, subtitle: String, description: String, isEnabled: Boolean, onClick: () -> Unit) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyLarge)
                    Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Color(0xFF1976D2))
                }
                Switch(
                    checked = isEnabled,
                    onCheckedChange = { onClick() },
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color(0xFF4CAF50),
                        checkedTrackColor = Color(0xFF4CAF50).copy(alpha = 0.5f),
                        uncheckedThumbColor = Color.LightGray,
                        uncheckedTrackColor = Color.LightGray.copy(alpha = 0.5f)
                    )
                )
            }
            Text(description, style = MaterialTheme.typography.labelSmall, color = Color.Gray, modifier = Modifier.padding(top = 4.dp, bottom = 8.dp))
            Divider(color = Color.Gray.copy(alpha = 0.1f))
            Spacer(modifier = Modifier.height(8.dp))
        }
    }

    data class AppInfo(val name: String, val packageName: String, val icon: Drawable?)

    private fun getInstalledAppsWithNames(): List<AppInfo> {
        val packageManager = packageManager
        return packageManager.getInstalledPackages(PackageManager.GET_META_DATA)
            .filter { it.applicationInfo != null && (it.applicationInfo!!.flags and ApplicationInfo.FLAG_SYSTEM) == 0 }
            .map {
                AppInfo(
                    it.applicationInfo!!.loadLabel(packageManager).toString(),
                    it.packageName,
                    it.applicationInfo!!.loadIcon(packageManager)
                )
            }.sortedBy { it.name }
    }

    private fun isNotificationListenerEnabled(context: Context): Boolean {
        val packageName = context.packageName
        val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        return flat?.contains(packageName) == true
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

    @Composable
    fun PermissionNoticeDialog(
        onDismiss: () -> Unit,
        onGrantClicked: () -> Unit,
        missingNotifications: Boolean,
        missingLocation: Boolean
    ) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Text("Aviso", fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineSmall)
                }
            },
            text = {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text(
                        "Las siguientes funciones precisan permisos básicos para estar operativas:",
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.bodyLarge
                    )
                    
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = Color(0xFFF1F5F9),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            if (missingNotifications) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Surface(shape = CircleShape, color = Color(0xFFFB8C00), modifier = Modifier.size(32.dp)) {
                                        Icon(Icons.Default.Notifications, null, tint = Color.White, modifier = Modifier.padding(6.dp))
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    Text("Sincronizar notificaciones", fontWeight = FontWeight.Bold)
                                }
                            }
                            if (missingLocation) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Surface(shape = CircleShape, color = Color(0xFF43A047), modifier = Modifier.size(32.dp)) {
                                        Icon(Icons.Default.LocationOn, null, tint = Color.White, modifier = Modifier.padding(6.dp))
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    Text("Rastreador de ubicaciones", fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = onGrantClicked,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                    shape = RoundedCornerShape(28.dp)
                ) {
                    Text("Conceder permisos", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
                    Text("Omitir por ahora", color = Color.Gray)
                }
            },
            containerColor = Color.White
        )
    }

    @Composable
    fun Level3ProtectionDialog(
        isAdminActive: Boolean,
        isIgnoringBattery: Boolean,
        onDismiss: () -> Unit,
        onToggleAdmin: () -> Unit,
        onToggleBatteryOpt: () -> Unit,
        onOpenAutoStart: () -> Unit,
        onOpenBatterySaver: () -> Unit,
        onDone: () -> Unit
    ) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Text("¡Ya casi terminamos!", fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineSmall)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text(
                        "Concede los siguientes permisos para que Kiboo se ejecute en segundo plano y puedas supervisar el dispositivo ininterrumpidamente.",
                        textAlign = TextAlign.Start,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.Gray
                    )

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Permiso de administrador", fontWeight = FontWeight.Bold)
                            Text("Protección contra desinstalación", style = MaterialTheme.typography.labelSmall)
                        }
                        Switch(checked = isAdminActive, onCheckedChange = { onToggleAdmin() })
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Ignorar la optimización de batería", fontWeight = FontWeight.Bold)
                            Text("Estabilidad permanente", style = MaterialTheme.typography.labelSmall)
                        }
                        Switch(checked = isIgnoringBattery, onCheckedChange = { onToggleBatteryOpt() })
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Permitir inicio automático", modifier = Modifier.weight(1f), fontWeight = FontWeight.Medium)
                        Button(onClick = onOpenAutoStart, shape = RoundedCornerShape(20.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE3F2FD), contentColor = Color.Blue)) {
                            Text("Ajustes")
                        }
                    }

                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Desactivar modo ahorro energía", modifier = Modifier.weight(1f), fontWeight = FontWeight.Medium)
                        Button(onClick = onOpenBatterySaver, shape = RoundedCornerShape(20.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE3F2FD), contentColor = Color.Blue)) {
                            Text("Ajustes")
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = onDone,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                    shape = RoundedCornerShape(28.dp)
                ) {
                    Text("Activar Todo", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
                    Text("Omitir por ahora", color = Color.Gray)
                }
            },
            containerColor = Color.White
        )
    }

    @Composable
    fun AdvancedProtectionDialog(
        onDismiss: () -> Unit,
        onEnableClicked: () -> Unit
    ) {
        var contactsEnabled by remember { mutableStateOf(false) }
        var smsEnabled by remember { mutableStateOf(false) }
        var photosEnabled by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = onDismiss,
            title = {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                    Text("Activar protección total", fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineSmall)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(20.dp), modifier = Modifier.padding(top = 8.dp)) {
                    Text(
                        "Con el permiso de tu hijo, puedes activar funciones de protección más completas.",
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.Gray
                    )

                    // Sección: Llamadas y SMS
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(shape = CircleShape, color = Color(0xFF4CAF50), modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Call, null, tint = Color.White, modifier = Modifier.padding(6.dp))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text("Control de llamadas y SMS", fontWeight = FontWeight.Bold)
                                Text("Detecta riesgos en la actividad de comunicación.", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                            }
                        }
                        
                        PermissionSimpleToggle("Permiso de contactos", contactsEnabled) { contactsEnabled = it }
                        PermissionSimpleToggle("Permiso SMS", smsEnabled) { smsEnabled = it }
                    }

                    Divider(color = Color.Gray.copy(alpha = 0.1f))

                    // Sección: Fotos
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(shape = CircleShape, color = Color(0xFF3F51B5), modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Build, null, tint = Color.White, modifier = Modifier.padding(6.dp))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text("Detección de fotos inapropiadas", fontWeight = FontWeight.Bold)
                                Text("Recibe alertas sobre fotos sospechosas en el álbum.", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                            }
                        }
                        PermissionSimpleToggle("Escanear galería local", photosEnabled) { photosEnabled = it }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = onEnableClicked,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6).copy(alpha = if (contactsEnabled || smsEnabled || photosEnabled) 1f else 0.5f)),
                    shape = RoundedCornerShape(28.dp)
                ) {
                    Text("Habilitar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
                    Text("Omitir", color = Color.Gray)
                }
            },
            containerColor = Color.White
        )
    }

    @Composable
    fun PermissionSimpleToggle(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(label, style = MaterialTheme.typography.bodyMedium)
            Switch(
                checked = checked, 
                onCheckedChange = onCheckedChange,
                colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF3B82F6))
            )
        }
    }

    @Composable
    fun PermissionGuideDialog(
        permissionKey: String,
        onDismiss: () -> Unit,
        onConfirmed: () -> Unit
    ) {
        val guide = when(permissionKey) {
            "ACCESSIBILITY" -> Triple("Accesibilidad", "Localiza Kiboo Shield en servicios descargados", "Activa el interruptor")
            "USAGE" -> Triple("Uso de Apps", "Localiza Kiboo Shield en la lista", "Permite el acceso de uso")
            "NOTIFICATION" -> Triple("Notificaciones", "Busca Kiboo Shield", "Permite acceso a notificaciones")
            else -> Triple("Ajustes", "Busca la aplicación Kiboo Shield", "Activa la opción correspondiente")
        }

        AlertDialog(
            onDismissRequest = onDismiss,
            text = {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(20.dp)) {
                    Text(guide.first, fontWeight = FontWeight.Black, style = MaterialTheme.typography.headlineMedium)
                    
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        GuideStep(1, guide.second)
                        GuideStep(2, guide.third)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = onConfirmed,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                    shape = RoundedCornerShape(28.dp)
                ) {
                    Text("Aceptar", fontWeight = FontWeight.Bold, color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
                    Text("Omitir", color = Color.Gray)
                }
            },
            containerColor = Color.White
        )
    }

    @Composable
    fun GuideStep(number: Int, text: String) {
        Row(verticalAlignment = Alignment.Top) {
            Surface(
                shape = CircleShape, 
                color = Color.LightGray.copy(alpha = 0.5f), 
                modifier = Modifier.size(24.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(number.toString(), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.width(12.dp))
            Text(text, style = MaterialTheme.typography.bodyLarge)
        }
    }

@Composable
fun HelpAssistantFloatingButton(modifier: Modifier = Modifier) {
    var showHelpDialog by remember { mutableStateOf(false) }

    Box(modifier = modifier) {
        FloatingActionButton(
            onClick = { showHelpDialog = true },
            containerColor = Color(0xFF1976D2),
            contentColor = Color.White,
            shape = CircleShape,
            modifier = Modifier.size(56.dp)
        ) {
            Icon(Icons.Default.QuestionAnswer, contentDescription = "Ayuda", modifier = Modifier.size(28.dp))
        }
    }

    if (showHelpDialog) {
        HelpAssistantDialog(onDismiss = { showHelpDialog = false })
    }
}

@Composable
fun HelpAssistantDialog(onDismiss: () -> Unit) {
    val faqs = listOf(
        "¿Cómo funciona el Bloqueo Instantáneo?" to "Bloquea todas las aplicaciones de entretenimiento y juegos de inmediato. Úsalo para que el niño deje el móvil rápido.",
        "¿Puedo ver qué aplicaciones usa más?" to "Sí, en la pestaña 'Apps' verás un resumen del tiempo de uso diario por aplicación.",
        "¿Qué significa 'Ubicación en Tiempo Real'?" to "Kiboo actualiza la posición del niño cada minuto si el GPS está activo. Las rutas se guardan por fecha.",
        "¿Es seguro el Monitoreo de Audio?" to "Totalmente. El audio ambiental solo se activa bajo tu petición y las grabaciones se guardan localmente en tu móvil.",
        "¿Qué hacer si el dispositivo sale Offline?" to "Asegúrate de que el niño no haya desactivado el Wi-Fi o que la app Kiboo tenga permiso para inicio automático."
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("🤖 Asistente Kiboo", fontWeight = FontWeight.Bold)
        },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                item {
                    Text("¡Hola! Soy tu asistente. Aquí tienes respuestas a las dudas más comunes:", style = MaterialTheme.typography.bodyMedium)
                }
                items(faqs) { faq ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color.Gray.copy(alpha = 0.05f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(faq.first, fontWeight = FontWeight.Bold, color = Color(0xFF1976D2), style = MaterialTheme.typography.bodySmall)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(faq.second, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Entendido") }
        },
        containerColor = Color.White
    )
}

@Composable
fun ParentalControlTheme(appTheme: String = SessionManager.THEME_BOY, content: @Composable () -> Unit) {
    val boyColors = lightColorScheme(
        primary = Color(0xFF1976D2), 
        secondary = Color(0xFFBBDEFB),
        background = Color(0xFFF0F8FF), // Alice Blue
        surface = Color.White,
        onSurface = Color(0xFF0D47A1)
    )
    
    val girlColors = lightColorScheme(
        primary = Color(0xFFE91E63), 
        secondary = Color(0xFFF8BBD0),
        background = Color(0xFFFFF0F5), // Lavender Blush
        surface = Color.White,
        onSurface = Color(0xFF880E4F)
    )

    val darkColors = darkColorScheme(
        primary = Color(0xFFFFB142), 
        secondary = Color(0xFFD7CCC8),
        background = Color(0xFF121212),
        surface = Color(0xFF1E1E1E),
        onSurface = Color.White
    )

    val colors = when(appTheme) {
        SessionManager.THEME_GIRL -> girlColors
        SessionManager.THEME_DARK -> darkColors
        else -> boyColors
    }

    MaterialTheme(
        colorScheme = colors,
        content = content
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppsMenuTab(
    onManageApps: () -> Unit,
    onOpenDowntime: () -> Unit,
    onToggleInstantBlock: (Boolean, String?) -> Unit
) {
    var showInstantBlockSheet by remember { mutableStateOf(false) }
    var instantBlockActive by remember { mutableStateOf(false) }
    var selectedDuration by remember { mutableStateOf("MANUAL") }

    if (showInstantBlockSheet) {
        InstantBlockBottomSheet(
            onDismiss = { showInstantBlockSheet = false },
            onConfirm = { duration ->
                selectedDuration = duration
                instantBlockActive = true
                showInstantBlockSheet = false
                onToggleInstantBlock(true, duration)
            }
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Panel de Control",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.ExtraBold,
            color = Color.DarkGray
        )

        // Card 1: Bloqueo Instantáneo (Vibrant Red/Orange Gradient)
        ControlActionCard(
            title = "Bloqueo Instantáneo",
            subtitle = if (instantBlockActive) "Dispositivo pausado ($selectedDuration)" else "Pausar todo el dispositivo ahora",
            icon = Icons.Default.Lock,
            gradient = listOf(Color(0xFFFF5F6D), Color(0xFFFFC371)),
            isActive = instantBlockActive,
            trailing = {
                Switch(
                    checked = instantBlockActive,
                    onCheckedChange = { checked ->
                        if (checked) {
                            showInstantBlockSheet = true
                        } else {
                            instantBlockActive = false
                            onToggleInstantBlock(false, null)
                        }
                    },
                    colors = SwitchDefaults.colors(checkedThumbColor = Color.White)
                )
            },
            onClick = { if (!instantBlockActive) showInstantBlockSheet = true else { instantBlockActive = false; onToggleInstantBlock(false, null) } }
        )

        // Card 2: Tiempo de Inactividad (Deep Blue Gradient)
        ControlActionCard(
            title = "Tiempo de Inactividad",
            subtitle = "Programa horarios de descanso",
            icon = Icons.Default.Update,
            gradient = listOf(Color(0xFF2193b0), Color(0xFF6dd5ed)),
            onClick = onOpenDowntime
        )

        // Card 3: Gestión de Aplicaciones (Purple Gradient)
        ControlActionCard(
            title = "Gestión de Control",
            subtitle = "Bloquea o permite apps específicas",
            icon = Icons.Default.Apps,
            gradient = listOf(Color(0xFF8E2DE2), Color(0xFF4A00E0)),
            onClick = onManageApps
        )

        Spacer(Modifier.height(8.dp))
        Text(
            text = "Seguridad Avanzada",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = Color.Gray
        )

        // Secondary rows for security (keeping them as premium rows)
        PremiumSecurityRow(icon = Icons.Default.NotificationsActive, title = "Supervisión de notificaciones", color = Color(0xFFE91E63))
        PremiumSecurityRow(icon = Icons.Default.Security, title = "Detección de contenido social", color = Color(0xFF673AB7))
        PremiumSecurityRow(icon = Icons.Default.Language, title = "Navegación segura", color = Color(0xFF00BCD4))
    }
}

@Composable
fun ControlActionCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    gradient: List<Color>,
    isActive: Boolean = false,
    trailing: @Composable (() -> Unit)? = null,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = Color.White,
        shadowElevation = 4.dp
    ) {
        Row(
            modifier = Modifier
                .background(Brush.linearGradient(gradient.map { it.copy(alpha = if (isActive) 1f else 0.08f) }))
                .padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = if (isActive) Color.White.copy(alpha = 0.2f) else gradient[0].copy(alpha = 0.2f),
                modifier = Modifier.size(52.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    AnimatedKibooIcon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = if (isActive) Color.White else gradient[0],
                        size = 28.dp
                    )
                }
            }
            
            Spacer(Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp,
                    color = if (isActive) Color.White else Color.DarkGray
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isActive) Color.White.copy(alpha = 0.8f) else Color.Gray
                )
            }

            if (trailing != null) {
                trailing()
            } else {
                Icon(
                    Icons.Default.KeyboardArrowRight,
                    contentDescription = null,
                    tint = if (isActive) Color.White else Color.LightGray
                )
            }
        }
    }
}

@Composable
fun PremiumSecurityRow(icon: ImageVector, title: String, color: Color) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        onClick = { /* Future feature */ }
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(color.copy(alpha = 0.1f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.width(12.dp))
            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.DarkGray)
            Spacer(Modifier.weight(1f))
            Icon(Icons.Default.KeyboardArrowRight, contentDescription = null, tint = Color.LightGray, modifier = Modifier.size(16.dp))
        }
    }
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InstantBlockBottomSheet(onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    val sheetState = rememberModalBottomSheetState()
    var selectedOption by remember { mutableStateOf("MANUAL") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        dragHandle = { BottomSheetDefaults.DragHandle() },
        containerColor = Color.White
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Bloqueo instantáneo", fontWeight = FontWeight.Black, fontSize = 20.sp)
            Spacer(Modifier.height(20.dp))

            // Banner Naranja (Advertencia)
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFFFFF3E0),
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Color(0xFFFFB74D).copy(0.3f))
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(shape = CircleShape, color = Color(0xFFFF9800), modifier = Modifier.size(24.dp)) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("i", color = Color.White, fontWeight = FontWeight.Black, fontSize = 14.sp)
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                    Text(
                        "Concede los permisos en Kiboo Kids",
                        color = Color(0xFFE65100),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(Icons.Default.KeyboardArrowDown, null, tint = Color(0xFFFF9800), modifier = Modifier.size(18.dp))
                }
            }

            Spacer(Modifier.height(20.dp))
            Text(
                "Cuando está activado, todas las aplicaciones, salvo aquellas que estén siempre permitidas, se bloquearán instantáneamente.",
                textAlign = TextAlign.Center,
                fontSize = 13.sp,
                color = Color.Gray,
                lineHeight = 18.sp
            )

            Spacer(Modifier.height(24.dp))

            // Lista de Opciones
            val options = listOf(
                "1 hora" to "1H",
                "2 horas" to "2H",
                "Hasta la medianoche" to "MIDNIGHT",
                "Hasta que se desactive manualmente" to "MANUAL"
            )

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                options.forEach { (label, value) ->
                    val isSelected = selectedOption == value
                    Surface(
                        onClick = { selectedOption = value },
                        shape = RoundedCornerShape(12.dp),
                        color = if (isSelected) Color(0xFFF5F5F5) else Color.Transparent,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                label,
                                modifier = Modifier.weight(1f),
                                fontWeight = if (isSelected) FontWeight.Black else FontWeight.Medium,
                                color = if (isSelected) Color.Black else Color.DarkGray
                            )
                            if (isSelected) {
                                Surface(shape = CircleShape, color = Color(0xFF2979FF), modifier = Modifier.size(20.dp)) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Text("✓", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Black)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(32.dp))

            Button(
                onClick = { onConfirm(selectedOption) },
                modifier = Modifier.fillMaxWidth().height(54.dp),
                shape = RoundedCornerShape(27.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2979FF))
            ) {
                Text("OK", fontWeight = FontWeight.Black, fontSize = 16.sp)
            }
            
            TextButton(onClick = onDismiss) {
                Text("Cancelar", color = Color.Gray, fontWeight = FontWeight.Medium)
            }
        }
    }
}


@Composable
fun MenuCategory(title: String, content: @Composable () -> Unit) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 8.dp)) {
            Box(Modifier.width(3.dp).height(16.dp).background(Color(0xFF1976D2)))
            Spacer(Modifier.width(8.dp))
            Text(title, fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color.DarkGray)
        }
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            shadowElevation = 1.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column { content() }
        }
    }
}

@Composable
fun MenuListItem(
    icon: ImageVector,
    title: String,
    badge: String? = null,
    trailing: @Composable (() -> Unit)? = null,
    onClick: (() -> Unit)? = null
) {
    Surface(
        onClick = { onClick?.invoke() },
        color = Color.Transparent,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, tint = Color.DarkGray, modifier = Modifier.size(24.dp))
            Spacer(Modifier.width(16.dp))
            Text(title, modifier = Modifier.weight(1f), fontSize = 14.sp, fontWeight = FontWeight.Medium)
            
            if (badge != null) {
                Surface(
                    shape = CircleShape,
                    color = Color.Red,
                    modifier = Modifier.size(20.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(badge, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.width(8.dp))
            }
            
            if (trailing != null) {
                trailing()
            } else {
                Icon(Icons.Default.KeyboardArrowDown, null, tint = Color.LightGray, modifier = Modifier.size(20.dp))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppsManagementScreen(
    installedApps: List<Map<String, String>>,
    rulesManager: RulesManager,
    syncManager: FirebaseSyncManager,
    onDismiss: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }
    
    // Estados para Selección
    var showAppSelector by remember { mutableStateOf(false) }
    var showDurationSelector by remember { mutableStateOf(false) }
    var selectorType by remember { mutableStateOf(AppsManagementSelectionType.LIMIT) }
    var tempSelectedPackages by remember { mutableStateOf(emptyList<String>()) }
    
    // Reglas actuales para visualización
    var currentRules by remember { mutableStateOf(rulesManager.getRules()) }
    
    val filteredApps = installedApps.filter { 
        it["name"]?.contains(searchQuery, ignoreCase = true) == true 
    }

    // LISTENER DE REGLAS (Para actualizar UI en tiempo real)
    LaunchedEffect(Unit) {
        syncManager.listenForRules { updatedRules ->
            currentRules = updatedRules
        }
    }

    if (showAppSelector) {
        AppSelectionDialog(
            installedApps = installedApps,
            onDismiss = { showAppSelector = false },
            onConfirm = { selected ->
                tempSelectedPackages = selected
                showAppSelector = false
                if (selectorType == AppsManagementSelectionType.LIMIT) {
                    showDurationSelector = true
                } else {
                    // Aplicar cambios directos para ALLOWED o BLOCK
                    val newRules = currentRules.toMutableList()
                    selected.forEach { pkg ->
                        val existingIndex = newRules.indexOfFirst { it.packageName == pkg }
                        val newRule = when (selectorType) {
                            AppsManagementSelectionType.ALLOWED -> Rule(pkg, isBlocked = false, isAlwaysAllowed = true)
                            AppsManagementSelectionType.BLOCK -> Rule(pkg, isBlocked = true, isAlwaysAllowed = false)
                            else -> Rule(pkg)
                        }
                        if (existingIndex != -1) newRules[existingIndex] = newRule else newRules.add(newRule)
                    }
                    rulesManager.saveRules(newRules)
                    syncManager.updateRulesInCloud(newRules)
                }
            }
        )
    }

    if (showDurationSelector) {
        DurationSelectionDialog(
            onDismiss = { showDurationSelector = false },
            onConfirm = { minutes ->
                showDurationSelector = false
                val newRules = currentRules.toMutableList()
                tempSelectedPackages.forEach { pkg ->
                    val existingIndex = newRules.indexOfFirst { it.packageName == pkg }
                    val newRule = Rule(pkg, isBlocked = false, isAlwaysAllowed = false, timeLimitMinutes = minutes)
                    if (existingIndex != -1) newRules[existingIndex] = newRule else newRules.add(newRule)
                }
                rulesManager.saveRules(newRules)
                syncManager.updateRulesInCloud(newRules)
                tempSelectedPackages = emptyList()
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xFF1976D2).copy(alpha = 0.1f),
                            modifier = Modifier.size(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Apps, contentDescription = null, tint = Color(0xFF1976D2), modifier = Modifier.size(18.dp))
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Text("Central de Control", fontWeight = FontWeight.Black, fontSize = 20.sp, color = Color.DarkGray)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver", tint = Color.DarkGray)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
                windowInsets = WindowInsets(0, 0, 0, 0)
            )
        },
        containerColor = Color(0xFFF1F5F9)
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            // Header Section with Search
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color.White,
                shadowElevation = 1.dp
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Buscar aplicación...", color = Color.Gray) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Color.Gray) },
                        shape = RoundedCornerShape(28.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(
                            focusedBorderColor = Color(0xFF1976D2),
                            unfocusedBorderColor = Color.LightGray.copy(alpha = 0.5f),
                            containerColor = Color(0xFFF8F9FA)
                        ),
                        singleLine = true
                    )
                }
            }
            // Pestañas de Gestión Premium
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color.White,
                shadowElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier
                        .padding(horizontal = 20.dp, vertical = 12.dp)
                        .fillMaxWidth()
                        .height(44.dp)
                        .background(Color(0xFFF1F5F9), RoundedCornerShape(22.dp))
                        .padding(4.dp)
                ) {
                    val tabs = listOf("Reglas Activas", "Todas las Apps")
                    tabs.forEachIndexed { index, title ->
                        val isSelected = selectedTab == index
                        Surface(
                            onClick = { selectedTab = index },
                            modifier = Modifier.weight(1f).fillMaxHeight(),
                            shape = RoundedCornerShape(18.dp),
                            color = if (isSelected) Color.White else Color.Transparent,
                            shadowElevation = if (isSelected) 2.dp else 0.dp
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    title,
                                    color = if (isSelected) Color(0xFF1976D2) else Color.Gray,
                                    fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.Medium,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            if (selectedTab == 0) {
                // PESTAÑA GESTIÓN
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    // SECCIÓN: Límites de App
                    val appsWithLimits = currentRules.filter { it.timeLimitMinutes > 0 && !it.isAlwaysAllowed }
                    ManagementSection(
                        title = "Límites de App",
                        description = "Establece límites de tiempo para que las aplicaciones sean inaccesibles tras el uso permitido.",
                        onAdd = { 
                            selectorType = AppsManagementSelectionType.LIMIT
                            showAppSelector = true 
                        }
                    ) {
                        if (appsWithLimits.isEmpty()) {
                            EmptyStateCard("Límite de tiempo", "⏱️")
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                appsWithLimits.forEach { rule ->
                                    val appName = installedApps.find { it["packageName"] == rule.packageName }?.get("name") ?: rule.packageName
                                    PermittedAppItem(name = "$appName (${rule.timeLimitMinutes} min)", iconEmoji = "⏱️")
                                }
                            }
                        }
                    }

                    // SECCIÓN: Siempre Permitido
                    val alwaysAllowedApps = currentRules.filter { it.isAlwaysAllowed }
                    ManagementSection(
                        title = "Siempre Permitido",
                        description = "Las aplicaciones en esta lista ignoran los bloqueos y límites de tiempo.",
                        onAdd = { 
                            selectorType = AppsManagementSelectionType.ALLOWED
                            showAppSelector = true 
                        }
                    ) {
                        if (alwaysAllowedApps.isEmpty()) {
                            EmptyStateCard("Apps permitidas", "✅")
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                alwaysAllowedApps.forEach { rule ->
                                    val appName = installedApps.find { it["packageName"] == rule.packageName }?.get("name") ?: rule.packageName
                                    PermittedAppItem(name = appName, iconEmoji = "🌟")
                                }
                            }
                        }
                    }

                    // SECCIÓN: Bloqueador de aplicaciones
                    val blockedApps = currentRules.filter { it.isBlocked && !it.isAlwaysAllowed }
                    ManagementSection(
                        title = "Bloqueador de aplicaciones",
                        description = "Bloquea aplicaciones específicas de forma permanente.",
                        onAdd = { 
                            selectorType = AppsManagementSelectionType.BLOCK
                            showAppSelector = true 
                        }
                    ) {
                        if (blockedApps.isEmpty()) {
                            EmptyStateCard("Reglas de bloqueo", "🛡️")
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                blockedApps.forEach { rule ->
                                    val appName = installedApps.find { it["packageName"] == rule.packageName }?.get("name") ?: rule.packageName
                                    PermittedAppItem(name = appName, iconEmoji = "🚫")
                                }
                            }
                        }
                    }
                    
                    Spacer(Modifier.height(32.dp))
                }
            } else {
                // PESTAÑA APLICACIONES (LISTA REAL)
                Column(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                        placeholder = { Text("Buscar aplicación...") },
                        leadingIcon = { Icon(Icons.Default.Search, null) },
                        shape = RoundedCornerShape(24.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(
                            containerColor = Color.White,
                            unfocusedBorderColor = Color.LightGray
                        )
                    )

                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = PaddingValues(bottom = 32.dp)
                    ) {
                        items(filteredApps) { app ->
                            AppRuleItem(app, rulesManager, syncManager)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ManagementSection(
    title: String,
    description: String? = null,
    onAdd: () -> Unit,
    content: @Composable () -> Unit
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(title, fontWeight = FontWeight.Black, fontSize = 16.sp)
            TextButton(onClick = onAdd) {
                Text("Añadir", color = Color(0xFF1976D2), fontWeight = FontWeight.Bold)
            }
        }
        if (description != null) {
            Text(
                description,
                fontSize = 12.sp,
                color = Color.Gray,
                lineHeight = 16.sp,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }
        content()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DowntimeScreen(syncManager: FirebaseSyncManager, onDismiss: () -> Unit) {
    var isActive by remember { mutableStateOf(false) }
    var schoolScheduleActive by remember { mutableStateOf(false) }
    var sleepScheduleActive by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tiempo de inactividad", fontWeight = FontWeight.Black) },
                navigationIcon = {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Volver")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = Color(0xFFF8F9FA)
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Spacer(Modifier.height(16.dp))

                // Banner de Advertencia Naranja
                Surface(
                    modifier = Modifier.fillMaxWidth().clickable { /* Abrir detalles */ },
                    color = Color(0xFFFFF3E0),
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Color(0xFFFFB74D).copy(0.3f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(shape = CircleShape, color = Color(0xFFFF9800), modifier = Modifier.size(24.dp)) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("i", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Text(
                            "Concede los permisos en Kiboo Kids",
                            color = Color(0xFFE65100),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.weight(1f)
                        )
                        Icon(Icons.Default.KeyboardArrowRight, null, tint = Color(0xFFFF9800), modifier = Modifier.size(20.dp))
                    }
                }

                Spacer(Modifier.height(24.dp))
                
                Text(
                    "Durante el tiempo de inactividad, solo estarán disponibles las llamadas telefónicas y las aplicaciones que añadas a Siempre permitidas.",
                    fontSize = 13.sp,
                    color = Color.Gray,
                    lineHeight = 18.sp
                )

                Spacer(Modifier.height(24.dp))

                // Tarjeta Principal de Configuración
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White,
                    shadowElevation = 1.dp
                ) {
                    Column {
                        // Switch principal
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Activar Tiempo de inactividad",
                                modifier = Modifier.weight(1f),
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                            Switch(
                                checked = isActive,
                                onCheckedChange = { 
                                    isActive = it
                                    syncManager.syncDowntimeConfig(mapOf("enabled" to it))
                                }
                            )
                        }
                        
                        Divider(color = Color(0xFFF0F0F0))

                        // Horario Escolar
                        DowntimeItem(
                            title = "Horario escolar",
                            details = "08:00 - 15:15, De lunes a viernes",
                            active = schoolScheduleActive,
                            onToggle = { 
                                schoolScheduleActive = it
                                syncManager.sendCommand(if(it) "DOWNTIME_SCHOOL_START" else "DOWNTIME_SCHOOL_STOP")
                            }
                        )
                        
                        Divider(color = Color(0xFFF0F0F0))

                        // Hora de dormir
                        DowntimeItem(
                            title = "Hora de dormir",
                            details = "22:00 - 07:00, Todos los días",
                            active = sleepScheduleActive,
                            onToggle = { 
                                sleepScheduleActive = it 
                                syncManager.sendCommand(if(it) "DOWNTIME_SLEEP_START" else "DOWNTIME_SLEEP_STOP")
                            }
                        )
                    }
                }
            }

            // Botón Añadir Horario (Fijo abajo)
            Button(
                onClick = { /* Lógica añadir */ },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(24.dp)
                    .height(54.dp),
                shape = RoundedCornerShape(27.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2979FF))
            ) {
                Text("Añadir horario", fontWeight = FontWeight.Black, fontSize = 16.sp)
            }
        }
    }
}

@Composable
fun DowntimeItem(
    title: String,
    details: String,
    active: Boolean,
    onToggle: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Icon(Icons.Default.KeyboardArrowRight, null, tint = Color.LightGray, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("\uD83D\uDEAB", fontSize = 12.sp) // Círculo de prohibido
                Spacer(Modifier.width(6.dp))
                Text(details, color = Color.Gray, fontSize = 12.sp)
            }
        }
        Switch(checked = active, onCheckedChange = onToggle)
    }
}

enum class AppsManagementSelectionType { LIMIT, ALLOWED, BLOCK }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppSelectionDialog(
    installedApps: List<Map<String, String>>,
    onDismiss: () -> Unit,
    onConfirm: (List<String>) -> Unit
) {
    var selectedPackages by remember { mutableStateOf(emptySet<String>()) }
    var searchQuery by remember { mutableStateOf("") }
    val filtered = installedApps.filter { it["name"]?.contains(searchQuery, ignoreCase = true) == true }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxWidth().heightIn(max = 600.dp),
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            modifier = Modifier.padding(16.dp).fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Seleccionar Aplicaciones", fontWeight = FontWeight.Black, fontSize = 18.sp)
                
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                    placeholder = { Text("Buscar...") },
                    leadingIcon = { Icon(Icons.Default.Search, null) },
                    shape = RoundedCornerShape(24.dp)
                )

                LazyColumn(modifier = Modifier.weight(1f)) {
                    items(filtered) { app ->
                        val pkg = app["packageName"] ?: ""
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth().clickable {
                                selectedPackages = if (pkg in selectedPackages) selectedPackages - pkg else selectedPackages + pkg
                            }.padding(vertical = 8.dp)
                        ) {
                            Checkbox(checked = pkg in selectedPackages, onCheckedChange = {
                                selectedPackages = if (pkg in selectedPackages) selectedPackages - pkg else selectedPackages + pkg
                            })
                            Spacer(Modifier.width(8.dp))
                            Text(app["name"] ?: pkg, fontSize = 14.sp)
                        }
                    }
                }

                Row(modifier = Modifier.fillMaxWidth().padding(top = 16.dp), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancelar") }
                    Button(onClick = { onConfirm(selectedPackages.toList()) }) { Text("Siguiente") }
                }
            }
        }
    }
}

@Composable
fun DurationSelectionDialog(onDismiss: () -> Unit, onConfirm: (Int) -> Unit) {
    var minutes by remember { mutableStateOf(30) }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Establecer Límite", fontWeight = FontWeight.Black) },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text("Selecciona el tiempo permitido por día:", fontSize = 14.sp, color = Color.Gray)
                Spacer(Modifier.height(20.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { if (minutes > 15) minutes -= 15 }) { Icon(Icons.Default.KeyboardArrowDown, null) }
                    Text("${minutes / 60}h ${minutes % 60}m", fontSize = 24.sp, fontWeight = FontWeight.Black)
                    IconButton(onClick = { minutes += 15 }) { Icon(Icons.Default.Add, null) }
                }
            }
        },
        confirmButton = {
            Button(onClick = { onConfirm(minutes) }) { Text("Confirmar") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}

@Composable
fun LocationTrackerScreen(syncManager: FirebaseSyncManager) {
    var deviceLocation by remember { mutableStateOf<Pair<Double, Double>?>(null) }
    var locationHistory by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
    var selectedDate by remember { mutableStateOf(java.text.SimpleDateFormat("yyyyMMdd", java.util.Locale.getDefault()).format(java.util.Date())) }

    LaunchedEffect(Unit) {
        syncManager.listenForLocation { lat, lng -> deviceLocation = Pair(lat, lng) }
    }

    LaunchedEffect(selectedDate) {
        syncManager.listenForLocationHistory(selectedDate) { history -> locationHistory = history }
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        // Mapa Placeholder Interactivo
        Surface(
            modifier = Modifier.fillMaxWidth().weight(1f),
            shape = RoundedCornerShape(24.dp),
            color = Color(0xFFE3F2FD),
            border = BorderStroke(1.dp, Color(0xFF1976D2).copy(0.2f))
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Map, null, modifier = Modifier.size(64.dp), tint = Color(0xFF1976D2).copy(0.3f))
                
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Mapa Tiempo Real", fontWeight = FontWeight.Black, color = Color(0xFF1976D2))
                    deviceLocation?.let {
                        Text("${it.first}, ${it.second}", fontSize = 12.sp, color = Color.Gray)
                    }
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        // Histórico de Rutas
        MenuCategory("Histórico de Rutas") {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Directions, null, tint = Color(0xFF1976D2))
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Ruta del día", fontWeight = FontWeight.Bold)
                    Text("${locationHistory.size} puntos registrados", fontSize = 12.sp, color = Color.Gray)
                }
                Button(onClick = { /* Abrir Diálogo de Fecha */ }, shape = RoundedCornerShape(12.dp)) {
                    Text("Cambiar Fecha")
                }
            }
        }
        
        Spacer(Modifier.height(16.dp))
        
        Button(
            onClick = { /* Abrir en Maps Externo */ },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp)
        ) {
            Text("Ver en Google Maps")
        }
    }
}
}

@Composable
fun LocationHistoryItem(item: Map<String, Any>) {
    val lat = item["lat"] as? Double ?: 0.0
    val lng = item["lng"] as? Double ?: 0.0
    val time = item["timestamp"] as? String ?: "Desconocido"
    
    Row(
        modifier = Modifier.fillMaxWidth().padding(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier.size(8.dp).background(Color(0xFF1976D2), CircleShape)
        )
        Spacer(Modifier.width(12.dp))
        Column {
            Text("Ubicación: $lat, $lng", fontSize = 14.sp, fontWeight = FontWeight.Medium)
            Text("Hora: $time", fontSize = 11.sp, color = Color.Gray)
        }
    }
}

enum class AppsManagementSelectionType { LIMIT, ALLOWED, BLOCK }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppSelectionDialog(
    installedApps: List<Map<String, String>>,
    onDismiss: () -> Unit,
    onConfirm: (List<String>) -> Unit
) {
    var selectedPackages by remember { mutableStateOf(emptySet<String>()) }
    var searchQuery by remember { mutableStateOf("") }
    val filtered = installedApps.filter { it["name"]?.contains(searchQuery, ignoreCase = true) == true }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = Modifier.fillMaxWidth().heightIn(max = 600.dp),
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = Color.White,
            modifier = Modifier.padding(16.dp).fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Seleccionar Aplicaciones", fontWeight = FontWeight.Black, fontSize = 18.sp)
                
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                    placeholder = { Text("Buscar...") },
                    leadingIcon = { Icon(Icons.Default.Search, null) },
                    shape = RoundedCornerShape(24.dp)
                )

                LazyColumn(modifier = Modifier.weight(1f)) {
                    items(filtered) { app ->
                        val pkg = app["packageName"] ?: ""
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth().clickable {
                                selectedPackages = if (pkg in selectedPackages) selectedPackages - pkg else selectedPackages + pkg
                            }.padding(vertical = 8.dp)
                        ) {
                            Checkbox(checked = pkg in selectedPackages, onCheckedChange = {
                                selectedPackages = if (pkg in selectedPackages) selectedPackages - pkg else selectedPackages + pkg
                            })
                            Spacer(Modifier.width(8.dp))
                            Text(app["name"] ?: pkg, fontSize = 14.sp)
                        }
                    }
                }

                Row(modifier = Modifier.fillMaxWidth().padding(top = 16.dp), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) { Text("Cancelar") }
                    Button(onClick = { onConfirm(selectedPackages.toList()) }) { Text("Siguiente") }
                }
            }
        }
    }
}

@Composable
fun DurationSelectionDialog(onDismiss: () -> Unit, onConfirm: (Int) -> Unit) {
    var minutes by remember { mutableStateOf(30) }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Establecer Límite", fontWeight = FontWeight.Black) },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text("Selecciona el tiempo permitido por día:", fontSize = 14.sp, color = Color.Gray)
                Spacer(Modifier.height(20.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { if (minutes > 15) minutes -= 15 }) { Icon(androidx.compose.material.icons.Icons.Default.KeyboardArrowDown, null) }
                    Text("${minutes / 60}h ${minutes % 60}m", fontSize = 24.sp, fontWeight = FontWeight.Black)
                    IconButton(onClick = { minutes += 15 }) { Icon(androidx.compose.material.icons.Icons.Default.Add, null) }
                }
            }
        },
        confirmButton = {
            Button(onClick = { onConfirm(minutes) }) { Text("Confirmar") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}

@Composable
fun ManagementSection(
    title: String,
    description: String? = null,
    onAdd: () -> Unit,
    content: @Composable () -> Unit
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(title, fontWeight = FontWeight.Black, fontSize = 16.sp)
            TextButton(onClick = onAdd) {
                Text("Añadir", color = Color(0xFF1976D2), fontWeight = FontWeight.Bold)
            }
        }
        if (description != null) {
            Text(
                description,
                fontSize = 12.sp,
                color = Color.Gray,
                lineHeight = 16.sp,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }
        content()
    }
}

@Composable
fun EmptyStateCard(label: String, emoji: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFEEEEEE))
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(emoji, fontSize = 48.sp)
            Spacer(Modifier.height(12.dp))
            Text(
                "No hay $label configurados.",
                color = Color.LightGray,
                fontSize = 13.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
fun PermittedAppItem(name: String, iconEmoji: String) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = Color.White,
        border = BorderStroke(1.dp, Color(0xFFEEEEEE))
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color(0xFFF5F5F5),
                modifier = Modifier.size(40.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(iconEmoji, fontSize = 20.sp)
                }
            }
            Spacer(Modifier.width(16.dp))
            Text(name, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Icon(androidx.compose.material.icons.Icons.Default.KeyboardArrowDown, null, tint = Color.LightGray, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
fun MenuCategory(title: String, content: @Composable () -> Unit) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 8.dp)) {
            Box(Modifier.width(3.dp).height(16.dp).background(Color(0xFF1976D2)))
            Spacer(Modifier.width(8.dp))
            Text(title, fontWeight = FontWeight.Black, fontSize = 15.sp, color = Color.DarkGray)
        }
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            shadowElevation = 1.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column { content() }
        }
    }
}

@Composable
fun MenuListItem(
    icon: ImageVector,
    title: String,
    badge: String? = null,
    trailing: @Composable (() -> Unit)? = null,
    onClick: (() -> Unit)? = null
) {
    Surface(
        onClick = { onClick?.invoke() },
        color = Color.Transparent,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, tint = Color.DarkGray, modifier = Modifier.size(24.dp))
            Spacer(Modifier.width(16.dp))
            Text(title, modifier = Modifier.weight(1f), fontSize = 14.sp, fontWeight = FontWeight.Medium)
            
            if (badge != null) {
                Surface(
                    shape = CircleShape,
                    color = Color.Red,
                    modifier = Modifier.size(20.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(badge, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.width(8.dp))
            }
            
            if (trailing != null) {
                trailing()
            } else if (onClick != null) {
                Icon(androidx.compose.material.icons.Icons.Default.KeyboardArrowRight, null, tint = Color.LightGray, modifier = Modifier.size(20.dp))
            }
        }
    }
}
