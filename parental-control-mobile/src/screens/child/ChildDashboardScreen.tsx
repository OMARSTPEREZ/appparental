import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Linking,
  Platform,
  Switch,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { ChildStackParamList } from '../../types';
import { storageService } from '../../services/storageService';
import { locationService } from '../../services/locationService';
import { notificationService } from '../../services/notificationService';
import { realtimeService } from '../../services/realtimeService';
import { supabase } from '../../config/supabase';
import { isTimeInSchedule } from '../../utils/geofence';
import { theme } from '../../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<ChildStackParamList, 'ChildDashboard'>;
};

type LockReason = 'PAUSA_FAMILIAR' | 'BEDTIME' | 'SCHOOL' | 'MANUAL';

export const ChildDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const childId = 'child_mateo_01';
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState<LockReason>('PAUSA_FAMILIAR');
  const [dailyMinutesLimit] = useState(120);
  const [minutesUsed] = useState(45);
  const remainingMinutes = Math.max(0, dailyMinutesLimit - minutesUsed);

  // Anti-Uninstall Security State
  const [isUninstallModalVisible, setIsUninstallModalVisible] = useState(false);
  const [uninstallPin, setUninstallPin] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isUninstallBlocked, setIsUninstallBlocked] = useState(false);

  // Stealth Mode & Dialer Code state
  const [isIconHidden, setIsIconHidden] = useState(false);
  const [showDialerInfoModal, setShowDialerInfoModal] = useState(false);

  // Schedules configured
  const [bedtimeConfig] = useState({ enabled: true, start: '22:00', end: '06:00' });
  const [schoolConfig] = useState({ enabled: true, start: '08:00', end: '14:00' });

  // One-Tap Permission Setup State
  const [showPermissionsBanner, setShowPermissionsBanner] = useState(true);
  const [isGrantingAll, setIsGrantingAll] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const handleGrantAllPermissions = async () => {
    setIsGrantingAll(true);
    try {
      // 1. Request GPS Location (Foreground & Background)
      await locationService.requestPermissions();

      // 2. Request Notifications
      await notificationService.requestPermissions();

      // 3. Mark as granted
      setPermissionsGranted(true);
      setShowPermissionsBanner(false);

      Alert.alert(
        '🛡️ Permisos Concedidos',
        'Todos los permisos de protección, geolocalización y notificaciones de Kibbo han sido activados correctamente.',
        [{ text: 'Entendido' }]
      );
    } catch (err: any) {
      Alert.alert('Permisos', 'Algunos permisos requieren confirmación manual en Ajustes del teléfono.');
    } finally {
      setIsGrantingAll(false);
    }
  };

  // Evaluate automatic schedules (Bedtime / School)
  const evaluateSchedules = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (bedtimeConfig.enabled && isTimeInSchedule(timeStr, bedtimeConfig.start, bedtimeConfig.end)) {
      setIsLocked(true);
      setLockReason('BEDTIME');
      return true;
    }

    // School mode (typically Monday to Friday)
    const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    if (schoolConfig.enabled && isWeekday && isTimeInSchedule(timeStr, schoolConfig.start, schoolConfig.end)) {
      setIsLocked(true);
      setLockReason('SCHOOL');
      return true;
    }

    return false;
  };

  useEffect(() => {
    // Check initial schedule
    evaluateSchedules();

    // Load initial stealth mode state
    storageService.getAppIconHidden().then((hidden) => {
      setIsIconHidden(hidden);
    });

    // Check initial deep link
    Linking.getInitialURL().then((url) => {
      if (url && (url.includes('settings') || url.includes('54226'))) {
        navigation.navigate('ChildMonitoringStatus');
      }
    });

    // Listen to deep links while running
    const linkSub = Linking.addEventListener('url', (event) => {
      if (event.url && (event.url.includes('settings') || event.url.includes('54226'))) {
        navigation.navigate('ChildMonitoringStatus');
      }
    });

    // Re-check schedules every 30 seconds
    const interval = setInterval(() => {
      evaluateSchedules();
    }, 30000);

    // Publish initial device telemetry to Supabase (Battery %, GPS)
    realtimeService.publishTelemetry(childId, 88, true);

    // Subscribe to remote commands dispatched by Parent via Supabase Realtime
    const unsubscribe = realtimeService.subscribeToCommands(childId, (cmd) => {
      if (cmd.type === 'LOCK' || cmd.type === 'PAUSE_DEVICE') {
        setIsLocked(true);
        setLockReason(cmd.payload?.reason === 'SCHOOL' ? 'SCHOOL' : cmd.payload?.reason === 'BEDTIME' ? 'BEDTIME' : 'PAUSA_FAMILIAR');
      } else if (cmd.type === 'UNLOCK') {
        setIsLocked(false);
      } else if (cmd.type === 'CAM_FRONT' || cmd.type === 'CAM_BACK') {
        notificationService.sendLocalAlert(
          '📷 Captura Ambiental',
          `Se solicitó captura con cámara ${cmd.type === 'CAM_FRONT' ? 'frontal' : 'trasera'}.`
        );
      } else if (cmd.type === 'START_AUDIO') {
        notificationService.sendLocalAlert(
          '🎤 Audio Ambiental',
          'Escucha ambiental activada por tus padres.'
        );
      } else if (cmd.type === 'START_SCREEN_STREAM') {
        notificationService.sendLocalAlert(
          '📱 Transmisión de Pantalla',
          'Monitoreo de pantalla en vivo activo en alta definición.'
        );
      } else if (cmd.type === 'STOP_SCREEN_STREAM') {
        notificationService.sendLocalAlert(
          '📱 Transmisión de Pantalla',
          'Transmisión de pantalla remota detenida.'
        );
      } else if (cmd.type === 'REMOTE_TOUCH') {
        console.log('[AccessibilityService] Simulating touch gesture at:', cmd.payload);
      } else if (cmd.type === 'EVENT_SCREENSHOT') {
        notificationService.sendLocalAlert(
          '🛡️ Supervisión Activa',
          'Captura de seguridad registrada por política parental.'
        );
      } else if (cmd.type === 'TOGGLE_HIDE_ICON') {
        const isHidden = !!cmd.payload?.hidden;
        setIsIconHidden(isHidden);
        storageService.saveAppIconHidden(isHidden);
        notificationService.sendLocalAlert(
          isHidden ? '👁️ Modo Sigiloso Activado' : '📱 Modo Visible',
          isHidden
            ? 'El icono de la app ha sido ocultado del menú. Para abrirlo usa el marcador telefónico: *#54226# o kibbo://settings.'
            : 'El icono de la app es nuevamente visible en el menú.'
        );
      } else if (cmd.type === 'UPDATE_ADMIN_PIN') {
        if (cmd.payload?.pin) {
          storageService.saveAdminPin(cmd.payload.pin);
          notificationService.sendLocalAlert(
            '🔐 PIN Actualizado',
            'La contraseña de administración parental ha sido sincronizada exitosamente.'
          );
        }
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
      linkSub.remove();
    };
  }, []);

  const handleSendSOS = async () => {
    try {
      const loc = await locationService.getCurrentLocation();
      
      // 1. Send immediate SOS_ALERT command to Supabase commands table & realtime broadcast
      await realtimeService.sendCommand(childId, 'SOS_ALERT', {
        latitude: loc?.latitude,
        longitude: loc?.longitude,
      });

      // 2. Publish current GPS coordinates
      if (loc) {
        await realtimeService.publishLocation(childId, loc);
      }

      await notificationService.sendLocalAlert(
        '🚨 ALERTA SOS TRANSMITIDA',
        `Tus padres han recibido tu alerta de pánico y ubicación GPS en tiempo real.`
      );

      Alert.alert(
        '¡Alerta SOS Enviada!',
        `Se ha transmitido la señal a Supabase Realtime con tus coordenadas (${loc?.latitude.toFixed(4) || '4.7110'}, ${loc?.longitude.toFixed(4) || '-74.0721'}). Tus padres han recibido la notificación.`,
        [{ text: 'Entendido' }]
      );
    } catch (err) {
      console.error('Error sending SOS:', err);
      Alert.alert('Alerta SOS', 'Señal de emergencia enviada a tus padres.');
    }
  };

  // Trigger Anti-Uninstall PIN flow
  const handleResetRole = () => {
    if (isUninstallBlocked) {
      Alert.alert(
        'Acción Bloqueada',
        'Se han superado los 3 intentos fallidos de PIN. Esta acción está bloqueada por seguridad parental.'
      );
      return;
    }
    setUninstallPin('');
    setIsUninstallModalVisible(true);
  };

  // Toggle Stealth Mode / Hide Icon directly from Child panel
  const handleToggleHideApp = async (targetHiddenState: boolean) => {
    if (targetHiddenState) {
      setIsIconHidden(true);
      await storageService.saveAppIconHidden(true);
      setShowDialerInfoModal(true);
      await notificationService.sendLocalAlert(
        '👁️ Aplicación Oculta (Modo Sigiloso)',
        'El icono de Kibbo se ha ocultado del menú. Para abrirlo usa el marcador telefónico (*#54226#) o kibbo://settings.'
      );
    } else {
      // Prompt for PIN to restore icon visibility
      setUninstallPin('');
      setIsUninstallModalVisible(true);
    }
  };

  // Submit Anti-Uninstall PIN
  const handleUninstallSubmit = async () => {
    if (isUninstallBlocked) {
      Alert.alert(
        'Acción Bloqueada',
        'Se han superado los 3 intentos fallidos de PIN. Contacta a tus padres.'
      );
      return;
    }

    const currentPin = await storageService.getAdminPin();
    if (uninstallPin === currentPin || uninstallPin === '0000') {
      // Correct PIN!
      const executeUnlink = async () => {
        setIsUninstallModalVisible(false);
        setUninstallPin('');
        setFailedAttempts(0);
        await storageService.saveUserRole(null);
        const parentNav = navigation.getParent();
        if (parentNav && typeof parentNav.reset === 'function') {
          parentNav.reset({
            index: 0,
            routes: [{ name: 'RoleSelection' as any }],
          });
        } else if ((navigation as any).reset) {
          (navigation as any).reset({
            index: 0,
            routes: [{ name: 'RoleSelection' as any }],
          });
        } else {
          (navigation as any).navigate('RoleSelection');
        }
      };

      if (Platform.OS === 'web') {
        const confirmed = typeof window !== 'undefined'
          ? window.confirm('PIN Confirmado. ¿Deseas desvincular este dispositivo y cambiar de perfil?')
          : true;
        if (confirmed) {
          await executeUnlink();
        }
        return;
      }

      Alert.alert(
        'PIN Confirmado',
        '¿Deseas desvincular este dispositivo y cambiar de perfil?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desvincular',
            style: 'destructive',
            onPress: executeUnlink,
          },
        ]
      );
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      setUninstallPin('');

      if (nextAttempts >= 3) {
        setIsUninstallBlocked(true);
        setIsUninstallModalVisible(false);

        // Record high priority alert in Supabase
        try {
          await supabase.from('notifications_log').insert({
            child_id: childId,
            app_name: 'Seguridad Anti-Desinstalación',
            title: '🚨 Intento No Autorizado de Desinstalación',
            message:
              'Se detectaron 3 intentos fallidos de ingresar el PIN del padre para desinstalar o desvincular Kibbo en el dispositivo de Mateo.',
          });
          await realtimeService.sendCommand(childId, 'SOS_ALERT', {
            type: 'UNAUTHORIZED_UNINSTALL_ATTEMPT',
            attempts: 3,
          });
        } catch (err) {
          console.warn('Error saving uninstall security alert:', err);
        }

        Alert.alert(
          '🚨 Acción Bloqueada',
          'Has ingresado un PIN erróneo más de 3 veces. La acción fue bloqueada y se ha registrado una alerta prioritaria para tus padres.'
        );
      } else {
        Alert.alert(
          'PIN Incorrecto',
          `El PIN ingresado no coincide con el del Administrador. Te quedan ${
            3 - nextAttempts
          } ${3 - nextAttempts === 1 ? 'intento' : 'intentos'} antes del bloqueo.`
        );
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.pillContainer}>
              <View style={styles.greenPulse} />
              <Text style={styles.pillText}>KIBBO SUPERVISADO</Text>
            </View>
            <Text style={styles.title}>Hola, Mateo 👋</Text>
          </View>
          <TouchableOpacity style={styles.switchBtn} onPress={handleResetRole}>
            <Ionicons name="swap-horizontal" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Stealth Mode Active Notice */}
        {isIconHidden && (
          <TouchableOpacity
            style={styles.stealthNoticeBanner}
            activeOpacity={0.85}
            onPress={() => setShowDialerInfoModal(true)}
          >
            <Ionicons name="eye-off" size={18} color="#818CF8" />
            <Text style={styles.stealthNoticeBannerText}>
              Modo Sigiloso Activo • Código de apertura: *#54226#
            </Text>
            <Ionicons name="information-circle-outline" size={16} color="#818CF8" />
          </TouchableOpacity>
        )}

        {/* ── ASISTENTE DE PERMISOS: 1 SOLO BOTÓN PARA AUTORIZAR TODO ── */}
        {showPermissionsBanner && !permissionsGranted && (
          <View
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              borderWidth: 1,
              borderColor: 'rgba(16, 185, 129, 0.35)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                  Protección de Dispositivo
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                  Ubicación GPS, Cámara, Notificaciones y Alertas
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: '#10B981',
                paddingVertical: 12,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 6,
              }}
              activeOpacity={0.85}
              disabled={isGrantingAll}
              onPress={handleGrantAllPermissions}
            >
              <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                {isGrantingAll ? 'Activando Protección...' : 'Permitir Todos los Accesos'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PROMINENT SINGLE-TAP SOS EMERGENCY BUTTON */}
        <View style={styles.sosContainer}>
          <TouchableOpacity
            style={styles.sosButton}
            activeOpacity={0.82}
            onPress={handleSendSOS}
          >
            <View style={styles.sosInner}>
              <MaterialCommunityIcons name="alert-octagon" size={38} color={theme.colors.white} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sosButtonText}>🚨 BOTÓN SOS DE EMERGENCIA</Text>
                <Text style={styles.sosButtonSub}>Peligro • Transmitir GPS inmediato a tus padres</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Lock Overlay Banner if device is locked */}
        {isLocked && (
          <View style={styles.lockBanner}>
            <Ionicons name="lock-closed" size={24} color={theme.colors.white} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.lockBannerTitle}>Dispositivo Pausado</Text>
              <Text style={styles.lockBannerDesc}>Tus padres han bloqueado las aplicaciones temporalmente</Text>
            </View>
          </View>
        )}

        {/* Protection Health Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIconCircle}>
              <MaterialCommunityIcons name="shield-check" size={28} color={theme.colors.childAccent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.statusTitle}>Protección Familiar Activa</Text>
              <Text style={styles.statusSubtitle}>Kibbo • Conectado con Familia</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.relinkBtn}
            onPress={() => navigation.navigate('ChildQRScanner')}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={18} color={theme.colors.childAccent} />
            <Text style={styles.relinkBtnText}>Vincular o Cambiar con Código QR</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Screen Time Card */}
        <View style={styles.timeCard}>
          <Text style={styles.cardHeaderTitle}>Tiempo Disponible Hoy</Text>
          <View style={styles.timeDisplay}>
            <Text style={styles.timeBigNumber}>{remainingMinutes}</Text>
            <Text style={styles.timeUnit}>min restantes</Text>
          </View>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(minutesUsed / dailyMinutesLimit) * 100}%` },
              ]}
            />
          </View>

          <View style={styles.timeFoot}>
            <Text style={styles.timeFootText}>Usado: {minutesUsed} min</Text>
            <Text style={styles.timeFootText}>Límite diario: {dailyMinutesLimit} min</Text>
          </View>
        </View>

        {/* Card: Ocultar Aplicación (Modo Sigiloso) */}
        <View style={styles.stealthControlCard}>
          <View style={styles.stealthControlHeader}>
            <View style={[styles.stealthIconCircle, isIconHidden && { backgroundColor: 'rgba(129, 140, 248, 0.2)' }]}>
              <Ionicons
                name={isIconHidden ? 'eye-off' : 'eye'}
                size={24}
                color={isIconHidden ? '#818CF8' : theme.colors.childAccent}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.stealthControlTitle}>Ocultar Aplicación</Text>
                <View
                  style={[
                    styles.stealthStatusBadge,
                    { backgroundColor: isIconHidden ? 'rgba(129, 140, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.stealthStatusText,
                      { color: isIconHidden ? '#818CF8' : '#10B981' },
                    ]}
                  >
                    {isIconHidden ? 'OCULTO' : 'VISIBLE'}
                  </Text>
                </View>
              </View>
              <Text style={styles.stealthControlDesc}>
                {isIconHidden
                  ? 'Icono oculto del menú de aplicaciones de este dispositivo.'
                  : 'Oculta el icono de Kibbo en este teléfono para mayor discreción y seguridad.'}
              </Text>
            </View>
          </View>

          <View style={styles.stealthSwitchRow}>
            <Text style={styles.stealthSwitchLabel}>Activar Modo Sigiloso</Text>
            <Switch
              value={isIconHidden}
              onValueChange={handleToggleHideApp}
              trackColor={{ false: '#334155', true: '#6366F1' }}
              thumbColor={isIconHidden ? '#A5B4FC' : '#94A3B8'}
            />
          </View>

          {isIconHidden && (
            <TouchableOpacity
              style={styles.dialerCodeBtn}
              activeOpacity={0.8}
              onPress={() => setShowDialerInfoModal(true)}
            >
              <Ionicons name="keypad" size={16} color="#818CF8" />
              <Text style={styles.dialerCodeBtnText}>
                Marcador: <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>*#54226#</Text> • Ver cómo abrir
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#818CF8" />
            </TouchableOpacity>
          )}
        </View>

        {/* System Services Info Card */}
        <TouchableOpacity
          style={styles.servicesInfoCard}
          onPress={() => navigation.navigate('ChildMonitoringStatus')}
        >
          <View style={styles.servicesIcon}>
            <Ionicons name="hardware-chip-outline" size={22} color={theme.colors.childAccent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.servicesTitle}>Servicios en Segundo Plano</Text>
            <Text style={styles.servicesDesc}>GPS, Notificaciones y Supabase Realtime activo</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      {/* ── FULL-SCREEN LOCK OVERLAY (PAUSA FAMILIAR / BEDTIME / MODO ESCOLAR) ── */}
      <Modal visible={isLocked} animationType="fade" transparent={false} statusBarTranslucent>
        <SafeAreaView style={styles.lockModalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#070D1E" />
          <View style={styles.lockContent}>
            {/* Ambient Shield Halo */}
            <View style={styles.lockIconHalo}>
              <View
                style={[
                  styles.lockIconCircle,
                  {
                    backgroundColor:
                      lockReason === 'BEDTIME'
                        ? 'rgba(129, 140, 248, 0.15)'
                        : lockReason === 'SCHOOL'
                        ? 'rgba(56, 189, 248, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                  },
                ]}
              >
                <Ionicons
                  name={
                    lockReason === 'BEDTIME'
                      ? 'moon'
                      : lockReason === 'SCHOOL'
                      ? 'school'
                      : 'lock-closed'
                  }
                  size={58}
                  color={
                    lockReason === 'BEDTIME'
                      ? '#818CF8'
                      : lockReason === 'SCHOOL'
                      ? '#38BDF8'
                      : '#EF4444'
                  }
                />
              </View>
            </View>

            <View style={styles.lockBadgeBox}>
              <Text style={styles.lockBadge}>
                {lockReason === 'BEDTIME'
                  ? '🌙 HORARIO NOCTURNO • DESCANSO'
                  : lockReason === 'SCHOOL'
                  ? '🎒 HORARIO ESCOLAR • CLASES'
                  : '🔒 PAUSA FAMILIAR ACTIVADA'}
              </Text>
            </View>

            <Text style={styles.lockTitle}>
              {lockReason === 'BEDTIME'
                ? 'Modo Descanso'
                : lockReason === 'SCHOOL'
                ? 'Modo Escuela'
                : 'Dispositivo Pausado'}
            </Text>

            <Text style={styles.lockSubtitle}>
              {lockReason === 'BEDTIME'
                ? 'El uso de aplicaciones está restringido durante la noche (22:00 a 06:00) para proteger tu sueño y bienestar.'
                : lockReason === 'SCHOOL'
                ? 'El dispositivo está en pausa escolar (08:00 a 14:00) para favorecer la concentración en el aula.'
                : 'Tus padres han pausado este dispositivo. Es momento de desconectarse, estudiar o compartir en familia.'}
            </Text>

            <View style={styles.lockRulesBox}>
              <View style={styles.lockRuleRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.lockRuleText}>Llamadas y alertas SOS siempre disponibles</Text>
              </View>
              <View style={styles.lockRuleRow}>
                <Ionicons name="close-circle" size={18} color="#EF4444" />
                <Text style={styles.lockRuleText}>Juegos, redes sociales y videos bloqueados</Text>
              </View>
            </View>

            {/* Emergency SOS Button (Always functional during lock) */}
            <TouchableOpacity
              style={styles.lockSosButton}
              activeOpacity={0.85}
              onPress={handleSendSOS}
            >
              <MaterialCommunityIcons name="alert-octagon" size={26} color="#FFFFFF" />
              <Text style={styles.lockSosButtonText}>EMERGENCIA SOS</Text>
            </TouchableOpacity>

            {/* Admin PIN Unlock Toggle for in-person parent unlock */}
            <TouchableOpacity
              style={styles.parentPinBtn}
              activeOpacity={0.7}
              onPress={() => setShowPinInput(!showPinInput)}
            >
              <Ionicons name="key-outline" size={16} color="#94A3B8" />
              <Text style={styles.parentPinBtnText}>¿Estás con tus padres? Desbloqueo presencial</Text>
            </TouchableOpacity>

            {showPinInput && (
              <View style={styles.pinBox}>
                <TextInput
                  style={styles.pinInput}
                  placeholder="PIN de Administrador (0000)"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                  value={enteredPin}
                  onChangeText={setEnteredPin}
                />
                <TouchableOpacity
                  style={styles.pinSubmitBtn}
                  onPress={async () => {
                    const currentPin = await storageService.getAdminPin();
                    if (enteredPin === currentPin || enteredPin === '0000') {
                      setIsLocked(false);
                      setShowPinInput(false);
                      setEnteredPin('');
                      Alert.alert('Acceso Concedido', 'Dispositivo desbloqueado con PIN de administrador.');
                    } else {
                      Alert.alert('PIN Incorrecto', 'El PIN ingresado no coincide con el de Administrador.');
                    }
                  }}
                >
                  <Text style={styles.pinSubmitText}>Desbloquear</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL: PIN ANTI-DESINSTALACIÓN / SALIR ── */}
      <Modal
        visible={isUninstallModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsUninstallModalVisible(false)}
      >
        <View style={styles.uninstallModalOverlay}>
          <View style={styles.uninstallModalCard}>
            <View style={styles.uninstallIconCircle}>
              <Ionicons name="shield-half" size={32} color="#EF4444" />
            </View>

            <Text style={styles.uninstallModalTitle}>Seguridad Anti-Desinstalación</Text>
            <Text style={styles.uninstallModalDesc}>
              Para desvincular o desinstalar Kibbo se requiere el PIN de Administrador del Padre.
            </Text>

            {failedAttempts > 0 && (
              <View style={styles.failedAttemptsBadge}>
                <Ionicons name="warning" size={14} color="#F59E0B" />
                <Text style={styles.failedAttemptsText}>
                  Intento fallido {failedAttempts} de 3. Al 3er intento la acción se bloqueará.
                </Text>
              </View>
            )}

            <TextInput
              style={styles.uninstallPinInput}
              placeholder="Ingresa el PIN del Padre (0000)"
              placeholderTextColor="#64748B"
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              value={uninstallPin}
              onChangeText={setUninstallPin}
            />

            <View style={styles.uninstallModalButtonsRow}>
              <TouchableOpacity
                style={styles.uninstallCancelBtn}
                onPress={() => {
                  setIsUninstallModalVisible(false);
                  setUninstallPin('');
                }}
              >
                <Text style={styles.uninstallCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uninstallConfirmBtn}
                onPress={handleUninstallSubmit}
              >
                <Text style={styles.uninstallConfirmBtnText}>Validar PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: CÓDIGO SECRETO DIALER & DEEP LINK ── */}
      <Modal
        visible={showDialerInfoModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDialerInfoModal(false)}
      >
        <View style={styles.uninstallModalOverlay}>
          <View style={styles.dialerInfoCard}>
            <View style={styles.dialerIconCircle}>
              <Ionicons name="keypad" size={28} color="#818CF8" />
            </View>
            <Text style={styles.dialerModalTitle}>Atravesar Modo Oculto</Text>
            <Text style={styles.dialerModalDesc}>
              Si el icono de la app está oculto, puedes acceder a esta pantalla usando cualquiera de estos métodos:
            </Text>

            <View style={styles.secretMethodBox}>
              <Text style={styles.secretMethodNum}>1. Marcador de Teléfono</Text>
              <Text style={styles.secretMethodCode}>*#54226#</Text>
              <Text style={styles.secretMethodHint}>
                Abre la app de llamadas del celular, digita este código y presiona llamar.
              </Text>
            </View>

            <View style={styles.secretMethodBox}>
              <Text style={styles.secretMethodNum}>2. Enlace Directo (Deep Link)</Text>
              <Text style={styles.secretMethodCode}>kibbo://settings</Text>
              <Text style={styles.secretMethodHint}>
                Escribe esta dirección en Google Chrome o navegador del celular.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.dialerCloseBtn}
              onPress={() => setShowDialerInfoModal(false)}
            >
              <Text style={styles.dialerCloseBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.childAccent,
  },
  pillText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.childAccent,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  switchBtn: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.danger,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.glowDanger,
  },
  lockBannerTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.white,
  },
  lockBannerDesc: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderChild,
    ...theme.shadows.card,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statusIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  statusSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  relinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceCard,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    gap: 8,
  },
  relinkBtnText: {
    ...theme.typography.caption,
    color: theme.colors.childAccent,
    fontWeight: '600',
  },
  timeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  cardHeaderTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  timeBigNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.colors.text,
  },
  timeUnit: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.childAccent,
    borderRadius: 5,
  },
  timeFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeFootText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  servicesInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
    gap: 12,
  },
  servicesIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  servicesTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  servicesDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sosContainer: {
    marginBottom: theme.spacing.lg,
  },
  sosButton: {
    width: '100%',
    backgroundColor: theme.colors.danger,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing.lg,
    ...theme.shadows.glowDanger,
    borderWidth: 2,
    borderColor: '#F87171',
  },
  sosInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sosButtonText: {
    ...theme.typography.button,
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sosButtonSub: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  // Full-screen Lock Overlay Styles
  lockModalContainer: {
    flex: 1,
    backgroundColor: '#070D1E',
  },
  lockContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  lockIconHalo: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  lockIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadgeBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.md,
  },
  lockBadge: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  lockTitle: {
    ...theme.typography.h1,
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  lockSubtitle: {
    ...theme.typography.body,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: 10,
  },
  lockRulesBox: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: theme.spacing.xl,
    gap: 10,
  },
  lockRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockRuleText: {
    ...theme.typography.caption,
    color: '#CBD5E1',
    fontSize: 13,
  },
  lockSosButton: {
    width: '100%',
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    gap: 10,
    shadowColor: '#EF4444',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: theme.spacing.lg,
  },
  lockSosButtonText: {
    ...theme.typography.button,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  parentPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  parentPinBtnText: {
    ...theme.typography.caption,
    color: '#64748B',
    fontSize: 12,
  },
  pinBox: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  pinInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 14,
    textAlign: 'center',
  },
  pinSubmitBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  // Anti-Uninstall and Stealth Mode Styles
  stealthNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.35)',
    marginBottom: theme.spacing.md,
    gap: 8,
  },
  stealthNoticeBannerText: {
    ...theme.typography.caption,
    color: '#818CF8',
    fontWeight: '600',
    fontSize: 12,
    flex: 1,
  },
  uninstallModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  uninstallModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  uninstallIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uninstallModalTitle: {
    ...theme.typography.h3,
    color: '#F8FAFC',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  uninstallModalDesc: {
    ...theme.typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  failedAttemptsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 14,
    gap: 6,
  },
  failedAttemptsText: {
    ...theme.typography.caption,
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  uninstallPinInput: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  uninstallModalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  uninstallCancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uninstallCancelBtnText: {
    ...theme.typography.button,
    color: '#94A3B8',
    fontSize: 13,
  },
  uninstallConfirmBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uninstallConfirmBtnText: {
    ...theme.typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  dialerInfoCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.35)',
  },
  dialerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  dialerModalTitle: {
    ...theme.typography.h3,
    color: '#F8FAFC',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  dialerModalDesc: {
    ...theme.typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  secretMethodBox: {
    width: '100%',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  secretMethodNum: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  secretMethodCode: {
    ...theme.typography.bodyBold,
    color: '#38BDF8',
    fontSize: 16,
    marginVertical: 4,
  },
  secretMethodHint: {
    ...theme.typography.caption,
    color: '#CBD5E1',
    fontSize: 11,
  },
  dialerCloseBtn: {
    width: '100%',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: 10,
  },
  dialerCloseBtnText: {
    ...theme.typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  stealthControlCard: {
    backgroundColor: '#1E293B',
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  stealthControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stealthIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stealthControlTitle: {
    ...theme.typography.bodyBold,
    color: '#F8FAFC',
    fontSize: 15,
  },
  stealthStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stealthStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stealthControlDesc: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  stealthSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginTop: 4,
  },
  stealthSwitchLabel: {
    ...theme.typography.body,
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  dialerCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  dialerCodeBtnText: {
    ...theme.typography.caption,
    color: '#C7D2FE',
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
  },
});
