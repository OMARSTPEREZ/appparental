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
  Linking,
  ActivityIndicator,
  Modal,
  TextInput,
  GestureResponderEvent,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { ParentStackParamList, LocationData, NotificationLog } from '../../types';
import { realtimeService } from '../../services/realtimeService';
import { supabase } from '../../config/supabase';
import { formatRelativeTime } from '../../utils/formatTime';
import {
  calculateDistanceMeters,
  formatDistance,
  GeofenceZoneData,
} from '../../utils/geofence';
import { theme } from '../../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<ParentStackParamList, 'ParentMonitor'>;
  route: RouteProp<ParentStackParamList, 'ParentMonitor'>;
};

type MonitorTab = 'LOCATION_STATUS' | 'MULTIMEDIA' | 'NOTIFICATIONS';

export const ParentMonitorScreen: React.FC<Props> = ({ navigation, route }) => {
  const { childId } = route.params;

  // Segmented Tabs state
  const [selectedTab, setSelectedTab] = useState<MonitorTab>('LOCATION_STATUS');

  // Dynamic child name & Rename modal state
  const [childName, setChildName] = useState<string>('Mateo');
  const [tempChildName, setTempChildName] = useState<string>('Mateo');
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  // Compact Telemetry states
  const [batteryLevel, setBatteryLevel] = useState<number>(82);
  const [networkType, setNetworkType] = useState<string>('Wi-Fi 5GHz');
  const [showProtocolInfo, setShowProtocolInfo] = useState<boolean>(false);

  const [activeCam, setActiveCam] = useState<'front' | 'back'>('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);

  // Real-time Screen Mirroring states
  const [isScreenStreaming, setIsScreenStreaming] = useState(false);
  const [isConnectingScreen, setIsConnectingScreen] = useState(false);
  const [showRouteHistory, setShowRouteHistory] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchFeedback, setTouchFeedback] = useState<{ x: number; y: number } | null>(null);

  // Device Lock / Pausa Familiar State
  const [isDeviceLocked, setIsDeviceLocked] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);

  // Geofencing Zones State
  const [zones, setZones] = useState<GeofenceZoneData[]>([
    {
      id: 'z1',
      name: 'Colegio Bilingüe San José',
      address: 'Cra 7 # 170-20, Bogotá',
      latitude: 4.7110,
      longitude: -74.0721,
      radiusMeters: 200,
      isAlertEnabled: true,
      type: 'school',
    },
    {
      id: 'z2',
      name: 'Hogar Familiar',
      address: 'Calle 127 # 15-30, Bogotá',
      latitude: 4.7125,
      longitude: -74.0735,
      radiusMeters: 150,
      isAlertEnabled: true,
      type: 'home',
    },
    {
      id: 'z3',
      name: 'Casa de los Abuelos',
      address: 'Calle 93 # 11-40, Bogotá',
      latitude: 4.6980,
      longitude: -74.0550,
      radiusMeters: 100,
      isAlertEnabled: true,
      type: 'family',
    },
  ]);

  // Modal to add new Safe Zone
  const [isAddZoneModalVisible, setIsAddZoneModalVisible] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneRadius, setNewZoneRadius] = useState(200);
  const [newZoneType, setNewZoneType] = useState<'home' | 'school' | 'family' | 'other'>('home');
  const [isSavingZone, setIsSavingZone] = useState(false);

  const [currentLocation, setCurrentLocation] = useState<LocationData>({
    latitude: 4.7110,
    longitude: -74.0721,
    accuracy: 4,
    timestamp: Date.now(),
    address: 'Colegio Bilingüe San José, Bogotá',
  });

  useEffect(() => {
    // 0. Fetch child info and device telemetry from Supabase
    const fetchChildAndTelemetry = async () => {
      try {
        const { data: cData } = await supabase
          .from('children')
          .select('name, is_locked')
          .eq('id', childId)
          .maybeSingle();

        if (cData) {
          if (cData.name) {
            setChildName(cData.name);
            setTempChildName(cData.name);
          }
          if (cData.is_locked != null) {
            setIsDeviceLocked(!!cData.is_locked);
          }
        }

        const { data: dData } = await supabase
          .from('devices')
          .select('battery_level')
          .eq('child_id', childId)
          .maybeSingle();

        if (dData && dData.battery_level != null) {
          setBatteryLevel(dData.battery_level);
        }
      } catch (err) {
        console.warn('Error fetching child/telemetry:', err);
      }
    };
    fetchChildAndTelemetry();
    // 1. Initial location fetch from Supabase locations table
    const fetchInitialLocation = async () => {
      try {
        const { data } = await supabase
          .from('locations')
          .select('*')
          .eq('child_id', childId)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && data.latitude && data.longitude) {
          setCurrentLocation({
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            accuracy: data.accuracy ?? 5,
            timestamp: new Date(data.recorded_at || Date.now()).getTime(),
            address: data.address || 'Ubicación actual del menor',
          });
        }
      } catch (err) {
        console.warn('Error fetching location from Supabase:', err);
      }
    };
    fetchInitialLocation();

    // 1b. Fetch geofences from Supabase geofences table
    const fetchGeofences = async () => {
      try {
        const { data } = await supabase
          .from('geofences')
          .select('*')
          .eq('child_id', childId);
        if (data && data.length > 0) {
          setZones(
            data.map((d: any) => ({
              id: d.id,
              name: d.name,
              address: d.address || 'Bogotá, Colombia',
              latitude: Number(d.latitude),
              longitude: Number(d.longitude),
              radiusMeters: d.radius_meters || 200,
              isAlertEnabled: d.is_alert_enabled ?? true,
              type: d.zone_type || 'home',
            }))
          );
        }
      } catch (err) {
        console.warn('Error fetching geofences:', err);
      }
    };
    fetchGeofences();

    // 2. Listen for live location broadcasts
    const unsubLocation = realtimeService.subscribeToLocation(childId, (_id, loc) => {
      setCurrentLocation(loc);
    });

    // 3. Listen for incoming notifications in real time
    const unsubNotifs = realtimeService.subscribeToNotificationLogs(childId, (log) => {
      setNotifications((prev) => [log, ...prev].slice(0, 5));
    });

    // 4. Initial notifications history
    const fetchRecentNotifs = async () => {
      try {
        const { data } = await supabase
          .from('notifications_log')
          .select('*')
          .eq('child_id', childId)
          .order('received_at', { ascending: false })
          .limit(5);

        if (data && data.length > 0) {
          const mapped: NotificationLog[] = data.map((d: any) => ({
            id: d.id,
            childId: d.child_id,
            appName: d.app_name || 'App',
            title: d.title || 'Notificación',
            message: d.message || '',
            receivedAt: d.received_at || new Date().toISOString(),
          }));
          setNotifications(mapped);
        } else {
          setNotifications([
            {
              id: 'n1',
              childId,
              appName: 'WhatsApp',
              title: 'Grupo Colegio 6B',
              message: 'Mañana tenemos entrega de ciencias a las 8am',
              receivedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
            },
            {
              id: 'n2',
              childId,
              appName: 'YouTube',
              title: 'Nuevo video',
              message: 'Tu canal suscrito ha publicado nuevo contenido',
              receivedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            },
          ]);
        }
      } catch (err) {
        console.warn('Error fetching notifications log:', err);
      }
    };

    fetchRecentNotifs();

    return () => {
      unsubLocation();
      unsubNotifs();
    };
  }, [childId]);

  // Open Native GPS Navigation with exact coordinates (Google Maps / Waze)
  const handleNavigateToDevice = () => {
    const { latitude, longitude } = currentLocation;
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    const wazeUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;

    Alert.alert(
      'Navegación GPS Externa',
      'Selecciona tu aplicación para trazar la ruta en tiempo real:',
      [
        {
          text: 'Google Maps',
          onPress: () => {
            Linking.openURL(gmapsUrl).catch(() => {
              Alert.alert('Error', 'No se pudo abrir Google Maps.');
            });
          },
        },
        {
          text: 'Waze',
          onPress: () => {
            Linking.openURL(wazeUrl).catch(() => {
              Alert.alert('Error', 'No se pudo abrir Waze.');
            });
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  // Toggle Screen Mirroring stream via Realtime command
  const handleToggleScreenStream = async () => {
    if (isScreenStreaming) {
      setIsScreenStreaming(false);
      await realtimeService.sendCommand(childId, 'STOP_SCREEN_STREAM');
      Alert.alert('Transmisión Detenida', 'La captura de pantalla remota ha finalizado.');
    } else {
      setIsConnectingScreen(true);
      await realtimeService.sendCommand(childId, 'START_SCREEN_STREAM');

      setTimeout(() => {
        setIsConnectingScreen(false);
        setIsScreenStreaming(true);
      }, 1500);
    }
  };

  // Switch camera between front and back
  const handleSwitchCamera = async (cam: 'front' | 'back') => {
    setActiveCam(cam);
    setIsCapturing(true);
    await realtimeService.sendCommand(childId, cam === 'front' ? 'CAM_FRONT' : 'CAM_BACK');

    setTimeout(() => {
      setIsCapturing(false);
      setLastSnapshot(`Foto capturada con Cámara ${cam === 'front' ? 'Frontal' : 'Trasera'}`);
      Alert.alert(
        'Captura Recibida',
        `Se recibió la imagen ambiental desde la cámara ${cam === 'front' ? 'frontal' : 'trasera'}.`
      );
    }, 1800);
  };

  // Save edited child name to Supabase
  const handleSaveName = async () => {
    const trimmed = tempChildName.trim();
    if (!trimmed) {
      Alert.alert('Nombre Requerido', 'Por favor ingresa un nombre para el dispositivo/hijo.');
      return;
    }
    setIsSavingName(true);
    try {
      setChildName(trimmed);
      setIsRenameModalVisible(false);

      // Update Supabase children table
      await supabase
        .from('children')
        .update({ name: trimmed })
        .eq('id', childId);

      // Update Supabase devices table
      await supabase
        .from('devices')
        .update({ name: trimmed })
        .eq('child_id', childId);

      Alert.alert('Nombre Actualizado', `El dispositivo ahora se identifica como "${trimmed}".`);
    } catch (err) {
      console.warn('Error saving child name to Supabase:', err);
      Alert.alert('Error', 'No se pudo guardar el nuevo nombre en Supabase.');
    } finally {
      setIsSavingName(false);
    }
  };

  // Remote Touch Control: Capture relative touch coordinates & dispatch via Supabase Realtime
  const handleRemoteTouch = async (e: GestureResponderEvent, isFull: boolean) => {
    const { locationX, locationY } = e.nativeEvent;
    const targetW = isFull ? 300 : 220;
    const targetH = isFull ? 500 : 340;
    const relX = Number((Math.max(0, Math.min(1, locationX / targetW))).toFixed(3));
    const relY = Number((Math.max(0, Math.min(1, locationY / targetH))).toFixed(3));

    setTouchFeedback({ x: locationX, y: locationY });
    setTimeout(() => setTouchFeedback(null), 450);

    try {
      await realtimeService.sendCommand(childId, 'REMOTE_TOUCH', {
        x: relX,
        y: relY,
        action: 'tap',
      });
    } catch (err) {
      console.warn('Error sending remote touch:', err);
    }
  };

  // Toggle ambient audio streaming
  const handleToggleAudio = async () => {
    const nextState = !isAudioActive;
    setIsAudioActive(nextState);
    await realtimeService.sendCommand(childId, nextState ? 'START_AUDIO' : 'STOP_AUDIO');

    Alert.alert(
      nextState ? 'Escucha Ambiental Activa' : 'Transmisión Pausada',
      nextState
        ? 'El micrófono del menor está transmitiendo audio ambiental cifrado.'
        : 'Transmisión de audio detenida.'
    );
  };

  // Toggle Pausa Familiar / Bloqueo Total
  const handleToggleDeviceLock = async () => {
    setIsTogglingLock(true);
    const nextLocked = !isDeviceLocked;
    try {
      setIsDeviceLocked(nextLocked);
      // Send Realtime command via WebSocket: PAUSE_DEVICE to freeze child screen immediately
      await realtimeService.sendCommand(childId, nextLocked ? 'PAUSE_DEVICE' : 'UNLOCK', {
        reason: 'PAUSA_FAMILIAR',
        triggeredBy: 'Padre',
      });
      // Sync with Supabase children table
      await supabase
        .from('children')
        .update({ is_locked: nextLocked })
        .eq('id', childId);

      Alert.alert(
        nextLocked ? '🔒 Bloqueo Total / Pausa Familiar Activada' : '🔓 Dispositivo Desbloqueado',
        nextLocked
          ? `Se envió el comando PAUSE_DEVICE. La pantalla y el acceso a aplicaciones en el dispositivo de ${childName} han sido pausados.`
          : `Se ha reanudado el acceso a las aplicaciones de ${childName}.`
      );
    } catch (err: any) {
      console.warn('Error toggling device lock:', err);
      Alert.alert('Error', 'No se pudo sincronizar el estado de bloqueo.');
    } finally {
      setIsTogglingLock(false);
    }
  };

  // Toggle alert on specific safe zone
  const handleToggleZoneAlert = async (zoneId: string) => {
    const target = zones.find((z) => z.id === zoneId);
    if (!target) return;
    const nextVal = !target.isAlertEnabled;

    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, isAlertEnabled: nextVal } : z))
    );

    try {
      await supabase.from('geofences').update({ is_alert_enabled: nextVal }).eq('id', zoneId);
    } catch (e) {
      console.warn('Error updating geofence alert:', e);
    }
  };

  // Save new geofence safe zone
  const handleSaveNewZone = async () => {
    if (!newZoneName.trim()) {
      Alert.alert('Nombre Requerido', 'Por favor ingresa un nombre para la zona segura.');
      return;
    }

    setIsSavingZone(true);
    try {
      const generatedId = `zone_${Date.now()}`;
      const newZone: GeofenceZoneData = {
        id: generatedId,
        name: newZoneName.trim(),
        address:
          currentLocation.address ||
          `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radiusMeters: newZoneRadius,
        isAlertEnabled: true,
        type: newZoneType,
      };

      setZones((prev) => [newZone, ...prev]);

      // 1. Persist to Supabase geofences table
      try {
        await supabase.from('geofences').insert({
          id: generatedId,
          child_id: childId,
          name: newZone.name,
          latitude: newZone.latitude,
          longitude: newZone.longitude,
          radius_meters: newZone.radiusMeters,
          address: newZone.address,
          zone_type: newZone.type,
          is_alert_enabled: true,
        });
      } catch (e) {
        console.warn('Error inserting geofence to Supabase:', e);
      }

      // 2. Record event into Supabase notifications_log
      await supabase.from('notifications_log').insert({
        child_id: childId,
        app_name: 'Kibbo Geofencing',
        title: '📍 Nueva Zona Segura Registrada',
        message: `Zona "${newZone.name}" configurada con radio de ${newZone.radiusMeters}m.`,
      });

      Alert.alert(
        'Zona Segura Guardada',
        `Se ha definido el perímetro de ${newZone.radiusMeters} metros alrededor de "${newZone.name}". Recibirás alertas inmediatas cuando entre o salga.`
      );
      setIsAddZoneModalVisible(false);
      setNewZoneName('');
      setNewZoneRadius(200);
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo registrar la zona segura.');
    } finally {
      setIsSavingZone(false);
    }
  };

  // Evaluate current distance to each geofence zone
  const evaluatedZones = zones.map((zone) => {
    const distanceMeters = calculateDistanceMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      zone.latitude,
      zone.longitude
    );
    const isInside = distanceMeters <= zone.radiusMeters;
    return {
      ...zone,
      distanceMeters,
      isInside,
    };
  });

  const currentInsideZone = evaluatedZones.find((z) => z.isInside);
  const closestZone = [...evaluatedZones].sort((a, b) => a.distanceMeters - b.distanceMeters)[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      {/* ── PERSISTENT TOP HEADER & SEGMENTED TABS ── */}
      <View style={styles.persistentHeaderCard}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.childNameHeaderRow}>
              <Text style={styles.title}>{childName}</Text>
              <TouchableOpacity
                style={styles.renamePencilBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setTempChildName(childName);
                  setIsRenameModalVisible(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons name="pencil-outline" size={18} color="#38BDF8" />
              </TouchableOpacity>
            </View>
            <View style={styles.onlineStatusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineStatusText}>En línea • Conectado ahora</Text>
            </View>
          </View>

          {/* Quick Lock / Pausa Familiar Button */}
          <TouchableOpacity
            style={[
              styles.quickLockBtn,
              isDeviceLocked ? styles.quickLockBtnLocked : styles.quickLockBtnUnlocked,
            ]}
            activeOpacity={0.8}
            disabled={isTogglingLock}
            onPress={handleToggleDeviceLock}
          >
            {isTogglingLock ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={isDeviceLocked ? 'lock-closed' : 'pause-circle'}
                  size={15}
                  color="#FFFFFF"
                />
                <Text style={styles.quickLockBtnText}>
                  {isDeviceLocked ? 'Pausado' : 'Pausar'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 3 SEGMENTED TABS (UBICACIÓN & ESTADO | MULTIMEDIA EN VIVO | NOTIFICACIONES & ALERTAS) */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'LOCATION_STATUS' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setSelectedTab('LOCATION_STATUS')}
          >
            <MaterialCommunityIcons
              name="map-marker-radius"
              size={17}
              color={selectedTab === 'LOCATION_STATUS' ? '#38BDF8' : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                selectedTab === 'LOCATION_STATUS' && styles.tabButtonTextActive,
              ]}
              numberOfLines={1}
            >
              Ubicación & Estado
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'MULTIMEDIA' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setSelectedTab('MULTIMEDIA')}
          >
            <Ionicons
              name="videocam"
              size={17}
              color={selectedTab === 'MULTIMEDIA' ? '#38BDF8' : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                selectedTab === 'MULTIMEDIA' && styles.tabButtonTextActive,
              ]}
              numberOfLines={1}
            >
              Multimedia en Vivo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, selectedTab === 'NOTIFICATIONS' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setSelectedTab('NOTIFICATIONS')}
          >
            <MaterialCommunityIcons
              name="bell-ring"
              size={17}
              color={selectedTab === 'NOTIFICATIONS' ? '#38BDF8' : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                selectedTab === 'NOTIFICATIONS' && styles.tabButtonTextActive,
              ]}
              numberOfLines={1}
            >
              Notificaciones
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* ── TAB 1: UBICACIÓN & ESTADO ── */}
        {selectedTab === 'LOCATION_STATUS' && (
          <View>
            {/* COMPACT DEVICE TELEMETRY */}
            <View style={styles.compactTelemetryCard}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.telemetryPillsRow}
              >
                {/* Battery Pill */}
                <View style={styles.telemetryPill}>
                  <Text style={styles.telemetryEmoji}>🔋</Text>
                  <Text style={styles.telemetryPillText}>
                    <Text style={styles.telemetryPillBold}>Batería: </Text>
                    {batteryLevel}% • Normal
                  </Text>
                </View>

                {/* Network Pill */}
                <View style={styles.telemetryPill}>
                  <Text style={styles.telemetryEmoji}>📶</Text>
                  <Text style={styles.telemetryPillText}>
                    <Text style={styles.telemetryPillBold}>Red: </Text>
                    {networkType}
                  </Text>
                </View>

                {/* Critical 3% Protocol Pill with info icon */}
                <TouchableOpacity
                  style={[styles.telemetryPill, styles.protocolPill]}
                  activeOpacity={0.75}
                  onPress={() => setShowProtocolInfo(!showProtocolInfo)}
                >
                  <Text style={styles.telemetryEmoji}>🛡️</Text>
                  <Text style={styles.telemetryPillText}>
                    <Text style={styles.telemetryPillBold}>Protocolo 3%: </Text>
                    Activo
                  </Text>
                  <Ionicons
                    name={showProtocolInfo ? 'information-circle' : 'information-circle-outline'}
                    size={16}
                    color="#F59E0B"
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              </ScrollView>

              {/* Hidden/Collapsible 3% Protocol Explanation Tooltip */}
              {showProtocolInfo && (
                <View style={styles.protocolInfoDropdown}>
                  <Ionicons name="shield-checkmark" size={18} color="#F59E0B" />
                  <Text style={styles.protocolInfoText}>
                    Si la batería desciende al 3%, Kibbo transmitirá la última ubicación GPS por satélite automáticamente antes de apagarse.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowProtocolInfo(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Real-time Location & Navigation Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                  <Ionicons name="location" size={24} color={theme.colors.parentAccent} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Geolocalización en Tiempo Real</Text>
                  <Text style={styles.cardSubtitle}>Ubicación GPS actualizada continuamente</Text>
                </View>
              </View>

              <View style={styles.mapBox}>
                <MaterialCommunityIcons name="map-marker-radius" size={44} color={theme.colors.danger} />
                <Text style={styles.mapAddress}>{currentLocation.address || 'Ubicación Actual'}</Text>
                <Text style={styles.mapCoords}>
                  {currentLocation.latitude.toFixed(4)}° N, {currentLocation.longitude.toFixed(4)}° W (±5m)
                </Text>
              </View>

              {/* Navigate to device button (Google Maps / Waze) */}
              <View style={styles.locationActionsRow}>
                <TouchableOpacity
                  style={styles.navButton}
                  activeOpacity={0.85}
                  onPress={handleNavigateToDevice}
                >
                  <Ionicons name="navigate-circle" size={20} color={theme.colors.white} />
                  <Text style={styles.navButtonText}>Navegar (Mapas / Waze)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.routeHistoryToggleBtn}
                  activeOpacity={0.85}
                  onPress={() => setShowRouteHistory(!showRouteHistory)}
                >
                  <MaterialCommunityIcons name="history" size={20} color={theme.colors.parentAccent} />
                  <Text style={styles.routeHistoryToggleText}>
                    {showRouteHistory ? 'Ocultar Rutas' : 'Histórico de Rutas'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Route History Timeline */}
              {showRouteHistory && (
                <View style={styles.routeHistoryContainer}>
                  <Text style={styles.routeHistoryTitle}>Rutas y Paradas Recientes (Hoy):</Text>
                  {[
                    { id: 'rh1', time: '14:30 - Ahora', place: 'Colegio Bilingüe San José', status: 'Estancia: 6h 15m', icon: 'school' },
                    { id: 'rh2', time: '08:15 - 08:35', place: 'Ruta Escolar / Av. Suba', status: 'En movimiento (32 km/h)', icon: 'bus' },
                    { id: 'rh3', time: 'Ayer 18:30 - Hoy 07:50', place: 'Hogar Familiar', status: 'Zona Segura (Estancia)', icon: 'home' },
                  ].map((stop) => (
                    <View key={stop.id} style={styles.timelineItem}>
                      <View style={styles.timelineIconBox}>
                        <Ionicons name={stop.icon as any} size={16} color={theme.colors.parentAccent} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.timelinePlace}>{stop.place}</Text>
                        <Text style={styles.timelineDetails}>{stop.time} • {stop.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ── MÓDULO DE ZONAS SEGURAS (GEOFENCING) ── */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <MaterialCommunityIcons name="shield-home" size={24} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Zonas Seguras (Geofencing)</Text>
                  <Text style={styles.cardSubtitle}>
                    Perímetros con cálculo de distancia y alertas de entrada/salida
                  </Text>
                </View>
              </View>

              {/* Real-time Geofence Status Banner */}
              <View
                style={[
                  styles.geofenceStatusBanner,
                  currentInsideZone
                    ? styles.geofenceStatusBannerInside
                    : styles.geofenceStatusBannerOutside,
                ]}
              >
                <Ionicons
                  name={currentInsideZone ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={currentInsideZone ? '#10B981' : '#F59E0B'}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={[
                      styles.geofenceStatusTitle,
                      { color: currentInsideZone ? '#10B981' : '#F59E0B' },
                    ]}
                  >
                    {currentInsideZone
                      ? `🟢 Dentro de: ${currentInsideZone.name}`
                      : `🟡 Fuera de Zonas Seguras`}
                  </Text>
                  <Text style={styles.geofenceStatusSub}>
                    {currentInsideZone
                      ? `A ${currentInsideZone.distanceMeters} m del centro (radio: ${currentInsideZone.radiusMeters} m)`
                      : closestZone
                      ? `Más cercana: ${closestZone.name} a ${formatDistance(closestZone.distanceMeters)}`
                      : 'Sin zonas configuradas'}
                  </Text>
                </View>
              </View>

              {/* List of Defined Safe Zones */}
              <View style={styles.zonesList}>
                {evaluatedZones.map((zone) => (
                  <View key={zone.id} style={styles.zoneListItem}>
                    <View
                      style={[
                        styles.zoneIconCircle,
                        {
                          backgroundColor:
                            zone.type === 'home'
                              ? 'rgba(14, 165, 233, 0.15)'
                              : zone.type === 'school'
                              ? 'rgba(129, 140, 248, 0.15)'
                              : 'rgba(16, 185, 129, 0.15)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          zone.type === 'home'
                            ? 'home'
                            : zone.type === 'school'
                            ? 'school'
                            : 'people'
                        }
                        size={20}
                        color={
                          zone.type === 'home'
                            ? '#38BDF8'
                            : zone.type === 'school'
                            ? '#818CF8'
                            : '#10B981'
                        }
                      />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.zoneNameRow}>
                        <Text style={styles.zoneItemName}>{zone.name}</Text>
                        <View
                          style={[
                            styles.zonePresenceBadge,
                            zone.isInside
                              ? styles.zonePresenceBadgeInside
                              : styles.zonePresenceBadgeOutside,
                          ]}
                        >
                          <Text
                            style={[
                              styles.zonePresenceText,
                              { color: zone.isInside ? '#10B981' : '#94A3B8' },
                            ]}
                          >
                            {zone.isInside ? 'Dentro' : `${formatDistance(zone.distanceMeters)}`}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.zoneItemAddress} numberOfLines={1}>
                        {zone.address}
                      </Text>
                      <Text style={styles.zoneItemRadius}>
                        Perímetro seguro: {zone.radiusMeters} metros
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.zoneAlertBtn}
                      activeOpacity={0.7}
                      onPress={() => handleToggleZoneAlert(zone.id)}
                    >
                      <Ionicons
                        name={zone.isAlertEnabled ? 'notifications' : 'notifications-off-outline'}
                        size={18}
                        color={zone.isAlertEnabled ? '#10B981' : '#64748B'}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Button to define a new Safe Zone */}
              <TouchableOpacity
                style={styles.addGeofenceBtn}
                activeOpacity={0.85}
                onPress={() => setIsAddZoneModalVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addGeofenceBtnText}>+ Definir Nueva Zona Segura</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── TAB 2: MULTIMEDIA EN VIVO ── */}
        {selectedTab === 'MULTIMEDIA' && (
          <View>
            {/* Screen Mirroring Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                  <MaterialCommunityIcons name="cellphone-screenshot" size={24} color={theme.colors.parentAccent} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Pantalla en Tiempo Real</Text>
                  <Text style={styles.cardSubtitle}>
                    {isScreenStreaming
                      ? 'Monitoreo de pantalla en vivo activo • Alta definición'
                      : 'Proyecta la pantalla activa del dispositivo'}
                  </Text>
                </View>
              </View>

              {isScreenStreaming ? (
                <View style={styles.screenPlayerContainer}>
                  <View style={styles.screenPlayerTopBar}>
                    <View style={styles.liveIndicator}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>EN VIVO • 1080p • 30 FPS</Text>
                    </View>
                    <Text style={styles.screenPlayerDeviceName}>{childName}</Text>
                    <TouchableOpacity
                      style={styles.fullscreenBtn}
                      activeOpacity={0.7}
                      onPress={() => setIsFullscreen(true)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Pantalla Completa"
                    >
                      <Ionicons name="scan-outline" size={18} color="#38BDF8" />
                    </TouchableOpacity>
                  </View>

                  {/* Smartphone Viewport Mockup with Remote Touch Control */}
                  <TouchableOpacity
                    activeOpacity={1}
                    style={styles.screenDeviceMockup}
                    onPress={(e) => handleRemoteTouch(e, false)}
                  >
                    <View style={styles.phoneNotch}>
                      <View style={styles.phoneSpeaker} />
                    </View>

                    {/* Touch Feedback Ripple */}
                    {touchFeedback && (
                      <View
                        style={[
                          styles.touchFeedbackCircle,
                          { top: touchFeedback.y - 18, left: touchFeedback.x - 18 },
                        ]}
                      />
                    )}

                    <View style={styles.phoneContent}>
                      <View style={styles.phoneHeaderRow}>
                        <Text style={styles.phoneTimeText}>13:58</Text>
                        <View style={styles.phoneIconsRow}>
                          <Ionicons name="wifi" size={13} color="#FFFFFF" />
                          <Ionicons name="cellular" size={13} color="#FFFFFF" />
                          <Ionicons name="battery-full" size={14} color="#10B981" />
                        </View>
                      </View>

                      <View style={styles.activeAppBanner}>
                        <Ionicons name="logo-youtube" size={32} color="#EF4444" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.activeAppTitle}>YouTube • En reproducción</Text>
                          <Text style={styles.activeAppSubtitle}>Documental de Ciencias y Tecnología</Text>
                        </View>
                      </View>

                      <View style={styles.phoneAppGrid}>
                        <View style={styles.phoneMiniApp}>
                          <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                        </View>
                        <View style={styles.phoneMiniApp}>
                          <Ionicons name="camera" size={22} color="#38BDF8" />
                        </View>
                        <View style={styles.phoneMiniApp}>
                          <Ionicons name="book" size={22} color="#F59E0B" />
                        </View>
                        <View style={styles.phoneMiniApp}>
                          <Ionicons name="settings" size={22} color="#94A3B8" />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <Text style={styles.touchHintText}>
                    👆 Toca sobre la pantalla para enviar interacción táctil remota
                  </Text>

                  <TouchableOpacity
                    style={styles.stopScreenButton}
                    activeOpacity={0.85}
                    onPress={handleToggleScreenStream}
                  >
                    <MaterialCommunityIcons name="stop-circle-outline" size={20} color={theme.colors.white} />
                    <Text style={styles.stopScreenButtonText}>Detener Transmisión de Pantalla</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.startScreenButton}
                  activeOpacity={0.85}
                  disabled={isConnectingScreen}
                  onPress={handleToggleScreenStream}
                >
                  {isConnectingScreen ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color={theme.colors.white} />
                      <Text style={styles.startScreenButtonText}>Iniciando transmisión en vivo de alta definición...</Text>
                    </View>
                  ) : (
                    <View style={styles.loadingRow}>
                      <MaterialCommunityIcons name="cast-connected" size={22} color={theme.colors.white} />
                      <Text style={styles.startScreenButtonText}>Ver Pantalla del Dispositivo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Remote Camera Control Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Ionicons name="camera" size={24} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Conmutación de Cámara Remota</Text>
                  <Text style={styles.cardSubtitle}>
                    {lastSnapshot || 'Selecciona qué cámara activar'}
                  </Text>
                </View>
              </View>

              <View style={styles.cameraButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.camSelectBtn,
                    activeCam === 'front' && styles.camSelectBtnActive,
                  ]}
                  onPress={() => handleSwitchCamera('front')}
                  disabled={isCapturing}
                >
                  <MaterialCommunityIcons
                    name="camera-front-variant"
                    size={20}
                    color={activeCam === 'front' ? theme.colors.white : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.camSelectBtnText,
                      activeCam === 'front' && { color: theme.colors.white, fontWeight: '700' },
                    ]}
                  >
                    Cámara Frontal
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.camSelectBtn,
                    activeCam === 'back' && styles.camSelectBtnActive,
                  ]}
                  onPress={() => handleSwitchCamera('back')}
                  disabled={isCapturing}
                >
                  <MaterialCommunityIcons
                    name="camera-flip-outline"
                    size={20}
                    color={activeCam === 'back' ? theme.colors.white : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.camSelectBtnText,
                      activeCam === 'back' && { color: theme.colors.white, fontWeight: '700' },
                    ]}
                  >
                    Cámara Trasera
                  </Text>
                </TouchableOpacity>
              </View>

              {isCapturing && (
                <View style={styles.capturingIndicator}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.capturingText}>Conectando con la cámara remota...</Text>
                </View>
              )}
            </View>

            {/* Ambient Audio Stream Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="mic" size={24} color={theme.colors.childAccent} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Audio Ambiental en Tiempo Real</Text>
                  <Text style={styles.cardSubtitle}>
                    {isAudioActive ? 'Transmisión activa • Escuchando entorno' : 'Micrófono en reposo'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.audioButton,
                  isAudioActive ? styles.audioButtonActive : styles.audioButtonInactive,
                ]}
                activeOpacity={0.85}
                onPress={handleToggleAudio}
              >
                <MaterialCommunityIcons
                  name={isAudioActive ? 'volume-high' : 'microphone-outline'}
                  size={22}
                  color={theme.colors.white}
                />
                <Text style={styles.audioButtonText}>
                  {isAudioActive ? 'Detener Transmisión de Audio' : 'Iniciar Escucha Ambiental en Vivo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── TAB 3: NOTIFICACIONES & ALERTAS ── */}
        {selectedTab === 'NOTIFICATIONS' && (
          <View>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <MaterialCommunityIcons name="bell-ring-outline" size={24} color={theme.colors.warning} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Notificaciones Interceptadas</Text>
                  <Text style={styles.cardSubtitle}>Alertas y mensajes recientes del menor</Text>
                </View>
              </View>

              {notifications.length === 0 ? (
                <Text style={styles.emptyNotifs}>No hay notificaciones recientes.</Text>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <View key={n.id} style={styles.notifItem}>
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>{n.appName}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.notifItemTitle}>{n.title}</Text>
                        <Text style={{ fontSize: 10, color: '#94A3B8' }}>{formatRelativeTime(n.receivedAt)}</Text>
                      </View>
                      <Text style={styles.notifItemBody}>{n.message}</Text>
                    </View>
                  </View>
                ))
              )}

              {/* Botón Ver Historial Completo */}
              <TouchableOpacity
                style={styles.viewAllHistoryButton}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('NotificationHistory', { childId })}
              >
                <Text style={styles.viewAllHistoryText}>Ver historial completo (Ver todas)</Text>
                <Ionicons name="arrow-forward" size={16} color="#38BDF8" />
              </TouchableOpacity>
            </View>

            {/* Acceso a Alertas Preventivas de Contenido */}
            <TouchableOpacity
              style={styles.riskAlertsBannerCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ParentAlerts', { childId })}
            >
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <MaterialCommunityIcons name="shield-alert" size={24} color="#EF4444" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.riskAlertsBannerTitle}>Detector de Riesgo & Palabras Clave</Text>
                <Text style={styles.riskAlertsBannerSub}>
                  Monitoreo de bullying, contenido sensible y capturas automáticas por evento.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── MODAL: RENOMBRAR DISPOSITIVO / HIJO ── */}
      <Modal
        visible={isRenameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.renameModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(14, 165, 233, 0.15)', width: 38, height: 38 }]}>
                <Ionicons name="pencil" size={18} color="#38BDF8" />
              </View>
              <Text style={styles.renameModalTitle}>Renombrar Dispositivo</Text>
            </View>

            <Text style={styles.renameModalSubtitle}>
              Personaliza el nombre de tu hijo o del dispositivo para identificarlo fácilmente en el panel.
            </Text>

            <TextInput
              style={styles.renameInput}
              value={tempChildName}
              onChangeText={setTempChildName}
              placeholder="Ej: Mateo, Sofía, Teléfono de Juan"
              placeholderTextColor="#64748B"
              autoFocus
              maxLength={40}
              selectionColor="#38BDF8"
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                activeOpacity={0.7}
                onPress={() => setIsRenameModalVisible(false)}
                disabled={isSavingName}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveButton}
                activeOpacity={0.8}
                onPress={handleSaveName}
                disabled={isSavingName}
              >
                {isSavingName ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSaveButtonText}>Guardar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: PANTALLA EN VIVO COMPLETA (FULLSCREEN) ── */}
      <Modal
        visible={isFullscreen}
        animationType="slide"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <SafeAreaView style={styles.fullscreenContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.fullscreenTopHeader}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN VIVO • 1080p</Text>
            </View>
            <Text style={styles.fullscreenTitle}>{childName} • Pantalla en Vivo</Text>
            <TouchableOpacity
              style={styles.closeFullscreenBtn}
              activeOpacity={0.8}
              onPress={() => setIsFullscreen(false)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.fullscreenBody}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.fullscreenMockup}
              onPress={(e) => handleRemoteTouch(e, true)}
            >
              {touchFeedback && (
                <View
                  style={[
                    styles.touchFeedbackCircle,
                    { top: touchFeedback.y - 18, left: touchFeedback.x - 18 },
                  ]}
                />
              )}
              <View style={styles.phoneContent}>
                <View style={styles.phoneHeaderRow}>
                  <Text style={styles.phoneTimeText}>13:58</Text>
                  <View style={styles.phoneIconsRow}>
                    <Ionicons name="wifi" size={14} color="#FFFFFF" />
                    <Ionicons name="cellular" size={14} color="#FFFFFF" />
                    <Ionicons name="battery-full" size={15} color="#10B981" />
                  </View>
                </View>

                <View style={[styles.activeAppBanner, { padding: 14 }]}>
                  <Ionicons name="logo-youtube" size={40} color="#EF4444" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.activeAppTitle, { fontSize: 14 }]}>YouTube • En reproducción</Text>
                    <Text style={[styles.activeAppSubtitle, { fontSize: 12 }]}>Documental de Ciencias y Tecnología</Text>
                  </View>
                </View>

                <View style={[styles.phoneAppGrid, { paddingVertical: 18 }]}>
                  <View style={[styles.phoneMiniApp, { width: 52, height: 52 }]}>
                    <Ionicons name="logo-whatsapp" size={28} color="#25D366" />
                  </View>
                  <View style={[styles.phoneMiniApp, { width: 52, height: 52 }]}>
                    <Ionicons name="camera" size={28} color="#38BDF8" />
                  </View>
                  <View style={[styles.phoneMiniApp, { width: 52, height: 52 }]}>
                    <Ionicons name="book" size={28} color="#F59E0B" />
                  </View>
                  <View style={[styles.phoneMiniApp, { width: 52, height: 52 }]}>
                    <Ionicons name="settings" size={28} color="#94A3B8" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <Text style={styles.touchHintFullscreen}>
              👆 Toca cualquier punto de la pantalla para interactuar en tiempo real
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL: DEFINIR NUEVA ZONA SEGURA (GEOFENCING) ── */}
      <Modal
        visible={isAddZoneModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsAddZoneModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addZoneCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleBox}>
                <MaterialCommunityIcons name="map-marker-plus" size={24} color="#10B981" />
                <Text style={styles.modalHeaderTitle}>Nueva Zona Segura</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddZoneModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Fija un punto de interés y el radio en metros. Recibirás avisos automáticos cuando{' '}
              {childName} entre o salga de este perímetro.
            </Text>

            {/* Zone Name Input */}
            <Text style={styles.inputLabel}>Nombre del Lugar</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. Casa, Colegio, Club Deportivo, Parque..."
              placeholderTextColor="#64748B"
              value={newZoneName}
              onChangeText={setNewZoneName}
              maxLength={40}
            />

            {/* Fixed location info */}
            <View style={styles.currentGpsNoticeBox}>
              <Ionicons name="location" size={18} color="#38BDF8" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.currentGpsNoticeTitle}>Punto Central de Referencia</Text>
                <Text style={styles.currentGpsNoticeCoords}>
                  GPS actual: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </Text>
              </View>
            </View>

            {/* Radius Selector Pills */}
            <Text style={styles.inputLabel}>Radio del Perímetro Seguro</Text>
            <View style={styles.radiusPillsRow}>
              {[100, 200, 300, 500, 1000].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.radiusPill,
                    newZoneRadius === r && styles.radiusPillActive,
                  ]}
                  onPress={() => setNewZoneRadius(r)}
                >
                  <Text
                    style={[
                      styles.radiusPillText,
                      newZoneRadius === r && styles.radiusPillTextActive,
                    ]}
                  >
                    {r} m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Type Selector (Casa | Colegio | Familia) */}
            <Text style={styles.inputLabel}>Tipo de Lugar</Text>
            <View style={styles.zoneTypeRow}>
              {[
                { type: 'home', label: 'Hogar', icon: 'home' },
                { type: 'school', label: 'Escuela', icon: 'school' },
                { type: 'family', label: 'Familia', icon: 'people' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.zoneTypeBtn,
                    newZoneType === item.type && styles.zoneTypeBtnActive,
                  ]}
                  onPress={() => setNewZoneType(item.type as any)}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={16}
                    color={newZoneType === item.type ? '#FFFFFF' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.zoneTypeBtnText,
                      newZoneType === item.type && styles.zoneTypeBtnTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.modalActionButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setIsAddZoneModalVisible(false)}
                disabled={isSavingZone}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: '#10B981' }]}
                onPress={handleSaveNewZone}
                disabled={isSavingZone}
              >
                {isSavingZone ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSaveButtonText}>Guardar Zona</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  headerCenter: {
    alignItems: 'center',
  },
  childNameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  renamePencilBtn: {
    padding: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: '#38BDF8',
    fontWeight: '600',
    marginTop: 2,
    fontSize: 12,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 16,
  },
  cardSubtitle: {
    ...theme.typography.caption,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '500',
  },
  mapBox: {
    height: 140,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  mapAddress: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginTop: 6,
    textAlign: 'center',
  },
  mapCoords: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  locationActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    gap: 6,
    shadowColor: '#0284C7',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  navButtonText: {
    ...theme.typography.button,
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  routeHistoryToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderParent,
    gap: 6,
  },
  routeHistoryToggleText: {
    ...theme.typography.caption,
    color: theme.colors.parentAccent,
    fontWeight: '700',
  },
  routeHistoryContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
  },
  routeHistoryTitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    marginBottom: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    padding: 10,
    borderRadius: theme.borderRadius.md,
  },
  timelineIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelinePlace: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 13,
  },
  timelineDetails: {
    ...theme.typography.caption,
    color: '#38BDF8',
    fontSize: 11,
    marginTop: 2,
  },
  compactTelemetryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  telemetryPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.7)',
  },
  protocolPill: {
    borderColor: 'rgba(245, 158, 11, 0.5)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  telemetryEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  telemetryPillText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontSize: 12,
  },
  telemetryPillBold: {
    fontWeight: '700',
    color: '#F8FAFC',
  },
  protocolInfoDropdown: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    gap: 8,
  },
  protocolInfoText: {
    ...theme.typography.caption,
    flex: 1,
    color: '#FDE68A',
    fontSize: 11,
    lineHeight: 15,
  },
  // Screen Mirroring Styles
  startScreenButton: {
    backgroundColor: theme.colors.parentAccent,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.parentAccent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startScreenButtonText: {
    ...theme.typography.button,
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  screenPlayerContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderParent,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  screenPlayerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    ...theme.typography.caption,
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '700',
  },
  screenPlayerDeviceName: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  screenDeviceMockup: {
    width: 220,
    height: 340,
    backgroundColor: '#000000',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#334155',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  phoneNotch: {
    width: '100%',
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneSpeaker: {
    width: 44,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
  },
  phoneContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  phoneHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phoneTimeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  phoneIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeAppBanner: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  activeAppTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 12,
  },
  activeAppSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  phoneAppGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  phoneMiniApp: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopScreenButton: {
    width: '100%',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stopScreenButtonText: {
    ...theme.typography.button,
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  // Camera & Audio styles
  cameraButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  camSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  camSelectBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  camSelectBtnText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  capturingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  capturingText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
  },
  audioButtonActive: {
    backgroundColor: theme.colors.danger,
  },
  audioButtonInactive: {
    backgroundColor: theme.colors.childAccent,
  },
  audioButtonText: {
    ...theme.typography.button,
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyNotifs: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
  },
  notifBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  notifBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontWeight: '700',
    fontSize: 10,
  },
  notifItemTitle: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
  },
  notifItemBody: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  // Fullscreen & Remote Touch styles
  fullscreenBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  touchFeedbackCircle: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.45)',
    borderWidth: 2,
    borderColor: '#38BDF8',
    zIndex: 99,
  },
  touchHintText: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 12,
  },
  // Modal Renombrar Dispositivo
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  renameModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  renameModalTitle: {
    ...theme.typography.h3,
    color: '#F8FAFC',
    fontSize: 18,
  },
  renameModalSubtitle: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  renameInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    ...theme.typography.button,
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSaveButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSaveButtonText: {
    ...theme.typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Modal Fullscreen
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullscreenTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  fullscreenTitle: {
    ...theme.typography.bodyBold,
    color: '#F8FAFC',
    fontSize: 14,
  },
  closeFullscreenBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  fullscreenBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  fullscreenMockup: {
    width: 300,
    height: 500,
    backgroundColor: '#000000',
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#334155',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0284C7',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  touchHintFullscreen: {
    ...theme.typography.caption,
    color: '#94A3B8',
    marginTop: 16,
    textAlign: 'center',
    fontSize: 12,
  },
  // Persistent Header & Segmented Tabs Styles
  persistentHeaderCard: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.4)',
    paddingBottom: 8,
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  onlineStatusText: {
    ...theme.typography.caption,
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    gap: 5,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: '#38BDF8',
  },
  tabButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  viewAllHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 11,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    gap: 8,
  },
  viewAllHistoryText: {
    ...theme.typography.caption,
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 12,
  },
  riskAlertsBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginTop: 8,
  },
  riskAlertsBannerTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 13,
  },
  riskAlertsBannerSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  // Quick Lock Button (Header)
  quickLockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  quickLockBtnUnlocked: {
    backgroundColor: '#EF4444',
  },
  quickLockBtnLocked: {
    backgroundColor: '#10B981',
  },
  quickLockBtnText: {
    ...theme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  // Geofencing Styles
  geofenceStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
  },
  geofenceStatusBannerInside: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  geofenceStatusBannerOutside: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  geofenceStatusTitle: {
    ...theme.typography.bodyBold,
    fontSize: 13,
  },
  geofenceStatusSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  zonesList: {
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  zoneListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.4)',
  },
  zoneIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoneNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  zoneItemName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 13,
    flex: 1,
  },
  zonePresenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginLeft: 6,
  },
  zonePresenceBadgeInside: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  zonePresenceBadgeOutside: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  zonePresenceText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  zoneItemAddress: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  zoneItemRadius: {
    ...theme.typography.caption,
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  zoneAlertBtn: {
    padding: 8,
    marginLeft: 8,
  },
  addGeofenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    gap: 8,
  },
  addGeofenceBtnText: {
    ...theme.typography.button,
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
  },
  // Add Zone Modal
  addZoneCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderTitle: {
    ...theme.typography.h2,
    color: '#F8FAFC',
    fontSize: 18,
  },
  modalDescription: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    ...theme.typography.caption,
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#1E293B',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  currentGpsNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    padding: 10,
    borderRadius: theme.borderRadius.md,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  currentGpsNoticeTitle: {
    ...theme.typography.caption,
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 11,
  },
  currentGpsNoticeCoords: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  radiusPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  radiusPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  radiusPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  radiusPillText: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  radiusPillTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  zoneTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  zoneTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: '#334155',
  },
  zoneTypeBtnActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderColor: '#38BDF8',
  },
  zoneTypeBtnText: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  zoneTypeBtnTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: 6,
  },
});
