package com.example.parentalcontrol.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Composable
fun AnimatedKibooIcon(
    imageVector: ImageVector,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    tint: Color = Color.Unspecified,
    size: Dp = 24.dp,
    isChildMode: Boolean = false
) {
    val infiniteTransition = rememberInfiniteTransition(label = "kiboo_icon_anim")
    
    if (isChildMode) {
        // Playful bouncy/jiggle animation for child mode
        val scale by infiniteTransition.animateFloat(
            initialValue = 0.85f,
            targetValue = 1.15f,
            animationSpec = infiniteRepeatable(
                animation = tween(600, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "scale"
        )
        val rotation by infiniteTransition.animateFloat(
            initialValue = -12f,
            targetValue = 12f,
            animationSpec = infiniteRepeatable(
                animation = tween(800, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "rotation"
        )
        
        Icon(
            imageVector = imageVector,
            contentDescription = contentDescription,
            modifier = modifier
                .size(size)
                .graphicsLayer(
                    scaleX = scale,
                    scaleY = scale,
                    rotationZ = rotation
                ),
            tint = tint
        )
    } else {
        // Premium "breathing" animation for admin/parent mode
        val scale by infiniteTransition.animateFloat(
            initialValue = 0.95f,
            targetValue = 1.05f,
            animationSpec = infiniteRepeatable(
                animation = tween(2000, easing = LinearOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "breathing"
        )
        
        Icon(
            imageVector = imageVector,
            contentDescription = contentDescription,
            modifier = modifier
                .size(size)
                .graphicsLayer(
                    scaleX = scale,
                    scaleY = scale
                ),
            tint = tint
        )
    }
}
