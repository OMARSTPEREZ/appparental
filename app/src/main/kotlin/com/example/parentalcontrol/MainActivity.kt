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
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

import androidx.core.graphics.drawable.toBitmap
import androidx.core.content.ContextCompat
import androidx.compose.ui.graphics.Brush
import androidx.compose.material.icons.filled.Search
import androidx.compose.foundation.shape.RoundedCornerShape
import android.util.Base64
import android.graphics.BitmapFactory
import com.example.parentalcontrol.models.Rule
import com.example.parentalcontrol.services.MonitoringService
import com.example.parentalcontrol.utils.FirebaseSyncManager
import com.example.parentalcontrol.utils.RulesManager
import com.example.parentalcontrol.utils.SessionManager
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.compose.ui.graphics.Color
import com.example.parentalcontrol.utils.SecurityManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.res.painterResource
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import com.example.parentalcontrol.R
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import com.example.parentalcontrol.utils.AdminReceiver

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
            
            var globalAppTheme by remember { mutableStateOf(sessionManager.getAppTheme()) }

            ParentalControlTheme(appTheme = globalAppTheme) {
                Box(modifier = Modifier.fillMaxSize()) {
                    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                        var showDisclosures by remember { mutableStateOf(false) }
                        var tempSelectedRole by remember { mutableStateOf<String?>(null) }
                        
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

                        if (currentUser == null) {
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
                                    }
                                )
                            }
                        } else if (userRole == SessionManager.ROLE_NONE) {
                            RoleSelectionScreen(onRoleSelected = { role, theme ->
                                if (role == SessionManager.ROLE_CHILD) {
                                    tempSelectedRole = role
                                    if (theme != null) {
                                        globalAppTheme = theme
                                        sessionManager.setAppTheme(theme)
                                    }
                                    showDisclosures = true
                                } else {
                                    sessionManager.saveUserRole(role)
                                    userRole = role
                                }
                            })
                        } else {
                            if (userRole == SessionManager.ROLE_ADMIN) {
                                MainScreen(
                                    appTheme = globalAppTheme,
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
                                ChildDashboard(onLogout = {
                                    auth.signOut()
                                    sessionManager.clearSession()
                                    currentUser = null
                                    userRole = SessionManager.ROLE_NONE
                                })
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
    fun ChildDashboard(onLogout: () -> Unit) {
        val securityManager = remember { SecurityManager(this@MainActivity) }
        var showLogoutConfirmation by remember { mutableStateOf(false) }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFFDF6EE))
                .padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Surface(
                modifier = Modifier.size(120.dp),
                shape = CircleShape,
                color = Color(0xFFBBDEFB)
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.img_robot), // Cambiado de img_profiles
                    contentDescription = null,
                    modifier = Modifier.padding(24.dp),
                    tint = Color(0xFF1976D2)
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Text(
                text = "DispositivoProtegido", 
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Black), 
                color = Color(0xFF3E2723),
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "Kiboo está monitoreando activamente para mantenerte seguro.", 
                style = MaterialTheme.typography.bodyMedium, 
                color = Color.Gray,
                textAlign = TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            var pinInput by remember { mutableStateOf("") }
            OutlinedTextField(
                value = pinInput,
                onValueChange = { pinInput = it },
                label = { Text("PIN de Administrador") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(0.8f)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Button(
                onClick = { 
                    if (pinInput == "123456") { // PIN maestro básico para validación MVP
                        showLogoutConfirmation = true 
                    } else {
                        Toast.makeText(this@MainActivity, "PIN Incorrecto", Toast.LENGTH_SHORT).show()
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD32F2F))
            ) {
                Text("Desvincular Dispositivo")
            }
        }

        if (showLogoutConfirmation) {
            AlertDialog(
                onDismissRequest = { showLogoutConfirmation = false },
                title = { Text("Cerrar Sesión") },
                text = { Text("¿Estás seguro de que deseas salir del perfil del hijo?") },
                confirmButton = {
                    Button(onClick = {
                        showLogoutConfirmation = false
                        onLogout()
                    }) {
                        Text("Sí, Salir")
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
    fun MainScreen(appTheme: String, onThemeChange: (String) -> Unit, onLogout: () -> Unit) {
        var hasUsageStats by remember { mutableStateOf(hasUsageStatsPermission(this)) }
        var hasOverlay by remember { mutableStateOf(Settings.canDrawOverlays(this)) }
        
        var hasCamera by remember { mutableStateOf(ContextCompat.checkSelfPermission(this, android.Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) }
        var hasLocation by remember { mutableStateOf(ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) }
        var hasNotification by remember { mutableStateOf(isNotificationListenerEnabled(this)) }
        
        val rulesManager = remember { RulesManager(this@MainActivity) }
        val firebaseSyncManager = remember { FirebaseSyncManager(auth.currentUser?.uid ?: "anonymous") }
        
        var installedApps by remember { mutableStateOf<List<Map<String, String>>>(emptyList()) }
        var searchQuery by remember { mutableStateOf("") }
        
        var showThemeSettingsDialog by remember { mutableStateOf(false) }

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
                        // Niño
                        Surface(
                            onClick = { onThemeChange("BOY") },
                            shape = RoundedCornerShape(16.dp),
                            color = if (appTheme == "BOY") Color(0xFF1976D2) else Color(0xFFE3F2FD),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Text("👦", fontSize = 32.sp)
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Modo Niño", fontWeight = FontWeight.Black, color = if (appTheme == "BOY") Color.White else Color(0xFF1565C0))
                                    Text("Azul y Celeste", fontSize = 12.sp, color = if (appTheme == "BOY") Color.White.copy(0.8f) else Color(0xFF42A5F5))
                                }
                                if (appTheme == "BOY") Text("✓", color = Color.White, fontWeight = FontWeight.Black, fontSize = 18.sp)
                            }
                        }

                        // Niña
                        Surface(
                            onClick = { onThemeChange("GIRL") },
                            shape = RoundedCornerShape(16.dp),
                            color = if (appTheme == "GIRL") Color(0xFFE91E63) else Color(0xFFFCE4EC),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Text("👧", fontSize = 32.sp)
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Modo Niña", fontWeight = FontWeight.Black, color = if (appTheme == "GIRL") Color.White else Color(0xFFC2185B))
                                    Text("Rosa y Magenta", fontSize = 12.sp, color = if (appTheme == "GIRL") Color.White.copy(0.8f) else Color(0xFFEC407A))
                                }
                                if (appTheme == "GIRL") Text("✓", color = Color.White, fontWeight = FontWeight.Black, fontSize = 18.sp)
                            }
                        }

                        // Oscuro
                        Surface(
                            onClick = { onThemeChange("DARK") },
                            shape = RoundedCornerShape(16.dp),
                            color = if (appTheme == "DARK") Color(0xFF212121) else Color(0xFFEEEEEE),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
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
                    Button(
                        onClick = { showThemeSettingsDialog = false },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) { Text("Guardar", fontWeight = FontWeight.Bold) }
                }
            )
        }
var showInviteDialog by remember { mutableStateOf(false) }

        if (showInviteDialog) {
            AlertDialog(
                onDismissRequest = { showInviteDialog = false },
                title = { Text("Añadir Dispositivo (Hijo)") },
                text = { 
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                        Text("Abre este enlace en el navegador del celular de tu hijo para instalar la App de control en modo invisible:", textAlign = TextAlign.Center)
                        Spacer(modifier = Modifier.height(16.dp))
                        Surface(color = Color(0xFFFFF3E0), shape = RoundedCornerShape(8.dp)) {
                            Text(
                                text = "https://kinderguard.com/app.apk", 
                                modifier = Modifier.padding(16.dp),
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFE65100)
                            )
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = { showInviteDialog = false },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7B5400))
                    ) { Text("Entendido") }
                }
            )
        }

        LaunchedEffect(Unit) {
            firebaseSyncManager.listenForInstalledApps { apps ->
                val uniqueApps = apps.distinctBy { it["packageName"] }
                installedApps = uniqueApps
            }
        }

        Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
            // Header Dashboard
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary,
                shape = RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .background(Brush.verticalGradient(listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.secondary)))
                        .padding(24.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Panel Admin", color = Color.White.copy(alpha = 0.7f), style = MaterialTheme.typography.labelMedium)
                            Text("Kiboo", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
                        }
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Botón Añadir Hijo
                            IconButton(
                                onClick = { showInviteDialog = true },
                                modifier = Modifier.background(Color.White.copy(alpha = 0.1f), CircleShape)
                            ) {
                                Icon(Icons.Default.PersonAdd, contentDescription = "Añadir Hijo", tint = Color.White)
                            }
                            
                            // Menú Desplegable (Cerrar sesión, Modo oscuro)
                            var menuExpanded by remember { mutableStateOf(false) }
                            Box {
                                IconButton(
                                    onClick = { menuExpanded = true },
                                    modifier = Modifier.background(Color.White.copy(alpha = 0.1f), CircleShape)
                                ) {
                                    Icon(Icons.Default.MoreVert, contentDescription = "Más opciones", tint = Color.White)
                                }
                                
                                DropdownMenu(
                                    expanded = menuExpanded,
                                    onDismissRequest = { menuExpanded = false },
                                    modifier = Modifier.background(Color.White)
                                ) {
                                    DropdownMenuItem(
                                        text = { Text("Cerrar Sesión", color = Color.Red) },
                                        onClick = { 
                                            menuExpanded = false
                                            onLogout() 
                                        }
                                    )
                                    DropdownMenuItem(
                                        text = { Text("Agregar a Grupo Familiar") },
                                        onClick = { 
                                            menuExpanded = false
                                            Toast.makeText(this@MainActivity, "Próximamente: Enlace familiar", Toast.LENGTH_SHORT).show()
                                        }
                                    )
                                    DropdownMenuItem(
                                        text = { Text("Configuración Visual ⚙️") },
                                        onClick = { 
                                            menuExpanded = false
                                            showThemeSettingsDialog = true 
                                        }
                                    )
                                }
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly
                    ) {
                        DashboardStat(count = "${installedApps.size}", label = "Total Apps")
                        DashboardStat(count = "${installedApps.count { rulesManager.isAppBlocked(it["packageName"] ?: "") }}", label = "Bloqueadas", color = Color(0xFFFFB19A))
                    }
                }
            }
            
            var currentTab by remember { mutableStateOf(0) }
            TabRow(
                selectedTabIndex = currentTab,
                containerColor = Color.Transparent,
                contentColor = Color(0xFF7B5400),
                modifier = Modifier.padding(horizontal = 16.dp).padding(top = 8.dp)
            ) {
                Tab(selected = currentTab == 0, onClick = { currentTab = 0 }, text = { Text("Apps", fontWeight = FontWeight.Bold) })
                Tab(selected = currentTab == 1, onClick = { currentTab = 1 }, text = { Text("Monitor", fontWeight = FontWeight.Bold) })
            }

            if (currentTab == 0) {
                Column(modifier = Modifier.padding(16.dp)) {
                // Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    placeholder = { Text("Buscar aplicación...", color = Color.Gray) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.Gray) },
                    shape = RoundedCornerShape(24.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedContainerColor = Color.White,
                        focusedContainerColor = Color.White,
                        unfocusedBorderColor = Color.Transparent,
                        focusedBorderColor = Color(0xFF7B5400)
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))
                
                // Panel de Permisos
                var showPermissionsDialog by remember { mutableStateOf(false) }

                val missingPermissions = listOfNotNull(
                    if (!hasUsageStats) "Acceso Uso" else null,
                    if (!hasOverlay) "Superposición" else null,
                    if (!hasCamera) "Cámara" else null,
                    if (!hasLocation) "Ubicación" else null,
                    if (!hasNotification) "Notificaciones" else null
                )

                if (missingPermissions.isNotEmpty()) {
                    Button(
                        onClick = { showPermissionsDialog = true },
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp).height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFD84315)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("⚠️ Configurar Permisos Faltantes (${missingPermissions.size})", fontWeight = FontWeight.Bold)
                    }
                } else {
                    Button(
                        onClick = { showPermissionsDialog = true },
                        modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp).height(50.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("✅ Permisos Completos (Ver/Editar)", fontWeight = FontWeight.Bold)
                    }
                }

                if (showPermissionsDialog) {
                    PermissionsManagerDialog(
                        context = this@MainActivity,
                        onDismiss = { showPermissionsDialog = false },
                        hasUsageStats = hasUsageStats,
                        hasOverlay = hasOverlay,
                        hasCamera = hasCamera,
                        hasLocation = hasLocation,
                        hasNotification = hasNotification
                    )
                }

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatusChip("Uso", hasUsageStats)
                    StatusChip("Overlay", hasOverlay)
                    
                    Spacer(modifier = Modifier.weight(1f))
                    
                    Button(
                        onClick = { startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)) },
                        modifier = Modifier.height(32.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7B5400).copy(alpha = 0.1f), contentColor = Color(0xFF7B5400))
                    ) {
                        Text("Ajustes", style = MaterialTheme.typography.labelSmall)
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
                
                Text(
                    text = "Aplicaciones Instaladas", 
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    color = Color(0xFF3E2723)
                )
                
                Spacer(modifier = Modifier.height(8.dp))

                val filteredApps = installedApps.filter { 
                    val name = it["name"] ?: ""
                    val packageName = it["packageName"] ?: ""
                    name.contains(searchQuery, ignoreCase = true) || 
                    packageName.contains(searchQuery, ignoreCase = true)
                }

                LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(filteredApps) { app ->
                        AppRuleItem(app, rulesManager, firebaseSyncManager)
                    }
                }
            }
            } else {
                MonitorScreen(firebaseSyncManager)
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
    fun AppRuleItem(app: Map<String, String>, rulesManager: RulesManager, firebaseSyncManager: FirebaseSyncManager) {
        val packageName = app["packageName"] ?: ""
        val name = app["name"] ?: ""
        
        var isBlocked by remember { mutableStateOf(rulesManager.isAppBlocked(packageName)) }
        var isMonitored by remember { mutableStateOf(rulesManager.isAppMonitored(packageName)) }
        
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            shadowElevation = 2.dp
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    modifier = Modifier.size(48.dp),
                    shape = CircleShape,
                    color = Color(0xFFF3E5F5)
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Text(
                            text = if (name.isNotEmpty()) name.take(1).uppercase() else "?",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF7B5400)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.width(16.dp))
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(text = packageName, style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                }
                
                Column(horizontalAlignment = Alignment.End) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(if (isBlocked) "🚫 Bloqueada  " else "✅ Permitida  ", style = MaterialTheme.typography.labelSmall)
                        Switch(
                            checked = isBlocked,
                            onCheckedChange = {
                                isBlocked = it
                                val currentRules = rulesManager.getRules().toMutableList()
                                currentRules.removeAll { r -> r.packageName == packageName }
                                currentRules.add(Rule(packageName, isBlocked = it, isMonitored = isMonitored))
                                rulesManager.saveRules(currentRules)
                                firebaseSyncManager.updateRulesInCloud(currentRules)
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = Color.Red.copy(alpha = 0.7f),
                                uncheckedThumbColor = Color.LightGray,
                                uncheckedTrackColor = Color.LightGray.copy(alpha = 0.3f)
                            ),
                            modifier = Modifier.height(30.dp).width(40.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(if (isMonitored) "👁️ Rastreada " else "🙈 Privada   ", style = MaterialTheme.typography.labelSmall)
                        Switch(
                            checked = isMonitored,
                            onCheckedChange = {
                                isMonitored = it
                                val currentRules = rulesManager.getRules().toMutableList()
                                currentRules.removeAll { r -> r.packageName == packageName }
                                currentRules.add(Rule(packageName, isBlocked = isBlocked, isMonitored = it))
                                rulesManager.saveRules(currentRules)
                                firebaseSyncManager.updateRulesInCloud(currentRules)
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = Color(0xFF1976D2).copy(alpha = 0.8f),
                                uncheckedThumbColor = Color.LightGray,
                                uncheckedTrackColor = Color.LightGray.copy(alpha = 0.3f)
                            ),
                            modifier = Modifier.height(30.dp).width(40.dp)
                        )
                    }
                }
            }
        }
    }

    @Composable
    fun MonitorScreen(firebaseSyncManager: FirebaseSyncManager) {
        var isStreaming by remember { mutableStateOf(false) }
        var cameraFrame by remember { mutableStateOf<android.graphics.Bitmap?>(null) }
        var locationText by remember { mutableStateOf("Buscando señal GPS...") }
        
        var batteryPct by remember { mutableStateOf(-1) }
        var gpsEnabled by remember { mutableStateOf(false) }
        var notifications by remember { mutableStateOf<List<Map<String, Any>>>(emptyList()) }
        
        LaunchedEffect(Unit) {
            firebaseSyncManager.listenForLocation { lat, lng ->
                locationText = "Lat: $lat, Lng: $lng"
            }
            firebaseSyncManager.listenForCameraFrame { base64 ->
                try {
                    val decodedBytes = Base64.decode(base64, Base64.DEFAULT)
                    cameraFrame = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            firebaseSyncManager.listenForDeviceStatus { bat, gps ->
                batteryPct = bat
                gpsEnabled = gps
            }
            firebaseSyncManager.listenForNotifications { notifs ->
                notifications = notifs
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 32.dp)
        ) {
            // Modulo: Estado del Dispositivo
            item {
                Text("Estado del Dispositivo", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color(0xFF3E2723))
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    StatusCard(title = "Batería", value = if (batteryPct >= 0) "$batteryPct%" else "---", modifier = Modifier.weight(1f))
                    StatusCard(title = "GPS", value = if (gpsEnabled) "Encendido" else "Apagado", modifier = Modifier.weight(1f), 
                               valueColor = if (gpsEnabled) Color(0xFF4CAF50) else Color.Red)
                }
            }

            // Módulo: Ubicación
            item {
                Text("Cámara y Ubicación", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Spacer(modifier = Modifier.height(8.dp))
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surface,
                    shadowElevation = 2.dp
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Última Posición GPS", fontWeight = FontWeight.Bold, color = Color(0xFF7B5400))
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(locationText, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }

            // Módulo: Visor de Cámara
            item {
                Surface(
                    modifier = Modifier.fillMaxWidth().height(250.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = Color.Black,
                    contentColor = Color.White,
                    shadowElevation = 4.dp
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        if (cameraFrame != null) {
                            Image(
                                bitmap = cameraFrame!!.asImageBitmap(),
                                contentDescription = "Stream de la cámara",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = androidx.compose.ui.layout.ContentScale.Crop
                            )
                        } else {
                            Text(if (isStreaming) "Cargando Stream..." else "Cámara inactiva", color = Color.Gray)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    Button(
                        onClick = {
                            isStreaming = true
                            firebaseSyncManager.sendCommand("START_CAMERA")
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7B5400))
                    ) {
                        Text("Ver Cámara")
                    }
                    Button(
                        onClick = {
                            isStreaming = false
                            cameraFrame = null
                            firebaseSyncManager.sendCommand("STOP_CAMERA")
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.LightGray, contentColor = Color.Black)
                    ) {
                        Text("Parar")
                    }
                }
            }

            // Módulo: Mensajes
            item {
                Spacer(modifier = Modifier.height(8.dp))
                Text("Mensajes Recientes", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Color(0xFF3E2723))
                Text("Los mensajes se eliminan automáticamente tras 3 días.", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                Spacer(modifier = Modifier.height(8.dp))
            }
            
            if (notifications.isEmpty()) {
                item {
                    Text("No hay mensajes interceptados", modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center, color = Color.Gray)
                }
            } else {
                items(notifications.size) { index ->
                    val notif = notifications[index]
                    val title = notif["title"] as? String ?: "Desconocido"
                    val message = notif["message"] as? String ?: ""
                    val packageName = notif["packageName"] as? String ?: ""
                    val timestamp = notif["timestamp"] as? Long ?: 0L
                    
                    val date = java.text.SimpleDateFormat("dd/MMM HH:mm", java.util.Locale.getDefault()).format(java.util.Date(timestamp))
                    
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surface,
                        shadowElevation = 1.dp
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(title, fontWeight = FontWeight.Bold, color = Color(0xFF7B5400))
                                Text(date, style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(message, style = MaterialTheme.typography.bodyMedium)
                            Text(packageName, style = MaterialTheme.typography.labelSmall, color = Color.LightGray)
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
        hasNotification: Boolean
    ) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = {
                Text("Gestor de Permisos", fontWeight = FontWeight.Bold, color = Color(0xFF3E2723))
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Toca los interruptores para ir a configurar los permisos en el sistema Android.", style = MaterialTheme.typography.bodyMedium, color = Color.Gray)
                    
                    PermissionSwitchRow(
                        title = "Uso de Aplicaciones",
                        subtitle = "Ver apps usadas",
                        isEnabled = hasUsageStats,
                        onClick = { context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
                    )
                    
                    PermissionSwitchRow(
                        title = "Superposición (Overlay)",
                        subtitle = "Bloquear pantallas",
                        isEnabled = hasOverlay,
                        onClick = { context.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
                    )
                    
                    PermissionSwitchRow(
                        title = "Leer Notificaciones",
                        subtitle = "Interceptar mensajes",
                        isEnabled = hasNotification,
                        onClick = { context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
                    )
                    
                    PermissionSwitchRow(
                        title = "Cámara y Ubicación",
                        subtitle = "Vigilancia en vivo",
                        isEnabled = hasCamera && hasLocation,
                        onClick = { 
                            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                data = Uri.fromParts("package", context.packageName, null)
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            context.startActivity(intent)
                        }
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = onDismiss) { Text("Cerrar") }
            },
            containerColor = Color.White
        )
    }

    @Composable
    fun PermissionSwitchRow(title: String, subtitle: String, isEnabled: Boolean, onClick: () -> Unit) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyLarge)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
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
