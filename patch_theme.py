import sys

with open('app/src/main/kotlin/com/example/parentalcontrol/MainActivity.kt', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update globalAppTheme variable
old_var = 'var isGlobalDarkTheme by remember { mutableStateOf(sessionManager.isDarkTheme()) }'
new_var = 'var globalAppTheme by remember { mutableStateOf(sessionManager.getAppTheme()) }'
content = content.replace(old_var, new_var)

# 2. Update Theme usage
old_theme_call = 'ParentalControlTheme(darkTheme = isGlobalDarkTheme) {'
new_theme_call = 'ParentalControlTheme(appTheme = globalAppTheme) {'
content = content.replace(old_theme_call, new_theme_call)

# 3. Update MainScreen call
old_main_call_start = 'MainScreen('
old_main_call = '''                                MainScreen(
                                    isDarkTheme = isGlobalDarkTheme,
                                    onToggleTheme = { dark -> 
                                        isGlobalDarkTheme = dark
                                        sessionManager.setDarkTheme(dark)
                                    },'''
new_main_call = '''                                MainScreen(
                                    appTheme = globalAppTheme,
                                    onThemeChange = { newTheme -> 
                                        globalAppTheme = newTheme
                                        sessionManager.setAppTheme(newTheme)
                                    },'''
if old_main_call not in content:
    # Try finding line by line
    pass

content = content.replace(old_main_call, new_main_call)

# 4. Update MainScreen definition
old_def = 'fun MainScreen(isDarkTheme: Boolean, onToggleTheme: (Boolean) -> Unit, onLogout: () -> Unit) {'
new_def = 'fun MainScreen(appTheme: String, onThemeChange: (String) -> Unit, onLogout: () -> Unit) {'
content = content.replace(old_def, new_def)

# 5. Dropdown Menu items inside MainScreen
old_dropdown_item = '''                                    DropdownMenuItem(
                                        text = { Text(if (isDarkTheme) "Modo Claro" else "Modo Oscuro") },
                                        onClick = { 
                                            menuExpanded = false
                                            onToggleTheme(!isDarkTheme)
                                        }
                                    )'''
new_dropdown_items = '''                                    DropdownMenuItem(
                                        text = { Text("M. Niño 👦", color = Color(0xFF1976D2)) },
                                        onClick = { menuExpanded = false; onThemeChange(SessionManager.THEME_BOY) }
                                    )
                                    DropdownMenuItem(
                                        text = { Text("M. Niña 👧", color = Color(0xFFC2185B)) },
                                        onClick = { menuExpanded = false; onThemeChange(SessionManager.THEME_GIRL) }
                                    )
                                    DropdownMenuItem(
                                        text = { Text("M. Oscuro 🌙", color = Color.DarkGray) },
                                        onClick = { menuExpanded = false; onThemeChange(SessionManager.THEME_DARK) }
                                    )'''
content = content.replace(old_dropdown_item, new_dropdown_items)

# 6. Update ParentalControlTheme function definition
old_theme_func = '''@Composable
fun ParentalControlTheme(darkTheme: Boolean = androidx.compose.foundation.isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val lightColors = lightColorScheme(
        primary = Color(0xFF8B5E00), 
        secondary = Color(0xFF6D4C41),
        background = Color(0xFFFDF6EE),
        surface = Color.White,
        onSurface = Color.Black
    )
    
    val darkColors = darkColorScheme(
        primary = Color(0xFFFFB142), 
        secondary = Color(0xFFD7CCC8),
        background = Color(0xFF121212),
        surface = Color(0xFF1E1E1E),
        onSurface = Color.White
    )

    MaterialTheme(
        colorScheme = if (darkTheme) darkColors else lightColors,
        content = content
    )
}'''

new_theme_func = '''@Composable
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
}'''

# Ensure to fall back if exact match fails
if old_theme_func not in content:
    start_idx = content.find('@Composable\nfun ParentalControlTheme')
    if start_idx != -1:
        end_idx = content.find('}', start_idx)
        # Search for closing bracket of the theme
        end_idx = content.find('}', end_idx + 1)
        end_idx = content.find('}', end_idx + 1)
        if end_idx != -1:
            content = content[:start_idx] + new_theme_func + content[end_idx+1:]
else:
    content = content.replace(old_theme_func, new_theme_func)

# 7. Also remember to fix the main screen top bar color handling.
# Currently it is: color = Color(0xFF7B5400) and brush Gradient...
# Let's make it theme-aware using MaterialTheme.colorScheme.primary!
old_header = '''                color = Color(0xFF7B5400),
                shape = RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .background(Brush.verticalGradient(listOf(Color(0xFF7B5400), Color(0xFF5E4000))))'''

new_header = '''                color = MaterialTheme.colorScheme.primary,
                shape = RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier
                        .background(Brush.verticalGradient(listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.secondary)))'''
content = content.replace(old_header, new_header)

with open('app/src/main/kotlin/com/example/parentalcontrol/MainActivity.kt', 'w', encoding='utf-8') as f:
    f.write(content)
print("MainActivity updated for 3-Theme system!")
