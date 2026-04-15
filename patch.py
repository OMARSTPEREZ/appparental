import sys

with open('app/src/main/kotlin/com/example/parentalcontrol/MainActivity.kt', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('if (currentUser == null) {')
end_idx = content.find('// Loading Overlay')

if start_idx != -1 and end_idx != -1:
    new_block = """                        if (showDisclosures) {
                            AlertDialog(
                                onDismissRequest = { },
                                title = { Text("Privacidad y Permisos", fontWeight = FontWeight.Bold) },
                                text = {
                                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text("KinderGuard requiere accesos de sistema para proteger este dispositivo:")
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
                            RoleSelectionScreen(onRoleSelected = { role ->
                                if (role == SessionManager.ROLE_CHILD) {
                                    tempSelectedRole = role
                                    showDisclosures = true
                                } else {
                                    sessionManager.saveUserRole(role)
                                    userRole = role
                                }
                            })
                        } else {
                            if (userRole == SessionManager.ROLE_ADMIN) {
                                MainScreen(
                                    isDarkTheme = isGlobalDarkTheme,
                                    onToggleTheme = { dark -> 
                                        isGlobalDarkTheme = dark
                                        sessionManager.setDarkTheme(dark)
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

                    """
    new_content = content[:start_idx] + new_block + content[end_idx:]
    
    if 'import androidx.compose.ui.unit.sp' not in new_content:
        import_idx = new_content.find('import androidx.compose.ui.unit.dp')
        if import_idx != -1:
            new_content = new_content[:import_idx] + 'import androidx.compose.ui.unit.dp\nimport androidx.compose.ui.unit.sp\n' + new_content[import_idx + len('import androidx.compose.ui.unit.dp'):]

    with open('app/src/main/kotlin/com/example/parentalcontrol/MainActivity.kt', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Success")
else:
    print("Failed to match")
