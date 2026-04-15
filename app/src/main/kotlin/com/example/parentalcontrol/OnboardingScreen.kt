package com.example.parentalcontrol

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun OnboardingScreen(
    onRegisterClick: () -> Unit,
    onGoogleSignInClick: () -> Unit
) {
    // Definición de colores según el mockup
    val backgroundGradient = Brush.verticalGradient(
        colors = listOf(Color(0xFFFDF6EE), Color(0xFFF7E9D7))
    )
    val primaryColor = Color(0xFF8B5E00) // Color café/bronce del botón
    val secondaryTextColor = Color(0xFF6D4C41)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundGradient)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Sección de Ilustración Central
            Box(
                modifier = Modifier
                    .size(280.dp)
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                // Tarjeta Blanca Central
                Surface(
                    modifier = Modifier.size(200.dp),
                    shape = RoundedCornerShape(40.dp),
                    color = Color.White,
                    shadowElevation = 8.dp
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.img_robot),
                        contentDescription = "Robot Parental",
                        modifier = Modifier.padding(20.dp),
                        contentScale = ContentScale.Fit
                    )
                }

                // Icono Flotante: Escudo (Arriba Derecha)
                Surface(
                    modifier = Modifier
                        .size(60.dp)
                        .align(Alignment.TopEnd)
                        .offset(x = (-10).dp, y = 10.dp),
                    shape = RoundedCornerShape(18.dp),
                    color = Color(0xFF64B5F6), // Azul claro
                    shadowElevation = 4.dp
                ) {
                    // Aquí iría el icono de escudo, por ahora usamos el recurso generado
                    Image(
                        painter = painterResource(id = R.drawable.img_floating_icons),
                        contentDescription = "Protección",
                        modifier = Modifier.padding(12.dp),
                        contentScale = ContentScale.Inside
                    )
                }

                // Icono Flotante: Ojo (Abajo Izquierda)
                Surface(
                    modifier = Modifier
                        .size(60.dp)
                        .align(Alignment.BottomStart)
                        .offset(x = 10.dp, y = (-10).dp),
                    shape = RoundedCornerShape(18.dp),
                    color = Color(0xFFFFB300), // Amarillo/Naranja
                    shadowElevation = 4.dp
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.img_floating_icons),
                        contentDescription = "Supervisión",
                        modifier = Modifier.padding(12.dp),
                        contentScale = ContentScale.Inside
                    )
                }
            }

            Spacer(modifier = Modifier.height(40.dp))

            // Textos
            Text(
                text = "Supervisa\nremotamente a tu\nhijo",
                style = MaterialTheme.typography.displaySmall.copy(
                    fontWeight = FontWeight.Black,
                    lineHeight = 44.sp,
                    color = Color(0xFF3E2723)
                ),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Crea un entorno digital seguro y equilibrado para tu familia desde cualquier lugar.",
                style = MaterialTheme.typography.bodyLarge.copy(
                    color = secondaryTextColor,
                    textAlign = TextAlign.Center,
                    lineHeight = 24.sp
                ),
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Spacer(modifier = Modifier.height(60.dp))

            // Botón Registrarse
            Button(
                onClick = onRegisterClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp),
                colors = ButtonDefaults.buttonColors(containerColor = primaryColor),
                shape = RoundedCornerShape(32.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "Registrarse",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(Icons.Default.ArrowForward, contentDescription = null)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Botón Google (Rediseñado)
            Button(
                onClick = onGoogleSignInClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp),
                shape = RoundedCornerShape(32.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = Color.DarkGray
                ),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.ic_google),
                        contentDescription = null,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Text(
                        text = "Continuar con Google",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF3C4043) // Color de texto oficial de Google
                        )
                    )
                }
            }
        }
    }
}
