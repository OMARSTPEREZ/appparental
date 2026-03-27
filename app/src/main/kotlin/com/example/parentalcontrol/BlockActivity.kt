package com.example.parentalcontrol

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class BlockActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            BlockScreen {
                finish()
            }
        }
    }
}

@Composable
fun BlockScreen(onDismiss: () -> Unit) {
    Surface(modifier = Modifier.fillMaxSize(), color = Color.Red.copy(alpha = 0.9f)) {
        Column(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "APP BLOQUEADA",
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Esta aplicación ha sido restringida por tus padres.",
                color = Color.White,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                fontSize = 18.sp
            )
            Spacer(modifier = Modifier.height(48.dp))
            Button(
                onClick = onDismiss,
                colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color.Red)
            ) {
                Text("Cerrar")
            }
        }
    }
}
