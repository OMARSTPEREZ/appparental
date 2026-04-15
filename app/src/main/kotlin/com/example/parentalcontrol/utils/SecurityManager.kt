package com.example.parentalcontrol.utils

import android.content.Context
import android.content.SharedPreferences

class SecurityManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun hasPinSet(): Boolean {
        return prefs.getString(KEY_PIN, null) != null
    }

    fun savePin(pin: String) {
        prefs.edit().putString(KEY_PIN, pin).apply()
    }

    fun verifyPin(pin: String): Boolean {
        val savedPin = prefs.getString(KEY_PIN, null)
        return savedPin != null && savedPin == pin
    }

    fun clearPin() {
        prefs.edit().remove(KEY_PIN).apply()
    }

    companion object {
        private const val PREFS_NAME = "security_prefs"
        private const val KEY_PIN = "admin_pin"
    }
}
