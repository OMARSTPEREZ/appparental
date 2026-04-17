package com.example.parentalcontrol.models

data class SubscriptionData(
    val isTrial: Boolean = true,
    val isPaid: Boolean = false,
    val trialEndsAt: Long = 0L
)
