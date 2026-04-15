package com.example.parentalcontrol.models

data class Rule(
    val packageName: String,
    val isBlocked: Boolean = false,
    val isMonitored: Boolean = false,
    val timeLimitMinutes: Int = -1, // -1 means no limit
    val startTime: String? = null, // "HH:mm"
    val endTime: String? = null     // "HH:mm"
)
