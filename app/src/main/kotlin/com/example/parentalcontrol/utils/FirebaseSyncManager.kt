package com.example.parentalcontrol.utils

import com.example.parentalcontrol.models.Rule
import com.google.firebase.database.*
import com.google.firebase.database.ktx.database
import com.google.firebase.ktx.Firebase

class FirebaseSyncManager(private val childId: String) {
    private val database = Firebase.database.reference.child("children").child(childId)

    fun syncLocation(lat: Double, lng: Double) {
        val locationData = mapOf(
            "latitude" to lat,
            "longitude" to lng,
            "timestamp" to System.currentTimeMillis()
        )
        database.child("location").setValue(locationData)
    }

    fun listenForRules(onRulesUpdated: (List<Rule>) -> Unit) {
        database.child("rules").addValueEventListener(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val rules = mutableListOf<Rule>()
                for (ruleSnap in snapshot.children) {
                    val packageName = ruleSnap.key ?: continue
                    val isBlocked = ruleSnap.child("isBlocked").getValue(Boolean::class.java) ?: false
                    rules.add(Rule(packageName, isBlocked))
                }
                onRulesUpdated(rules)
            }

            override fun onCancelled(error: DatabaseError) {
                // Handle error
            }
        })
    }

    fun updateRulesInCloud(rules: List<Rule>) {
        val rulesMap = rules.associate { it.packageName to mapOf("isBlocked" to it.isBlocked) }
        database.child("rules").updateChildren(rulesMap)
    }
}
