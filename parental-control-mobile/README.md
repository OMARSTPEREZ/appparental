# 🛡️ Kibbo - Control Parental y Seguridad Familiar 360°

Aplicación móvil integral de control parental, bienestar digital y supervisión en tiempo real construida con **React Native**, **Expo (SDK 52)**, **TypeScript** y backend en tiempo real con **Supabase (PostgreSQL + Realtime WebSockets)**.

---

## 🌟 Características Principales

### 👨‍👧 Modo Padre (Parent Panel)
* **📡 Monitoreo en Vivo Satelital:** Visualización de ubicación GPS en tiempo real con geocodificación inversa (dirección física), telemetría de batería y estado de conectividad.
* **🔒 Bloqueo Remoto Instantáneo ("Pausa Familiar"):** Envío de comandos instantáneos a través de canales WebSocket de Supabase Realtime para pausar o reactivar el dispositivo del menor.
* **📍 Zonas Seguras (Geofencing):** Creación de perímetros de seguridad (Casa, Colegio, Parque) con radio configurable en metros y alertas automáticas al entrar o salir de la zona.
* **⏰ Automatización de Horarios:**
  * **Modo Estudio:** Restricción de aplicaciones durante horas de clase.
  * **Modo Sueño (Bedtime):** Bloqueo automático durante la noche para promover el descanso.
* **📊 Reportes de Bienestar Digital:** Métricas de tiempo en pantalla diario y semanal, gráficos de uso por categorías (Redes Sociales, Juegos, Educación, Videos) y recomendaciones inteligentes.
* **🛡️ Seguridad y Modo Sigiloso:**
  * Activación remota de modo sigiloso (ocultar icono de la aplicación en el dispositivo del menor).
  * Código PIN de 4 dígitos para autorizar desinstalaciones o desvinculaciones.
* **🚨 Central de Alertas SOS:** Notificaciones de pánico con coordenadas de emergencia y nivel crítico de batería (transmisión automática al 3% de batería).

### 👦 Modo Hijo (Child App)
* **⏱️ Tablero de Tiempo en Pantalla:** Visualización clara del tiempo restante y límites diarios establecidos por los padres.
* **🆘 Botón SOS de Emergencia:** Disparo de auxilio con envío inmediato de coordenadas GPS a todos los padres vinculados.
* **🔒 Bloqueo Anti-Desinstalación:** Validación obligatoria del PIN de seguridad del padre; tras 3 intentos erróneos se bloquea la acción y se emite una alerta prioritaria en tiempo real.
* **📲 Emparejamiento Seguro por QR:** Vinculación criptográfica en segundos utilizando la cámara del dispositivo.

---

## 🏗️ Arquitectura del Proyecto

```text
parental-control-mobile/
├── assets/                         # Logotipo, iconos adaptativos y gráficos
├── src/
│   ├── navigation/                 # Navegación y stacks por rol
│   │   ├── AppNavigator.tsx        # Selector de rol y enrutador principal
│   │   ├── ParentNavigator.tsx     # Rutas del perfil de Padres
│   │   └── ChildNavigator.tsx      # Rutas del perfil del Hijo
│   ├── screens/
│   │   ├── RoleSelectionScreen.tsx # Bienvenida y selección de perfil
│   │   ├── parent/                 # Vistas del Padre
│   │   │   ├── ParentDashboardScreen.tsx   # Métricas, telemetría y lista de dispositivos
│   │   │   ├── ParentMonitorScreen.tsx     # Monitoreo GPS, cámara remota y sirena
│   │   │   ├── ParentRulesScreen.tsx       # Cuadrícula 2x2: Apps, Horarios, Geocercas, PIN
│   │   │   ├── ParentLinkQRScreen.tsx      # Generador de código QR de emparejamiento
│   │   │   ├── NotificationHistoryScreen.tsx # Registro histórico de alertas y eventos
│   │   │   └── WebFilterSettingsScreen.tsx   # Filtro web de contenido inapropiado
│   │   └── child/                  # Vistas del Menor
│   │       ├── ChildDashboardScreen.tsx    # Dashboard infantil, contador y botón SOS
│   │       ├── ChildQRScannerScreen.tsx    # Escáner de vinculación de cámara
│   │       └── ChildMonitoringStatusScreen.tsx # Diagnóstico de servicios y anti-desinstalación
│   ├── services/                   # Lógica de negocio e integraciones
│   │   ├── supabase.ts             # Cliente y conexión a Supabase
│   │   ├── realtimeService.ts      # Canales WebSockets para comandos en vivo (LOCK, SOS, etc.)
│   │   ├── locationService.ts      # GPS y cálculo de distancias de geocercas
│   │   ├── cameraService.ts        # Captura remota y gestión de cámara
│   │   ├── notificationService.ts  # Notificaciones locales y remotas
│   │   └── storageService.ts       # Almacenamiento local persistente (AsyncStorage)
│   ├── theme/
│   │   └── theme.ts                # Sistema de diseño, paleta Slate/Navy/Cyan y tipografía
│   └── types/
│       └── index.ts                # Contratos TypeScript de datos, comandos y navegación
├── app.json                        # Configuración de Expo (permisos, orientación, iconos)
├── supabase_schema.sql             # Script SQL de base de datos, RLS y Realtime
└── package.json                    # Dependencias del proyecto
```

---

## 📱 ¿Cómo Tener e Instalar la Aplicación en tu Celular?

Hay **dos formas** de tener y probar la aplicación en tu teléfono:

### Opción 1: Probar Inmediatamente con Expo Go (Recomendada y más rápida)

No necesitas compilar nada, toma menos de 2 minutos:

1. **Instala Expo Go en tu celular:**
   * **Android:** Descárgalo gratis desde [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent).
   * **iPhone:** Descárgalo gratis desde [Apple App Store](https://apps.apple.com/app/expo-go/id982107779).

2. **Abre la terminal en la carpeta del proyecto:**
   ```bash
   cd parental-control-mobile
   npx expo start
   ```

3. **Escanea el código QR:**
   * **En Android:** Abre la app **Expo Go** y toca *"Scan QR Code"*, luego enfoca el código que aparece en la terminal o navegador.
   * **En iPhone:** Abre la app **Cámara** nativa de iOS y apunta al código QR; toca la notificación emergente de Expo.

> 💡 **Nota sobre redes:** Tu celular y tu computadora deben estar conectados a la misma red Wi-Fi. Si estás en redes distintas o datos móviles, usa el modo tunnel ejecutando:
> ```bash
> npx expo start --tunnel
> ```

---

### Opción 2: Instalar el Archivo APK Nativo en tu Celular Android

Si deseas instalar la aplicación como una app nativa permanente (archivo `.apk` sin requerir Expo Go):

1. **Instala la herramienta EAS CLI globalmente:**
   ```bash
   npm install -g eas-cli
   ```

2. **Inicia sesión en tu cuenta de Expo (gratuita):**
   ```bash
   eas login
   ```

3. **Genera el APK instalable:**
   ```bash
   eas build -p android --profile preview
   ```

4. **Instalación:**
   * Al finalizar el proceso en la nube, Expo te proporcionará un enlace de descarga y un código QR.
   * Abre el enlace en el navegador de tu celular, descarga el archivo `kibbo.apk` y selecciona **Instalar**.

---

## 🗄️ Configuración de la Base de Datos (Supabase)

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Ve al **SQL Editor** en el panel de control de Supabase.
3. Copia y pega el contenido íntegro del archivo [`supabase_schema.sql`](./supabase_schema.sql) y presiona **Run**.
   * Crea las tablas: `parents`, `children`, `devices`, `locations`, `app_rules`, `notifications_log`, `commands`, `geofences`.
   * Habilita **Supabase Realtime** para comunicación bidireccional instantánea.
   * Configura las políticas de seguridad (RLS).
4. Configura las variables de entorno en el archivo `.env` o en la configuración de la app:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
   ```

---

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Verificar tipos sin errores
npm run check-types  # o npx tsc --noEmit

# Iniciar servidor web y móvil
npm start
```
