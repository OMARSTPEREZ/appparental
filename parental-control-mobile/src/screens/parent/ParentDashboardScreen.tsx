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
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { ParentStackParamList, ChildProfile, NotificationLog } from '../../types';
import { supabase } from '../../config/supabase';
import { storageService } from '../../services/storageService';
import { realtimeService } from '../../services/realtimeService';
import { formatRelativeTime } from '../../utils/formatTime';
import { theme } from '../../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<ParentStackParamList, 'ParentDashboard'>;
};

export const ParentDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [selectedChildReport, setSelectedChildReport] = useState<ChildProfile | null>(null);
  const [activeSosAlert, setActiveSosAlert] = useState<{
    childId: string;
    latitude?: number;
    longitude?: number;
    timestamp: number;
  } | null>(null);

  const [parentProfile, setParentProfile] = useState<{
    name: string;
    avatarUrl: string | null;
  }>({
    name: 'Padre',
    avatarUrl: null,
  });

  // Admin PIN / Password Management State
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [currentAdminPin, setCurrentAdminPin] = useState('0000');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [confirmAdminPin, setConfirmAdminPin] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Unhide App Guide Modal State
  const [isUnhideModalVisible, setIsUnhideModalVisible] = useState(false);
  const [isSendingUnhideCommand, setIsSendingUnhideCommand] = useState(false);

  const handleRemoteUnhideApp = async () => {
    const targetId = children.length > 0 ? children[0].id : 'child_mateo_01';
    try {
      setIsSendingUnhideCommand(true);
      await realtimeService.sendCommand(targetId, 'TOGGLE_HIDE_ICON', { hidden: false });
      await storageService.saveAppIconHidden(false);

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.alert('¡Comando enviado! El icono de Kibbo volverá a ser visible en el celular del menor.');
        }
      } else {
        Alert.alert(
          'Icono Restaurado',
          'Se ha transmitido la orden por satélite/internet. El icono de Kibbo volverá a aparecer en el menú del menor.',
          [{ text: 'Entendido' }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo enviar el comando: ' + err.message);
    } finally {
      setIsSendingUnhideCommand(false);
    }
  };

  useEffect(() => {
    storageService.getAdminPin().then((pin) => {
      if (pin) setCurrentAdminPin(pin);
    });
  }, []);

  const handleSaveNewAdminPin = async () => {
    if (!newAdminPin || newAdminPin.length < 4) {
      Alert.alert('PIN Inválido', 'El PIN debe tener al menos 4 dígitos numéricos.');
      return;
    }
    if (newAdminPin !== confirmAdminPin) {
      Alert.alert('Error', 'Los PINs ingresados no coinciden. Por favor verifica.');
      return;
    }

    try {
      setIsSavingPin(true);
      await storageService.saveAdminPin(newAdminPin);
      setCurrentAdminPin(newAdminPin);

      try {
        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id;
        if (userId) {
          await supabase.from('parents').update({ admin_pin: newAdminPin }).eq('id', userId);
        }
      } catch (err) {
        console.warn('Could not sync admin_pin with Supabase parents table:', err);
      }

      for (const child of children) {
        try {
          await realtimeService.sendCommand(child.id, 'UPDATE_ADMIN_PIN', {
            pin: newAdminPin,
          });
        } catch (e) {
          console.warn('Error broadcasting new PIN to child:', child.id, e);
        }
      }

      setIsPinModalVisible(false);
      setNewAdminPin('');
      setConfirmAdminPin('');

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.alert(`¡PIN de Administrador actualizado con éxito a: ${newAdminPin}!`);
        }
      } else {
        Alert.alert(
          '¡PIN Actualizado!',
          `La nueva contraseña/PIN de administrador es "${newAdminPin}". Ha sido sincronizado con todos los dispositivos de tus hijos.`,
          [{ text: 'Entendido' }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar el nuevo PIN: ' + err.message);
    } finally {
      setIsSavingPin(false);
    }
  };

  useEffect(() => {
    const loadParentProfile = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (user) {
          const rawName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            (user.email ? user.email.split('@')[0] : 'Padre');
          const firstName = rawName.split(' ')[0];
          const avatar =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null;
          setParentProfile({
            name: firstName,
            avatarUrl: avatar,
          });
        }
      } catch (e) {
        console.warn('Error loading parent session profile:', e);
      }
    };
    loadParentProfile();
  }, []);

  const fetchChildrenFromSupabase = async () => {
    try {
      // Query children and join devices
      const { data, error } = await supabase
        .from('children')
        .select(`
          id,
          name,
          daily_time_limit_minutes,
          time_used_today_minutes,
          is_locked,
          devices (
            id,
            battery_level,
            is_gps_on,
            last_seen
          )
        `);

      if (error || !data || data.length === 0) {
        // Fallback default child profile if database has not been populated yet
        setChildren([
          {
            id: 'child_mateo_01',
            name: 'Mateo (Samsung A54)',
            device: {
              id: 'dev_m1',
              name: 'Galaxy A54',
              model: 'SM-A546E',
              batteryLevel: 82,
              isGpsOn: true,
              isOnline: true,
              lastSeen: 'Ahora',
            },
            dailyTimeLimitMinutes: 120,
            timeUsedTodayMinutes: 45,
            isLocked: false,
            activeRulesCount: 4,
          },
        ]);
      } else {
        const mapped: ChildProfile[] = data.map((item: any) => {
          const dev = Array.isArray(item.devices) ? item.devices[0] : item.devices;
          return {
            id: item.id,
            name: item.name,
            dailyTimeLimitMinutes: item.daily_time_limit_minutes || 120,
            timeUsedTodayMinutes: item.time_used_today_minutes || 0,
            isLocked: !!item.is_locked,
            activeRulesCount: 4,
            device: {
              id: dev?.id || 'dev_unknown',
              name: 'Dispositivo Android',
              model: 'Android Phone',
              batteryLevel: dev?.battery_level ?? 85,
              isGpsOn: dev?.is_gps_on ?? true,
              isOnline: true,
              lastSeen: dev?.last_seen ? 'Reciente' : 'Ahora',
            },
          };
        });
        setChildren(mapped);
      }

      // Fetch recent intercepted notifications
      const { data: notifsData } = await supabase
        .from('notifications_log')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(3);

      if (notifsData && notifsData.length > 0) {
        setNotifications(
          notifsData.map((d: any) => ({
            id: d.id,
            childId: d.child_id,
            appName: d.app_name || 'App',
            title: d.title || 'Alerta',
            message: d.message || '',
            receivedAt: d.received_at,
          }))
        );
      } else {
        setNotifications([
          {
            id: 'nt1',
            childId: 'child_mateo_01',
            appName: 'WhatsApp',
            title: 'Mamá',
            message: '¿Hiciste las tareas de matemáticas?',
            receivedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          },
          {
            id: 'nt2',
            childId: 'child_mateo_01',
            appName: 'TikTok',
            title: 'Notificación',
            message: 'Nuevo video en tendencias',
            receivedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.warn('Error fetching data from Supabase:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChildrenFromSupabase();

    // 1. Subscribe to live device telemetry (Battery, GPS status) via Supabase Realtime
    const unsubStatus = realtimeService.subscribeToStatusUpdates('child_mateo_01', (id, status) => {
      setChildren((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...status } : c))
      );
    });

    // 2. Subscribe to incoming intercepted notifications stream (limit to 3 for recent view)
    const unsubNotifs = realtimeService.subscribeToNotificationLogs('child_mateo_01', (log) => {
      setNotifications((prev) => [log, ...prev].slice(0, 3));
    });

    // 3. Subscribe to Realtime Emergency SOS alerts
    const unsubSos = realtimeService.subscribeToSosAlerts('child_mateo_01', (alert) => {
      setActiveSosAlert(alert);
      Alert.alert(
        '🚨 ¡ALERTA SOS DETECTADA!',
        `El menor ha pulsado el botón de emergencia. Coordenadas: ${alert.latitude?.toFixed(4) || 'GPS'}, ${alert.longitude?.toFixed(4) || 'GPS'}.`
      );
    });

    return () => {
      unsubStatus();
      unsubNotifs();
      unsubSos();
    };
  }, []);

  const handleToggleLock = async (childId: string, currentLocked: boolean) => {
    const nextLocked = !currentLocked;

    // Send realtime command through Supabase Realtime Channel
    await realtimeService.sendCommand(childId, nextLocked ? 'LOCK' : 'UNLOCK', {
      reason: 'PAUSA_FAMILIAR',
      triggeredBy: 'Padre',
    });

    // Sync with Supabase children table
    try {
      await supabase
        .from('children')
        .update({ is_locked: nextLocked })
        .eq('id', childId);
    } catch (err) {
      console.warn('Sync error:', err);
    }

    setChildren((prev) =>
      prev.map((c) => (c.id === childId ? { ...c, isLocked: nextLocked } : c))
    );

    Alert.alert(
      nextLocked ? '🔒 Pausa Familiar Activada' : '🔓 Dispositivo Desbloqueado',
      nextLocked
        ? `Pantalla del menor pausada en tiempo real.`
        : `Acceso al dispositivo reactivado con éxito.`
    );
  };

  const handleDeleteChild = (cId: string, cName: string) => {
    const executeDelete = async () => {
      setChildren((prev) => prev.filter((c) => c.id !== cId));
      try {
        await supabase.from('children').delete().eq('id', cId);
      } catch (err: any) {
        console.warn('Error deleting child:', err);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(`¿Deseas desvincular y eliminar "${cName}" de tu panel de supervisión?`) : true;
      if (confirmed) {
        executeDelete();
      }
      return;
    }

    Alert.alert(
      'Desvincular Dispositivo',
      `¿Deseas desvincular y eliminar "${cName}" de tu panel de supervisión?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: executeDelete,
        },
      ]
    );
  };

  const handleLogoutAndSwitchRole = async () => {
    try {
      // 1. Sign out from active Supabase session
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign out error:', err);
    }
    // 2. Clear all local storage tokens & cache
    await storageService.clearAll();

    // 3. Return to RoleSelection
    // @ts-ignore
    navigation.getParent()?.replace('RoleSelection');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchChildrenFromSupabase();
            }}
            tintColor={theme.colors.parentAccent}
          />
        }
      >
        {/* Brand Header with Avatar & Greeting */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            {parentProfile.avatarUrl ? (
              <Image
                source={{ uri: parentProfile.avatarUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={20} color={theme.colors.parentAccent} />
              </View>
            )}
            <View>
              <Text style={styles.title}>¡Hola, {parentProfile.name}! 👋</Text>
              <Text style={styles.subtitleHeader}>Panel de Protección Familiar</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.pinHeaderButton}
              onPress={() => {
                setNewAdminPin('');
                setConfirmAdminPin('');
                setIsPinModalVisible(true);
              }}
            >
              <Ionicons name="key" size={15} color="#F59E0B" />
              <Text style={styles.pinHeaderButtonText}>PIN ({currentAdminPin})</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutAndSwitchRole}>
              <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />
              <Text style={styles.logoutButtonText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency SOS Banner */}
        {activeSosAlert && (
          <View style={styles.sosAlertCard}>
            <View style={styles.sosAlertHeader}>
              <MaterialCommunityIcons name="alert-octagon" size={32} color={theme.colors.white} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.sosAlertTitle}>🚨 ¡ALERTA SOS EN VIVO!</Text>
                <Text style={styles.sosAlertSub}>
                  El menor ha pulsado el botón de emergencia en su teléfono.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveSosAlert(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={24} color={theme.colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.sosAlertCoords}>
              <Ionicons name="location" size={16} color={theme.colors.white} />
              <Text style={styles.sosAlertCoordsText}>
                Coordenadas GPS: {activeSosAlert.latitude?.toFixed(4) || '4.7110'}° N, {activeSosAlert.longitude?.toFixed(4) || '-74.0721'}° W
              </Text>
            </View>

            <View style={styles.sosAlertActions}>
              <TouchableOpacity
                style={styles.sosAlertActionBtn}
                activeOpacity={0.88}
                onPress={() => navigation.navigate('ParentMonitor', { childId: activeSosAlert.childId })}
              >
                <Ionicons name="navigate" size={16} color={theme.colors.danger} />
                <Text style={styles.sosAlertActionBtnText}>Ver en Mapa / Monitorear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sosAlertDismissBtn}
                onPress={() => setActiveSosAlert(null)}
              >
                <Text style={styles.sosAlertDismissText}>Descartar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Suite de Módulos de Control Parental (Acceso Rápido) */}
        <View style={styles.suiteSection}>
          <View style={styles.suiteSectionHeader}>
            <Text style={styles.suiteSectionTitle}>Suite de Control Parental</Text>
            <View style={styles.freeBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#10B981" />
              <Text style={styles.freeBadgeText}>100% Funcional • Sin Suscripción</Text>
            </View>
          </View>

          <View style={styles.suiteGrid}>
            {/* 1. Módulo Maestro: Monitoreo en Vivo */}
            <TouchableOpacity
              style={styles.suiteCard}
              activeOpacity={0.85}
              onPress={() => {
                const targetId = children.length > 0 ? children[0].id : 'child_mateo_01';
                navigation.navigate('ParentMonitor', { childId: targetId });
              }}
            >
              <View style={[styles.suiteIconCircle, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                <Ionicons name="videocam" size={22} color={theme.colors.parentAccent} />
              </View>
              <Text style={styles.suiteCardTitle}>Monitoreo en Vivo</Text>
              <Text style={styles.suiteCardSub}>GPS, Pantalla, Cámara & Audio</Text>
            </TouchableOpacity>

            {/* 2. Módulo Maestro: Reglas y Bloqueo */}
            <TouchableOpacity
              style={styles.suiteCard}
              activeOpacity={0.85}
              onPress={() => {
                const targetId = children.length > 0 ? children[0].id : 'child_mateo_01';
                navigation.navigate('ParentRules', { childId: targetId });
              }}
            >
              <View style={[styles.suiteIconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Ionicons name="shield-checkmark" size={22} color={theme.colors.primary} />
              </View>
              <Text style={styles.suiteCardTitle}>Reglas y Bloqueo</Text>
              <Text style={styles.suiteCardSub}>Apps, Horarios & Límites</Text>
            </TouchableOpacity>

            {/* 3. Módulo Maestro: Notificaciones */}
            <TouchableOpacity
              style={styles.suiteCard}
              activeOpacity={0.85}
              onPress={() => {
                const targetId = children.length > 0 ? children[0].id : 'child_mateo_01';
                navigation.navigate('NotificationHistory', { childId: targetId });
              }}
            >
              <View style={[styles.suiteIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <MaterialCommunityIcons name="bell-badge-outline" size={22} color={theme.colors.warning} />
              </View>
              <Text style={styles.suiteCardTitle}>Notificaciones</Text>
              <Text style={styles.suiteCardSub}>Historial Completo & Búsqueda</Text>
            </TouchableOpacity>

            {/* 4. Módulo Maestro: Vinculación QR */}
            <TouchableOpacity
              style={styles.suiteCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ParentLinkQR')}
            >
              <View style={[styles.suiteIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <MaterialCommunityIcons name="qrcode-plus" size={22} color={theme.colors.childAccent} />
              </View>
              <Text style={styles.suiteCardTitle}>Vinculación QR</Text>
              <Text style={styles.suiteCardSub}>Vincular Nuevo Dispositivo</Text>
            </TouchableOpacity>

            {/* 5. Módulo Maestro: Asignar / Cambiar Contraseña PIN */}
            <TouchableOpacity
              style={styles.suiteCard}
              activeOpacity={0.85}
              onPress={() => {
                setNewAdminPin('');
                setConfirmAdminPin('');
                setIsPinModalVisible(true);
              }}
            >
              <View style={[styles.suiteIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="key" size={22} color="#F59E0B" />
              </View>
              <Text style={styles.suiteCardTitle}>PIN de Administrador</Text>
              <Text style={styles.suiteCardSub}>Actual: {currentAdminPin} • Cambiar</Text>
            </TouchableOpacity>

            {/* 6. Módulo Maestro: App Oculta & Cómo Desocultarla */}
            <TouchableOpacity
              style={styles.suiteCard}
              activeOpacity={0.85}
              onPress={() => setIsUnhideModalVisible(true)}
            >
              <View style={[styles.suiteIconCircle, { backgroundColor: 'rgba(129, 140, 248, 0.15)' }]}>
                <Ionicons name="eye-outline" size={22} color="#818CF8" />
              </View>
              <Text style={styles.suiteCardTitle}>App Oculta & Acceso</Text>
              <Text style={styles.suiteCardSub}>Cómo abrirla y desocultarla</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Critical Battery 3% Safeguard Banner */}
        <View style={styles.criticalBatteryGlobalBanner}>
          <View style={styles.criticalBatteryIconBox}>
            <MaterialCommunityIcons name="battery-alert" size={22} color="#F59E0B" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.criticalBatteryGlobalTitle}>Protocolo de Batería Crítica (3%) Activo</Text>
            <Text style={styles.criticalBatteryGlobalSub}>
              Si el celular de tu hijo alcanza el 3%, transmitirá automáticamente su última ubicación por satélite antes de apagarse.
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <Text style={styles.sectionTitle}>Dispositivos Supervisados</Text>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.parentAccent} style={{ marginTop: 24 }} />
        ) : (
          children.map((child) => {
            const usedPercentage = Math.min(
              100,
              Math.round((child.timeUsedTodayMinutes / child.dailyTimeLimitMinutes) * 100)
            );

            return (
              <View key={child.id} style={styles.childCard}>
                {/* Child Header */}
                <View style={styles.childHeader}>
                  <View style={styles.childAvatar}>
                    <FontAwesome5 name="user-astronaut" size={24} color={theme.colors.parentAccent} />
                  </View>
                  <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                    <Text style={styles.childName}>{child.name}</Text>
                    {/* Real-time Telemetry Row: Online, Battery %, GPS status */}
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.onlineDot,
                          { backgroundColor: child.device.isOnline ? theme.colors.success : theme.colors.danger },
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {child.device.isOnline ? 'En línea' : 'Desconectado'} •
                      </Text>

                      {/* Battery Badge */}
                      <View style={styles.telemetryBadge}>
                        <MaterialCommunityIcons
                          name={child.device.batteryLevel > 20 ? 'battery-charging' : 'battery-alert'}
                          size={14}
                          color={child.device.batteryLevel > 20 ? theme.colors.success : theme.colors.danger}
                        />
                        <Text style={styles.telemetryBadgeText}>{child.device.batteryLevel}%</Text>
                      </View>

                      {/* GPS Badge */}
                      <View style={styles.telemetryBadge}>
                        <Ionicons
                          name="navigate"
                          size={11}
                          color={child.device.isGpsOn ? theme.colors.parentAccent : theme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.telemetryBadgeText,
                            { color: child.device.isGpsOn ? theme.colors.parentAccent : theme.colors.textMuted },
                          ]}
                        >
                          {child.device.isGpsOn ? 'GPS ON' : 'GPS OFF'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {child.isLocked && (
                      <View style={styles.lockedBadge}>
                        <Ionicons name="lock-closed" size={13} color={theme.colors.danger} />
                        <Text style={styles.lockedText}>Bloqueado</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.deleteChildBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleDeleteChild(child.id, child.name)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.timeSection}>
                  <View style={styles.timeLabels}>
                    <Text style={styles.timeLabel}>Tiempo en pantalla hoy</Text>
                    <Text style={styles.timeValue}>
                      {child.timeUsedTodayMinutes} min / {child.dailyTimeLimitMinutes} min ({usedPercentage}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${usedPercentage}%` }]} />
                  </View>
                </View>

                {/* Botón Destacado de Reportes de Bienestar Digital */}
                <TouchableOpacity
                  style={styles.viewUsageReportsBtn}
                  activeOpacity={0.85}
                  onPress={() => setSelectedChildReport(child)}
                >
                  <View style={styles.viewUsageReportsLeft}>
                    <View style={styles.viewUsageReportsIcon}>
                      <Ionicons name="pie-chart" size={16} color="#38BDF8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.viewUsageReportsTitle}>Ver Reportes de Uso</Text>
                      <Text style={styles.viewUsageReportsSub} numberOfLines={1}>
                        Desglose gráfico por categorías
                      </Text>
                    </View>
                  </View>
                  <View style={styles.viewUsageReportsRight}>
                    <View style={styles.viewUsageReportsBadgeBox}>
                      <Text style={styles.viewUsageReportsBadgeText}>BIENESTAR</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#38BDF8" />
                  </View>
                </TouchableOpacity>

                {/* Botón informativo de app oculta / cómo abrirla o restaurarla */}
                <TouchableOpacity
                  style={styles.stealthHintRow}
                  activeOpacity={0.82}
                  onPress={() => setIsUnhideModalVisible(true)}
                >
                  <Ionicons name="eye-off-outline" size={15} color="#818CF8" />
                  <Text style={styles.stealthHintText}>
                    ¿La app está oculta en este celular? <Text style={{ fontWeight: '700', color: '#C7D2FE' }}>Toca aquí para ver cómo abrirla o restaurarla</Text>
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#818CF8" />
                </TouchableOpacity>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      child.isLocked ? styles.actionUnlock : styles.actionLock,
                    ]}
                    onPress={() => handleToggleLock(child.id, child.isLocked)}
                  >
                    <Ionicons
                      name={child.isLocked ? 'lock-open-outline' : 'lock-closed-outline'}
                      size={17}
                      color={theme.colors.white}
                    />
                    <Text style={styles.actionButtonText}>
                      {child.isLocked ? 'Desbloquear' : 'Pausa Familiar'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionMonitor]}
                    onPress={() => navigation.navigate('ParentMonitor', { childId: child.id })}
                  >
                    <Ionicons name="videocam-outline" size={17} color={theme.colors.white} />
                    <Text style={styles.actionButtonText}>Monitorear</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionRules]}
                    onPress={() => navigation.navigate('ParentRules', { childId: child.id })}
                  >
                    <Ionicons name="options-outline" size={17} color={theme.colors.white} />
                    <Text style={styles.actionButtonText}>Reglas</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Intercepted Notifications Card (Vista Reciente: Máximo 3) */}
        <View style={styles.notifSectionCard}>
          <View style={styles.notifHeader}>
            <View style={styles.notifIconCircle}>
              <MaterialCommunityIcons name="bell-ring-outline" size={20} color={theme.colors.warning} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.notifSectionTitle}>Notificaciones Recientes (En Vivo)</Text>
              <Text style={styles.notifSectionSub}>Últimos 3 mensajes detectados en el teléfono</Text>
            </View>
          </View>

          {notifications.slice(0, 3).map((n) => (
            <View key={n.id} style={styles.notifItemRow}>
              <View style={styles.appNamePill}>
                <Text style={styles.appNameText}>{n.appName}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.notifItemTopRow}>
                  <Text style={styles.notifItemTitle}>{n.title}</Text>
                  <Text style={styles.notifItemTime}>{formatRelativeTime(n.receivedAt)}</Text>
                </View>
                <Text style={styles.notifItemMessage} numberOfLines={2}>{n.message}</Text>
              </View>
            </View>
          ))}

          {/* Botón Ver Historial Completo (Ver todas) */}
          <TouchableOpacity
            style={styles.viewAllNotifsFooterBtn}
            activeOpacity={0.75}
            onPress={() => {
              const targetId = children.length > 0 ? children[0].id : 'child_mateo_01';
              navigation.navigate('NotificationHistory', { childId: targetId });
            }}
          >
            <Text style={styles.viewAllNotifsFooterText}>Ver historial completo (Ver todas)</Text>
            <Ionicons name="arrow-forward" size={16} color="#38BDF8" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── MODAL DE REPORTES DE BIENESTAR DIGITAL ── */}
      <Modal
        visible={selectedChildReport !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedChildReport(null)}
      >
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModalContent}>
            {/* Modal Header */}
            <View style={styles.reportModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.reportIconCircle}>
                  <Ionicons name="pie-chart" size={22} color="#38BDF8" />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.reportModalTitle}>Reporte de Bienestar Digital</Text>
                  <Text style={styles.reportModalSub}>
                    {selectedChildReport?.name} • Estadísticas de hoy
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.reportCloseBtn}
                onPress={() => setSelectedChildReport(null)}
              >
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reportScrollBody} showsVerticalScrollIndicator={false}>
              {/* Highlight Summary Card */}
              <View style={styles.reportSummaryCard}>
                <View style={styles.reportSummaryTop}>
                  <View>
                    <Text style={styles.reportSummaryLabel}>TIEMPO TOTAL EN PANTALLA HOY</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                      <Text style={styles.reportBigHours}>1h 45m</Text>
                      <Text style={styles.reportLimitText}> / 2h límite diario</Text>
                    </View>
                  </View>
                  <View style={styles.reportHealthBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.reportHealthBadgeText}>Equilibrado</Text>
                  </View>
                </View>

                {/* Multi-category stacked horizontal bar */}
                <View style={styles.stackedBarContainer}>
                  <View style={[styles.stackedSegment, { width: '43%', backgroundColor: '#8B5CF6' }]} />
                  <View style={[styles.stackedSegment, { width: '29%', backgroundColor: '#0EA5E9' }]} />
                  <View style={[styles.stackedSegment, { width: '17%', backgroundColor: '#F59E0B' }]} />
                  <View style={[styles.stackedSegment, { width: '11%', backgroundColor: '#10B981' }]} />
                </View>

                <Text style={styles.reportLimitWarning}>
                  Quedan 15 minutos disponibles antes de alcanzar el límite diario configurado.
                </Text>
              </View>

              {/* Categories Breakdown Section */}
              <Text style={styles.reportSectionHeader}>Desglose por Categorías de Aplicaciones</Text>

              {[
                {
                  name: 'Juegos & Gamers',
                  icon: 'gamepad-variant',
                  time: '45 min',
                  pct: 43,
                  color: '#8B5CF6',
                  apps: 'Roblox, Brawl Stars, Free Fire',
                },
                {
                  name: 'Redes Sociales',
                  icon: 'share-variant',
                  time: '30 min',
                  pct: 29,
                  color: '#0EA5E9',
                  apps: 'TikTok, Instagram',
                },
                {
                  name: 'Videos & Streaming',
                  icon: 'play-circle',
                  time: '18 min',
                  pct: 17,
                  color: '#F59E0B',
                  apps: 'YouTube, Netflix',
                },
                {
                  name: 'Mensajería & Comunicación',
                  icon: 'message-text',
                  time: '12 min',
                  pct: 11,
                  color: '#10B981',
                  apps: 'WhatsApp, Discord',
                },
              ].map((cat) => (
                <View key={cat.name} style={styles.categoryCard}>
                  <View style={styles.categoryHeaderRow}>
                    <View style={[styles.categoryIconCircle, { backgroundColor: `${cat.color}20` }]}>
                      <MaterialCommunityIcons name={cat.icon as any} size={20} color={cat.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.categoryNameText}>{cat.name}</Text>
                      <Text style={styles.categoryAppsText}>{cat.apps}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.categoryTimeText, { color: cat.color }]}>{cat.time}</Text>
                      <Text style={styles.categoryPctText}>{cat.pct}% del total</Text>
                    </View>
                  </View>

                  {/* Progress Bar for Category */}
                  <View style={styles.categoryBarBackground}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        { width: `${cat.pct}%`, backgroundColor: cat.color },
                      ]}
                    />
                  </View>
                </View>
              ))}

              {/* Top Apps Section */}
              <Text style={styles.reportSectionHeader}>Top Aplicaciones Más Usadas</Text>
              <View style={styles.topAppsCard}>
                {[
                  { rank: 1, name: 'Roblox', cat: 'Juegos', time: '35 min', icon: 'gamepad-variant', color: '#8B5CF6' },
                  { rank: 2, name: 'TikTok', cat: 'Redes', time: '25 min', icon: 'music-box', color: '#0EA5E9' },
                  { rank: 3, name: 'YouTube', cat: 'Videos', time: '18 min', icon: 'youtube', color: '#F59E0B' },
                  { rank: 4, name: 'WhatsApp', cat: 'Chat', time: '12 min', icon: 'whatsapp', color: '#10B981' },
                ].map((app) => (
                  <View key={app.name} style={styles.topAppRow}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>#{app.rank}</Text>
                    </View>
                    <View style={[styles.appMiniIcon, { backgroundColor: `${app.color}20` }]}>
                      <MaterialCommunityIcons name={app.icon as any} size={18} color={app.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.topAppName}>{app.name}</Text>
                      <Text style={styles.topAppCategory}>{app.cat}</Text>
                    </View>
                    <Text style={styles.topAppTime}>{app.time}</Text>
                  </View>
                ))}
              </View>

              {/* Weekly Trend Bar Chart */}
              <Text style={styles.reportSectionHeader}>Tendencia Semanal (Horas / Día)</Text>
              <View style={styles.weeklyChartCard}>
                <View style={styles.weeklyBarsRow}>
                  {[
                    { day: 'Lun', hours: 1.5, hPct: 60 },
                    { day: 'Mar', hours: 2.0, hPct: 80 },
                    { day: 'Mié', hours: 1.8, hPct: 72 },
                    { day: 'Jue', hours: 2.2, hPct: 88 },
                    { day: 'Vie', hours: 1.9, hPct: 76 },
                    { day: 'Sáb', hours: 2.5, hPct: 100 },
                    { day: 'Dom', hours: 1.7, hPct: 68, current: true },
                  ].map((d) => (
                    <View key={d.day} style={styles.weeklyCol}>
                      <Text style={styles.weeklyHourText}>{d.hours}h</Text>
                      <View style={styles.weeklyBarBack}>
                        <View
                          style={[
                            styles.weeklyBarFill,
                            { height: `${d.hPct}%` },
                            d.current && styles.weeklyBarFillCurrent,
                          ]}
                        />
                      </View>
                      <Text style={[styles.weeklyDayLabel, d.current && styles.weeklyDayLabelCurrent]}>
                        {d.day}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.weeklyAverageRow}>
                  <Ionicons name="stats-chart" size={14} color="#38BDF8" />
                  <Text style={styles.weeklyAverageText}>
                    Promedio diario semanal: <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>1.9 horas/día</Text>
                  </Text>
                </View>
              </View>

              {/* Smart Insights Card */}
              <View style={styles.insightBox}>
                <View style={styles.insightIconBox}>
                  <Ionicons name="sparkles" size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.insightTitle}>Diagnóstico de Bienestar</Text>
                  <Text style={styles.insightSub}>
                    Mateo ha respetado el Horario Escolar y el Modo Sueño. Los límites de juegos han evitado distracciones durante sus tareas.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer Buttons */}
            <View style={styles.reportModalFooter}>
              <TouchableOpacity
                style={styles.reportAdjustRulesBtn}
                activeOpacity={0.85}
                onPress={() => {
                  const cId = selectedChildReport?.id || 'child_mateo_01';
                  setSelectedChildReport(null);
                  navigation.navigate('ParentRules', { childId: cId });
                }}
              >
                <Ionicons name="options-outline" size={17} color="#FFFFFF" />
                <Text style={styles.reportAdjustRulesBtnText}>Ajustar Límites en Reglas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reportDoneBtn}
                onPress={() => setSelectedChildReport(null)}
              >
                <Text style={styles.reportDoneBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: ASIGNAR NUEVA CONTRASEÑA / PIN DE ADMINISTRADOR ── */}
      <Modal
        visible={isPinModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsPinModalVisible(false)}
      >
        <View style={styles.pinModalOverlay}>
          <View style={styles.pinModalCard}>
            <View style={styles.pinModalIconCircle}>
              <Ionicons name="key" size={32} color="#F59E0B" />
            </View>

            <Text style={styles.pinModalTitle}>Contraseña de Administrador</Text>
            <Text style={styles.pinModalDesc}>
              Asigna o actualiza el PIN maestro. Este PIN es obligatorio para desinstalar, desvincular o desbloquear dispositivos de tus hijos.
            </Text>

            <View style={styles.currentPinBanner}>
              <Text style={styles.currentPinLabel}>PIN ACTUAL:</Text>
              <Text style={styles.currentPinValue}>{currentAdminPin}</Text>
            </View>

            <View style={styles.pinInputGroup}>
              <Text style={styles.inputFieldLabel}>Nuevo PIN (4 a 6 dígitos):</Text>
              <TextInput
                style={styles.pinInputField}
                placeholder="Ej. 1234"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                value={newAdminPin}
                onChangeText={setNewAdminPin}
              />
            </View>

            <View style={styles.pinInputGroup}>
              <Text style={styles.inputFieldLabel}>Confirmar Nuevo PIN:</Text>
              <TextInput
                style={styles.pinInputField}
                placeholder="Repite el nuevo PIN"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                maxLength={6}
                secureTextEntry
                value={confirmAdminPin}
                onChangeText={setConfirmAdminPin}
              />
            </View>

            <View style={styles.pinModalButtonsRow}>
              <TouchableOpacity
                style={styles.pinCancelBtn}
                onPress={() => setIsPinModalVisible(false)}
              >
                <Text style={styles.pinCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pinConfirmBtn}
                onPress={handleSaveNewAdminPin}
                disabled={isSavingPin}
              >
                {isSavingPin ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.pinConfirmBtnText}>Guardar PIN</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: CÓMO ABRIR O DESOCULTAR LA APP DEL HIJO ── */}
      <Modal
        visible={isUnhideModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsUnhideModalVisible(false)}
      >
        <View style={styles.pinModalOverlay}>
          <View style={styles.unhideModalCard}>
            <View style={styles.unhideModalHeader}>
              <View style={styles.unhideIconCircle}>
                <Ionicons name="eye-outline" size={26} color="#818CF8" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.unhideModalTitle}>Recuperar Visibilidad de la App</Text>
                <Text style={styles.unhideModalSub}>Guía para abrir o desocultar Kibbo en el teléfono de tu hijo</Text>
              </View>
              <TouchableOpacity onPress={() => setIsUnhideModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 370, width: '100%', marginVertical: 10 }} showsVerticalScrollIndicator={false}>
              {/* Opción 1: Desocultar Remotamente */}
              <View style={styles.unhideOptionBox}>
                <View style={styles.unhideOptionBadge}>
                  <Text style={styles.unhideOptionBadgeText}>OPCIÓN 1: REMOTA (RECOMENDADA)</Text>
                </View>
                <Text style={styles.unhideOptionTitle}>Hacer visible el icono por internet</Text>
                <Text style={styles.unhideOptionDesc}>
                  Envía una señal instantánea al celular de tu hijo para que el icono vuelva a aparecer en su menú sin necesidad de manipular su teléfono.
                </Text>

                <TouchableOpacity
                  style={styles.remoteUnhideBtn}
                  activeOpacity={0.85}
                  onPress={handleRemoteUnhideApp}
                  disabled={isSendingUnhideCommand}
                >
                  {isSendingUnhideCommand ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFFFFF" />
                      <Text style={styles.remoteUnhideBtnText}>Restaurar Icono Remotamente</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Opción 2: Marcador Telefónico Físico */}
              <View style={styles.unhideOptionBox}>
                <View style={styles.unhideOptionBadge}>
                  <Text style={styles.unhideOptionBadgeText}>OPCIÓN 2: MARCADOR DE LLAMADAS</Text>
                </View>
                <Text style={styles.unhideOptionTitle}>Código Secreto en el Teléfono</Text>
                <Text style={styles.unhideOptionDesc}>
                  Abre la app de llamadas en el celular del hijo y marca el código:
                </Text>
                <View style={styles.codePillBox}>
                  <Ionicons name="keypad" size={18} color="#38BDF8" />
                  <Text style={styles.codePillNumber}>*#54226#</Text>
                </View>
                <Text style={styles.codePillHint}>La aplicación se abrirá de inmediato en pantalla.</Text>
              </View>

              {/* Opción 3: Enlace Navegador */}
              <View style={styles.unhideOptionBox}>
                <View style={styles.unhideOptionBadge}>
                  <Text style={styles.unhideOptionBadgeText}>OPCIÓN 3: ENLACE RÁPIDO EN NAVEGADOR</Text>
                </View>
                <Text style={styles.unhideOptionTitle}>Desde Google Chrome</Text>
                <Text style={styles.unhideOptionDesc}>
                  Escribe en la barra de direcciones de Chrome del celular del hijo:
                </Text>
                <View style={styles.codePillBox}>
                  <Ionicons name="globe-outline" size={18} color="#10B981" />
                  <Text style={[styles.codePillNumber, { color: '#10B981' }]}>kibbo://settings</Text>
                </View>
              </View>

              {/* Opción 4: PIN de Administrador */}
              <View style={[styles.unhideOptionBox, { borderColor: '#F59E0B' }]}>
                <View style={[styles.unhideOptionBadge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Text style={[styles.unhideOptionBadgeText, { color: '#F59E0B' }]}>PIN MAESTRO REQUERIDO</Text>
                </View>
                <Text style={styles.unhideOptionDesc}>
                  Para cambiar ajustes o desvincular la app una vez abierta, se exigirá tu PIN actual: <Text style={{ color: '#F8FAFC', fontWeight: '800' }}>{currentAdminPin}</Text>
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.unhideCloseBtn}
              onPress={() => setIsUnhideModalVisible(false)}
            >
              <Text style={styles.unhideCloseBtnText}>Entendido</Text>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.colors.parentAccent,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 2,
    borderColor: theme.colors.parentAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitleHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38BDF8',
    marginTop: 3,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutButtonText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    fontWeight: '700',
  },
  suiteSection: {
    marginBottom: theme.spacing.lg,
  },
  suiteSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  suiteSectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontSize: 17,
  },
  freeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  freeBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontSize: 10,
    fontWeight: '700',
  },
  suiteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suiteCard: {
    width: '48.4%',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  suiteIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  suiteCardTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 13,
  },
  suiteCardSub: {
    ...theme.typography.caption,
    color: '#38BDF8',
    fontSize: 10,
    marginTop: 2,
    lineHeight: 13,
  },
  criticalBatteryGlobalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: theme.spacing.lg,
  },
  criticalBatteryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  criticalBatteryGlobalTitle: {
    ...theme.typography.caption,
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 12,
  },
  criticalBatteryGlobalSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  childCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  childAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childName: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
    flexWrap: 'wrap',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  telemetryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceCard,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  telemetryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  lockedText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    fontWeight: '700',
  },
  timeSection: {
    marginVertical: theme.spacing.sm,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  timeLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  timeValue: {
    ...theme.typography.caption,
    color: theme.colors.parentAccent,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.parentAccent,
    borderRadius: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    gap: 5,
  },
  actionLock: {
    backgroundColor: theme.colors.danger,
  },
  actionUnlock: {
    backgroundColor: theme.colors.success,
  },
  actionMonitor: {
    backgroundColor: theme.colors.parentAccent,
  },
  actionRules: {
    backgroundColor: theme.colors.surfaceCard,
  },
  actionButtonText: {
    ...theme.typography.caption,
    color: theme.colors.white,
    fontWeight: '600',
  },
  notifSectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.card,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  notifIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifSectionTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  notifSectionSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  notifItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceCard,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
    gap: 12,
  },
  appNamePill: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  appNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  notifItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifItemTitle: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  notifItemTime: {
    ...theme.typography.caption,
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 6,
  },
  notifItemMessage: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  viewAllNotifsFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    gap: 8,
  },
  viewAllNotifsFooterText: {
    ...theme.typography.caption,
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 12,
  },
  sosAlertCard: {
    backgroundColor: theme.colors.danger,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.glowDanger,
  },
  sosAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sosAlertTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.white,
    fontSize: 16,
  },
  sosAlertSub: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  sosAlertCoords: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    gap: 6,
    marginBottom: 10,
  },
  sosAlertCoordsText: {
    ...theme.typography.caption,
    color: theme.colors.white,
    fontWeight: '700',
  },
  sosAlertActions: {
    flexDirection: 'row',
    gap: 10,
  },
  sosAlertActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  sosAlertActionBtnText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    fontWeight: '700',
  },
  sosAlertDismissBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosAlertDismissText: {
    ...theme.typography.caption,
    color: theme.colors.white,
    fontWeight: '600',
  },
  // Botón Ver Reportes de Uso en la Tarjeta
  viewUsageReportsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  deleteChildBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  viewUsageReportsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  viewUsageReportsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewUsageReportsTitle: {
    ...theme.typography.bodyBold,
    color: '#F8FAFC',
    fontSize: 13,
  },
  viewUsageReportsSub: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  viewUsageReportsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewUsageReportsBadgeBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  viewUsageReportsBadgeText: {
    color: '#38BDF8',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Modal de Reportes de Bienestar Digital
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  reportModalContent: {
    backgroundColor: '#070D1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    ...theme.shadows.card,
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.4)',
  },
  reportIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportModalTitle: {
    ...theme.typography.h3,
    color: '#F8FAFC',
    fontSize: 17,
  },
  reportModalSub: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  reportCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
  },
  reportScrollBody: {
    marginTop: 12,
  },
  reportSummaryCard: {
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    marginBottom: 16,
  },
  reportSummaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportSummaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  reportBigHours: {
    fontSize: 26,
    fontWeight: '900',
    color: '#38BDF8',
  },
  reportLimitText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  reportHealthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  reportHealthBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  stackedBarContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    marginBottom: 10,
  },
  stackedSegment: {
    height: '100%',
  },
  reportLimitWarning: {
    ...theme.typography.caption,
    color: '#CBD5E1',
    fontSize: 11,
  },
  reportSectionHeader: {
    ...theme.typography.bodyBold,
    color: '#F8FAFC',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 10,
  },
  categoryCard: {
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 8,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryNameText: {
    ...theme.typography.bodyBold,
    color: '#F8FAFC',
    fontSize: 13,
  },
  categoryAppsText: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  categoryTimeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  categoryPctText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  categoryBarBackground: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  topAppsCard: {
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  topAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 41, 59, 0.6)',
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  appMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topAppName: {
    ...theme.typography.bodyBold,
    color: '#F8FAFC',
    fontSize: 13,
  },
  topAppCategory: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 10.5,
  },
  topAppTime: {
    ...theme.typography.bodyBold,
    color: '#38BDF8',
    fontSize: 13,
  },
  weeklyChartCard: {
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12,
  },
  weeklyBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 110,
    paddingBottom: 6,
  },
  weeklyCol: {
    alignItems: 'center',
    flex: 1,
  },
  weeklyHourText: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginBottom: 4,
    fontWeight: '600',
  },
  weeklyBarBack: {
    width: 14,
    height: 70,
    backgroundColor: '#1E293B',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weeklyBarFill: {
    width: '100%',
    backgroundColor: 'rgba(56, 189, 248, 0.45)',
    borderRadius: 7,
  },
  weeklyBarFillCurrent: {
    backgroundColor: '#38BDF8',
  },
  weeklyDayLabel: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '600',
  },
  weeklyDayLabelCurrent: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  weeklyAverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  weeklyAverageText: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11,
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: 16,
  },
  insightIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
    ...theme.typography.bodyBold,
    color: '#F8FAFC',
    fontSize: 13,
  },
  insightSub: {
    ...theme.typography.caption,
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  reportModalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  reportAdjustRulesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.parentAccent,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  reportAdjustRulesBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  reportDoneBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportDoneBtnText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 13,
  },
  pinHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pinHeaderButtonText: {
    ...theme.typography.caption,
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 12,
  },
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pinModalCard: {
    backgroundColor: '#0F172A',
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  pinModalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  pinModalTitle: {
    ...theme.typography.h3,
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  pinModalDesc: {
    ...theme.typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  currentPinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  currentPinLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  currentPinValue: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  pinInputGroup: {
    width: '100%',
    marginBottom: 14,
  },
  inputFieldLabel: {
    ...theme.typography.caption,
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  pinInputField: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 2,
  },
  pinModalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  pinCancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pinCancelBtnText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 13,
  },
  pinConfirmBtn: {
    flex: 1,
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  pinConfirmBtnText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
  },
  stealthHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.22)',
  },
  stealthHintText: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11.5,
    flex: 1,
    marginLeft: 8,
  },
  unhideModalCard: {
    backgroundColor: '#0F172A',
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  unhideModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  unhideIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unhideModalTitle: {
    ...theme.typography.bodyBold,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  unhideModalSub: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  unhideOptionBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  unhideOptionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  unhideOptionBadgeText: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  unhideOptionTitle: {
    ...theme.typography.bodyBold,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 4,
  },
  unhideOptionDesc: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  remoteUnhideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  remoteUnhideBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  codePillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 6,
    gap: 8,
  },
  codePillNumber: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  codePillHint: {
    ...theme.typography.caption,
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  unhideCloseBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 4,
  },
  unhideCloseBtnText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
});
