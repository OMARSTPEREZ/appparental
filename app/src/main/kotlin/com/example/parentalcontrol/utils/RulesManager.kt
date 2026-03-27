package com.example.parentalcontrol.utils

import android.content.Context
import android.content.SharedPreferences
import com.example.parentalcontrol.models.Rule
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class RulesManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("ParentalRules", Context.MODE_PRIVATE)
    private val gson = Gson()

    fun saveRules(rules: List<Rule>) {
        val json = gson.toJson(rules)
        prefs.edit().putString("rules_list", json).apply()
    }

    fun getRules(): List<Rule> {
        val json = prefs.getString("rules_list", null) ?: return emptyList()
        val type = object : TypeToken<List<Rule>>() {}.type
        return gson.fromJson(json, type)
    }

    fun isAppBlocked(packageName: String): Boolean {
        val rules = getRules()
        return rules.find { it.packageName == packageName }?.isBlocked ?: false
    }
}
