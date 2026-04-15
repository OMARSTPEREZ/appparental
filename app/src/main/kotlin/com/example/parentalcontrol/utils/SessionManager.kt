package com.example.parentalcontrol.utils

import android.content.Context
import android.content.SharedPreferences

class SessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("AppSession", Context.MODE_PRIVATE)

    companion object {
        const val KEY_USER_ROLE = "user_role"
        const val ROLE_ADMIN = "ADMIN"
        const val ROLE_CHILD = "CHILD"
        const val ROLE_NONE = "NONE"

        const val THEME_BOY = "BOY"
        const val THEME_GIRL = "GIRL"
        const val THEME_DARK = "DARK"
    }

    fun saveUserRole(role: String) {
        prefs.edit().putString(KEY_USER_ROLE, role).apply()
    }

    fun getUserRole(): String {
        return prefs.getString(KEY_USER_ROLE, ROLE_NONE) ?: ROLE_NONE
    }

    fun clearSession() {
        prefs.edit().clear().apply()
    }
    
    fun setAppTheme(theme: String) {
        prefs.edit().putString("app_theme", theme).apply()
    }
    
    fun getAppTheme(): String {
        return prefs.getString("app_theme", THEME_BOY) ?: THEME_BOY
    }
}
