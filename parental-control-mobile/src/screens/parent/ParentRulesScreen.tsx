import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { ParentStackParamList, InstalledApp } from '../../types';
import { supabase } from '../../config/supabase';
import { storageService } from '../../services/storageService';
import { realtimeService } from '../../services/realtimeService';
import { isTimeInSchedule } from '../../utils/geofence';
import { theme } from '../../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<ParentStackParamList, 'ParentRules'>;
  route: RouteProp<ParentStackParamList, 'ParentRules'>;
};

interface DynamicAppRule {
  id?: string;
  child_id: string;
  package_name: string;
  app_name: string;
  is_blocked: boolean;
  time_limit_minutes: number;
  schedule_start?: string | null;
  schedule_end?: string | null;
}

interface GeofenceZone {
  id: string;
  child_id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isAlertEnabled: boolean;
  type: 'home' | 'school' | 'family' | 'other';
}

const INSTALLED_APPS_CATALOG: InstalledApp[] = [
  { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', iconName: 'music-box', category: 'Redes Sociales' },
  { packageName: 'com.google.android.youtube', appName: 'YouTube', iconName: 'youtube', category: 'Videos y Entretenimiento' },
  { packageName: 'com.roblox.client', appName: 'Roblox', iconName: 'gamepad-variant', category: 'Juegos' },
  { packageName: 'com.instagram.android', appName: 'Instagram', iconName: 'camera-iris', category: 'Redes Sociales' },
  { packageName: 'com.whatsapp', appName: 'WhatsApp', iconName: 'whatsapp', category: 'Mensajería' },
  { packageName: 'com.mojang.minecraftpe', appName: 'Minecraft Pocket', iconName: 'cube-outline', category: 'Juegos' },
  { packageName: 'com.dts.freefireth', appName: 'Free Fire', iconName: 'fire', category: 'Juegos' },
  { packageName: 'com.supercell.brawlstars', appName: 'Brawl Stars', iconName: 'skull-outline', category: 'Juegos' },
  { packageName: 'com.discord', appName: 'Discord', iconName: 'forum', category: 'Comunidad y Chat' },
  { packageName: 'com.netflix.mediaclient', appName: 'Netflix', iconName: 'movie-open', category: 'Streaming' },
  { packageName: 'com.spotify.music', appName: 'Spotify', iconName: 'spotify', category: 'Música' },
  { packageName: 'com.android.chrome', appName: 'Google Chrome', iconName: 'google-chrome', category: 'Navegación Web' },
];

export const ParentRulesScreen: React.FC<Props> = ({ navigation, route }) => {
  const { childId } = route.params;

  const [activeTab, setActiveTab] = useState<'apps' | 'schedules' | 'geofencing' | 'security'>('apps');
  const [rules, setRules] = useState<DynamicAppRule[]>([]);
  const [isAppIconHidden, setIsAppIconHidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Emergency Lockdown State (PAUSE_DEVICE)
  const [isEmergencyLocked, setIsEmergencyLocked] = useState(false);
  const [isTogglingEmergencyLock, setIsTogglingEmergencyLock] = useState(false);

  // Modal form states
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null);
  const [isBlocked, setIsBlocked] = useState(true);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
  const [savingRule, setSavingRule] = useState(false);

  // Automatic Schedules State (Modo Estudio / Modo Sueño)
  const [schoolMode, setSchoolMode] = useState({
    enabled: true,
    startTime: '08:00',
    endTime: '14:00',
    days: 'Lunes a Viernes',
  });

  const [bedtimeMode, setBedtimeMode] = useState({
    enabled: true,
    startTime: '22:00',
    endTime: '06:00',
    days: 'Todos los días',
  });

  // Modal to edit schedule hours
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [editingScheduleType, setEditingScheduleType] = useState<'school' | 'bedtime' | null>(null);
  const [editStartTime, setEditStartTime] = useState('22:00');
  const [editEndTime, setEditEndTime] = useState('06:00');
  const [editDays, setEditDays] = useState('Todos los días');

  // Evaluate if schedules are active right now
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isSchoolActive =
    schoolMode.enabled && isTimeInSchedule(currentTimeStr, schoolMode.startTime, schoolMode.endTime);
  const isBedtimeActive =
    bedtimeMode.enabled && isTimeInSchedule(currentTimeStr, bedtimeMode.startTime, bedtimeMode.endTime);

  // Geofencing Zones State (Supabase geofences sync)
  const [zones, setZones] = useState<GeofenceZone[]>([
    {
      id: 'z1',
      name: 'Hogar Familiar',
      address: 'Calle 127 # 15-30, Bogotá',
      latitude: 4.7125,
      longitude: -74.0735,
      radiusMeters: 150,
      isAlertEnabled: true,
      type: 'home',
    },
    {
      id: 'z2',
      name: 'Colegio San José',
      address: 'Cra 7 # 170-20, Bogotá',
      latitude: 4.7110,
      longitude: -74.0721,
      radiusMeters: 200,
      isAlertEnabled: true,
      type: 'school',
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
  const [newZoneAddress, setNewZoneAddress] = useState('');
  const [newZoneRadius, setNewZoneRadius] = useState<number>(200);
  const [newZoneType, setNewZoneType] = useState<'home' | 'school' | 'family' | 'other'>('home');
  const [isSavingZone, setIsSavingZone] = useState(false);

  // Fetch dynamic app rules from Supabase
  const fetchRulesFromSupabase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_rules')
        .select('*')
        .eq('child_id', childId);

      if (data && data.length > 0) {
        setRules(data);
      } else {
        setRules([
          { child_id: childId, package_name: 'com.zhiliaoapp.musically', app_name: 'TikTok', is_blocked: true, time_limit_minutes: 0 },
          { child_id: childId, package_name: 'com.roblox.client', app_name: 'Roblox', is_blocked: false, time_limit_minutes: 45 },
          { child_id: childId, package_name: 'com.google.android.youtube', app_name: 'YouTube', is_blocked: false, time_limit_minutes: 60 },
        ]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch geofences from Supabase geofences table
  const fetchGeofencesFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .eq('child_id', childId);

      if (data && data.length > 0) {
        setZones(
          data.map((d: any) => ({
            id: d.id,
            child_id: d.child_id,
            name: d.name,
            address: d.address || 'Bogotá, Colombia',
            latitude: d.latitude,
            longitude: d.longitude,
            radiusMeters: d.radius_meters || 200,
            isAlertEnabled: d.is_alert_enabled ?? true,
            type: d.zone_type || 'home',
          }))
        );
      }
    } catch (e) {
      console.warn('Error fetching geofences:', e);
    }
  };

  // Fetch child device lock state
  const fetchLockStatus = async () => {
    try {
      const { data } = await supabase
        .from('children')
        .select('is_locked')
        .eq('id', childId)
        .maybeSingle();
      if (data && data.is_locked != null) {
        setIsEmergencyLocked(!!data.is_locked);
      }
    } catch (e) {
      console.warn('Error fetching lock status:', e);
    }
  };

  // Admin PIN management state
  const [adminPin, setAdminPin] = useState('0000');
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const [newAdminPin, setNewAdminPin] = useState('');
  const [confirmAdminPin, setConfirmAdminPin] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  useEffect(() => {
    fetchRulesFromSupabase();
    fetchGeofencesFromSupabase();
    fetchLockStatus();
    storageService.getAdminPin().then((pin) => {
      if (pin) setAdminPin(pin);
    });
  }, [childId]);

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
      setAdminPin(newAdminPin);

      try {
        const { data } = await supabase.auth.getSession();
        const userId = data?.session?.user?.id;
        if (userId) {
          await supabase.from('parents').update({ admin_pin: newAdminPin }).eq('id', userId);
        }
      } catch (err) {
        console.warn('Could not sync admin_pin with Supabase parents table:', err);
      }

      await realtimeService.sendCommand(childId, 'UPDATE_ADMIN_PIN', {
        pin: newAdminPin,
      });

      setIsPinModalVisible(false);
      setNewAdminPin('');
      setConfirmAdminPin('');

      Alert.alert(
        '¡PIN Actualizado!',
        `La nueva contraseña/PIN de administrador es "${newAdminPin}". Ha sido sincronizado con el dispositivo supervisado.`,
        [{ text: 'Entendido' }]
      );
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo guardar el nuevo PIN: ' + err.message);
    } finally {
      setIsSavingPin(false);
    }
  };

  // Bloqueo Total de Emergencia (PAUSE_DEVICE)
  const handleEmergencyLockdownToggle = async () => {
    setIsTogglingEmergencyLock(true);
    const nextLocked = !isEmergencyLocked;
    try {
      setIsEmergencyLocked(nextLocked);
      // Dispatch Realtime Command
      await realtimeService.sendCommand(childId, nextLocked ? 'PAUSE_DEVICE' : 'UNLOCK', {
        reason: 'PAUSA_FAMILIAR',
        emergency: true,
        triggeredBy: 'Padre',
      });

      // Sync Supabase children table
      await supabase.from('children').update({ is_locked: nextLocked }).eq('id', childId);

      // Record alert in notifications_log
      await supabase.from('notifications_log').insert({
        child_id: childId,
        app_name: 'Kibbo Seguridad',
        title: nextLocked ? '🚨 Bloqueo Total de Emergencia' : '🔓 Bloqueo Total Levantado',
        message: nextLocked
          ? 'El padre ha activado el bloqueo total inmediato. La pantalla del menor ha sido congelada.'
          : 'El padre ha desactivado el bloqueo total. El uso de apps del menor vuelve a estar activo.',
      });

      Alert.alert(
        nextLocked ? '🚨 Bloqueo Total Activado' : '🔓 Dispositivo Desbloqueado',
        nextLocked
          ? 'Comando PAUSE_DEVICE enviado en vivo. La pantalla del menor está congelada al instante.'
          : 'El acceso al dispositivo y aplicaciones ha sido restaurado con éxito.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo aplicar el bloqueo.');
    } finally {
      setIsTogglingEmergencyLock(false);
    }
  };

  // Toggle block status directly
  const handleToggleBlock = async (rule: DynamicAppRule) => {
    const nextBlocked = !rule.is_blocked;
    const updated = rules.map((r) =>
      r.package_name === rule.package_name ? { ...r, is_blocked: nextBlocked } : r
    );
    setRules(updated);

    try {
      await supabase.from('app_rules').upsert({
        child_id: childId,
        package_name: rule.package_name,
        app_name: rule.app_name,
        is_blocked: nextBlocked,
        time_limit_minutes: rule.time_limit_minutes,
      });
      await realtimeService.sendCommand(childId, 'LOCK', { rulesUpdated: true });
    } catch (err) {
      console.warn('Sync error:', err);
    }
  };

  // Save or modify rule
  const handleSaveRule = async () => {
    if (!selectedApp) {
      Alert.alert('Selección requerida', 'Por favor selecciona una aplicación.');
      return;
    }

    setSavingRule(true);
    try {
      const newRule: DynamicAppRule = {
        child_id: childId,
        package_name: selectedApp.packageName,
        app_name: selectedApp.appName,
        is_blocked: isBlocked,
        time_limit_minutes: isBlocked ? 0 : timeLimitMinutes,
      };

      await supabase.from('app_rules').upsert({
        child_id: childId,
        package_name: newRule.package_name,
        app_name: newRule.app_name,
        is_blocked: newRule.is_blocked,
        time_limit_minutes: newRule.time_limit_minutes,
      });

      setRules((prev) => {
        const filtered = prev.filter((r) => r.package_name !== newRule.package_name);
        return [newRule, ...filtered];
      });

      await realtimeService.sendCommand(childId, 'LOCK', { rulesUpdated: true });

      Alert.alert('Regla Guardada', `Restricción aplicada para ${newRule.app_name}.`);
      setModalVisible(false);
      setSelectedApp(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo guardar la regla.');
    } finally {
      setSavingRule(false);
    }
  };

  const toggleZoneAlert = async (zoneId: string) => {
    const target = zones.find((z) => z.id === zoneId);
    if (!target) return;
    const nextVal = !target.isAlertEnabled;

    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, isAlertEnabled: nextVal } : z))
    );

    try {
      await supabase.from('geofences').update({ is_alert_enabled: nextVal }).eq('id', zoneId);
    } catch (e) {
      console.warn('Error syncing zone alert:', e);
    }

    Alert.alert(
      'Zona Segura Actualizada',
      nextVal
        ? `Alertas de perímetro activadas para "${target.name}".`
        : `Alertas silenciadas para "${target.name}".`
    );
  };

  // Guardar nueva geocerca en Supabase
  const handleSaveNewZone = async () => {
    if (!newZoneName.trim()) {
      Alert.alert('Nombre Requerido', 'Por favor ingresa un nombre para la zona segura (ej. Colegio, Casa).');
      return;
    }

    setIsSavingZone(true);
    try {
      const generatedId = `zone_${Date.now()}`;
      const newZone: GeofenceZone = {
        id: generatedId,
        child_id: childId,
        name: newZoneName.trim(),
        address: newZoneAddress.trim() || 'Coordenadas GPS de Mateo',
        latitude: 4.7110,
        longitude: -74.0721,
        radiusMeters: newZoneRadius,
        isAlertEnabled: true,
        type: newZoneType,
      };

      setZones((prev) => [newZone, ...prev]);

      // Guardar en tabla geofences de Supabase
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

      // Registrar notificación
      await supabase.from('notifications_log').insert({
        child_id: childId,
        app_name: 'Kibbo Geofencing',
        title: '📍 Nueva Zona Segura Registrada',
        message: `Zona "${newZone.name}" configurada con radio de ${newZone.radiusMeters} metros.`,
      });

      Alert.alert(
        'Zona Segura Guardada',
        `Se ha definido el perímetro de ${newZone.radiusMeters} metros para "${newZone.name}". Recibirás alertas cuando el menor entre o salga de este radio.`
      );

      setIsAddZoneModalVisible(false);
      setNewZoneName('');
      setNewZoneAddress('');
      setNewZoneRadius(200);
    } catch (err: any) {
      console.warn('Error saving geofence:', err);
      Alert.alert('Aviso', 'Zona segura registrada localmente.');
      setIsAddZoneModalVisible(false);
    } finally {
      setIsSavingZone(false);
    }
  };

  // Eliminar geocerca
  const handleDeleteZone = (zoneId: string, zoneName: string) => {
    Alert.alert(
      'Eliminar Zona Segura',
      `¿Deseas eliminar el perímetro "${zoneName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setZones((prev) => prev.filter((z) => z.id !== zoneId));
            try {
              await supabase.from('geofences').delete().eq('id', zoneId);
            } catch (e) {
              console.warn('Error deleting zone from supabase:', e);
            }
          },
        },
      ]
    );
  };

  const handleOpenScheduleModal = (type: 'school' | 'bedtime') => {
    setEditingScheduleType(type);
    if (type === 'school') {
      setEditStartTime(schoolMode.startTime);
      setEditEndTime(schoolMode.endTime);
      setEditDays(schoolMode.days);
    } else {
      setEditStartTime(bedtimeMode.startTime);
      setEditEndTime(bedtimeMode.endTime);
      setEditDays(bedtimeMode.days);
    }
    setScheduleModalVisible(true);
  };

  const handleSaveSchedule = async () => {
    if (editingScheduleType === 'school') {
      setSchoolMode((prev) => ({
        ...prev,
        startTime: editStartTime,
        endTime: editEndTime,
        days: editDays,
      }));
      Alert.alert(
        'Horario Escolar Configurado',
        `El dispositivo se bloqueará automáticamente de ${editStartTime} a ${editEndTime}.`
      );
    } else {
      setBedtimeMode((prev) => ({
        ...prev,
        startTime: editStartTime,
        endTime: editEndTime,
        days: editDays,
      }));
      Alert.alert(
        'Modo Descanso Configurado',
        `El dispositivo se bloqueará automáticamente de ${editStartTime} a ${editEndTime}.`
      );
    }
    setScheduleModalVisible(false);

    try {
      await realtimeService.sendCommand(childId, 'LOCK', {
        reason: editingScheduleType === 'school' ? 'SCHOOL' : 'BEDTIME',
        rulesUpdated: true,
      });
    } catch (err) {
      console.warn('Realtime notification error:', err);
    }
  };

  const handleToggleHideAppIcon = async (val: boolean) => {
    setIsAppIconHidden(val);
    try {
      await realtimeService.sendCommand(childId, 'TOGGLE_HIDE_ICON', { hidden: val });
      await supabase.from('notifications_log').insert({
        child_id: childId,
        app_name: 'Kibbo Seguridad',
        title: val ? '👁️ Modo Sigiloso Activado' : '📱 Icono de App Visible',
        message: val
          ? 'El icono de la app ha sido ocultado del menú en el dispositivo de Mateo.'
          : 'El icono de la app es nuevamente visible en el menú en el dispositivo de Mateo.',
      });
      Alert.alert(
        val ? 'Modo Sigiloso Activado' : 'Icono Visible',
        val
          ? 'El icono de Kibbo se ha ocultado del teléfono del menor. Para abrir la app físicamente en su celular marca *#54226# en el marcador de llamadas o abre kibbo://settings.'
          : 'El icono de Kibbo es visible nuevamente en el cajón de aplicaciones.'
      );
    } catch (err) {
      console.warn('Error toggling hide app icon:', err);
    }
  };

  const getAppIcon = (packageName: string): any => {
    const found = INSTALLED_APPS_CATALOG.find((a) => a.packageName === packageName);
    return found?.iconName || 'application';
  };

  const filteredApps = INSTALLED_APPS_CATALOG.filter(
    (app) =>
      app.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Reglas y Bienestar</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>
          Control parental dinámico: gestiona aplicaciones, automatiza horarios escolares y supervisa zonas seguras con geofencing.
        </Text>

        {/* Cuadrícula de 2x2 Secciones Modernas */}
        <View style={styles.gridContainer}>
          {/* Card 1: Apps & Límites */}
          <TouchableOpacity
            style={[
              styles.gridCard,
              activeTab === 'apps' && styles.gridCardActive,
              { borderColor: activeTab === 'apps' ? '#38BDF8' : 'rgba(56, 189, 248, 0.2)' },
            ]}
            activeOpacity={0.85}
            onPress={() => setActiveTab('apps')}
          >
            <View style={styles.gridCardHeader}>
              <View
                style={[
                  styles.gridIconCircle,
                  { backgroundColor: activeTab === 'apps' ? '#38BDF8' : 'rgba(56, 189, 248, 0.15)' },
                ]}
              >
                <Ionicons
                  name="apps"
                  size={22}
                  color={activeTab === 'apps' ? '#FFFFFF' : '#38BDF8'}
                />
              </View>
              {activeTab === 'apps' && (
                <View style={[styles.activeDot, { backgroundColor: '#38BDF8' }]} />
              )}
            </View>
            <Text style={styles.gridCardTitle}>Apps & Límites</Text>
            <Text style={styles.gridCardSub}>
              {rules.length} apps • Bloqueo o minutos
            </Text>
          </TouchableOpacity>

          {/* Card 2: Horarios Escolar & Sueño */}
          <TouchableOpacity
            style={[
              styles.gridCard,
              activeTab === 'schedules' && styles.gridCardActive,
              { borderColor: activeTab === 'schedules' ? '#818CF8' : 'rgba(129, 140, 248, 0.2)' },
            ]}
            activeOpacity={0.85}
            onPress={() => setActiveTab('schedules')}
          >
            <View style={styles.gridCardHeader}>
              <View
                style={[
                  styles.gridIconCircle,
                  { backgroundColor: activeTab === 'schedules' ? '#818CF8' : 'rgba(129, 140, 248, 0.15)' },
                ]}
              >
                <Ionicons
                  name="time"
                  size={22}
                  color={activeTab === 'schedules' ? '#FFFFFF' : '#818CF8'}
                />
              </View>
              {activeTab === 'schedules' && (
                <View style={[styles.activeDot, { backgroundColor: '#818CF8' }]} />
              )}
            </View>
            <Text style={styles.gridCardTitle}>Horarios & Sueño</Text>
            <Text style={styles.gridCardSub}>
              Modo escuela, descanso y pausa
            </Text>
          </TouchableOpacity>

          {/* Card 3: Zonas Seguras (Geofencing) */}
          <TouchableOpacity
            style={[
              styles.gridCard,
              activeTab === 'geofencing' && styles.gridCardActive,
              { borderColor: activeTab === 'geofencing' ? '#10B981' : 'rgba(16, 185, 129, 0.2)' },
            ]}
            activeOpacity={0.85}
            onPress={() => setActiveTab('geofencing')}
          >
            <View style={styles.gridCardHeader}>
              <View
                style={[
                  styles.gridIconCircle,
                  { backgroundColor: activeTab === 'geofencing' ? '#10B981' : 'rgba(16, 185, 129, 0.15)' },
                ]}
              >
                <Ionicons
                  name="location"
                  size={22}
                  color={activeTab === 'geofencing' ? '#FFFFFF' : '#10B981'}
                />
              </View>
              {activeTab === 'geofencing' && (
                <View style={[styles.activeDot, { backgroundColor: '#10B981' }]} />
              )}
            </View>
            <Text style={styles.gridCardTitle}>Zonas Seguras</Text>
            <Text style={styles.gridCardSub}>
              {zones.length} perímetros de alerta GPS
            </Text>
          </TouchableOpacity>

          {/* Card 4: Ocultar App & PIN */}
          <TouchableOpacity
            style={[
              styles.gridCard,
              activeTab === 'security' && styles.gridCardActive,
              { borderColor: activeTab === 'security' ? '#EF4444' : 'rgba(239, 68, 68, 0.2)' },
            ]}
            activeOpacity={0.85}
            onPress={() => setActiveTab('security')}
          >
            <View style={styles.gridCardHeader}>
              <View
                style={[
                  styles.gridIconCircle,
                  { backgroundColor: activeTab === 'security' ? '#EF4444' : 'rgba(239, 68, 68, 0.15)' },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={22}
                  color={activeTab === 'security' ? '#FFFFFF' : '#EF4444'}
                />
              </View>
              {activeTab === 'security' && (
                <View style={[styles.activeDot, { backgroundColor: '#EF4444' }]} />
              )}
            </View>
            <Text style={styles.gridCardTitle}>Ocultar App & PIN</Text>
            <Text style={styles.gridCardSub}>
              Anti-desinstalación y sigilo
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: APPS & LÍMITES */}
        {activeTab === 'apps' && (
          <View style={styles.appsSectionWrapper}>
            {/* Cabecera limpia con botón compacto + Añadir Regla */}
            <View style={styles.appsSectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeaderTitle}>Aplicaciones Restringidas ({rules.length})</Text>
                <Text style={styles.appsSectionNotice}>
                  Gestiona bloqueo total o minutos de uso diario
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addRuleCompactBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedApp(null);
                  setIsBlocked(true);
                  setTimeLimitMinutes(60);
                  setModalVisible(true);
                }}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addRuleCompactBtnText}>Añadir Regla</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={theme.colors.parentAccent} style={{ marginTop: 20 }} />
            ) : rules.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="shield-check-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>No hay restricciones activas</Text>
                <Text style={styles.emptySub}>Toca arriba para añadir una regla a cualquier aplicación.</Text>
              </View>
            ) : (
              <View style={styles.rulesList}>
                {rules.map((rule) => {
                  const iconName = getAppIcon(rule.package_name);
                  return (
                    <View key={rule.package_name} style={styles.ruleCard}>
                      <View style={styles.ruleIconBox}>
                        <MaterialCommunityIcons name={iconName} size={28} color={theme.colors.parentAccent} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.ruleAppName}>{rule.app_name}</Text>
                        <Text style={styles.ruleStatusText}>
                          {rule.is_blocked
                            ? '🚫 Bloqueada completamente'
                            : `⏳ Límite diario: ${rule.time_limit_minutes} min`}
                        </Text>
                      </View>
                      <Switch
                        value={rule.is_blocked}
                        onValueChange={() => handleToggleBlock(rule)}
                        thumbColor={rule.is_blocked ? theme.colors.danger : theme.colors.success}
                        trackColor={{ false: '#334155', true: 'rgba(239, 68, 68, 0.4)' }}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: HORARIOS AUTOMÁTICOS */}
        {/* TAB 2: HORARIOS AUTOMÁTICOS & MODO LOCKDOWN */}
        {activeTab === 'schedules' && (
          <View style={styles.schedulesWrapper}>
            {/* BOTÓN DESTACADO: BLOQUEO TOTAL DE EMERGENCIA (LOCKDOWN) */}
            <View style={[styles.emergencyLockCard, isEmergencyLocked && styles.emergencyLockCardActive]}>
              <View style={styles.emergencyLockHeader}>
                <View style={[styles.emergencyIconCircle, isEmergencyLocked && { backgroundColor: '#EF4444' }]}>
                  <Ionicons
                    name={isEmergencyLocked ? 'lock-closed' : 'alert-circle'}
                    size={26}
                    color="#FFFFFF"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.emergencyBadgeRow}>
                    <Text style={[styles.emergencyBadge, isEmergencyLocked ? styles.emergencyBadgeRed : styles.emergencyBadgeYellow]}>
                      {isEmergencyLocked ? '🔴 DISPOSITIVO EN LOCKDOWN' : '⚡ MODO LOCKDOWN INMEDIATO'}
                    </Text>
                  </View>
                  <Text style={styles.emergencyLockTitle}>
                    {isEmergencyLocked ? 'Bloqueo Total Activo' : 'Bloqueo Total de Emergencia'}
                  </Text>
                  <Text style={styles.emergencyLockSub}>
                    {isEmergencyLocked
                      ? 'La pantalla del menor está congelada en tiempo real mediante el comando PAUSE_DEVICE.'
                      : 'Envía el comando PAUSE_DEVICE por Supabase Realtime para congelar inmediatamente todas las apps del menor.'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.emergencyLockBtn,
                  isEmergencyLocked ? styles.emergencyUnlockBtn : styles.emergencyLockActiveBtn,
                ]}
                activeOpacity={0.88}
                disabled={isTogglingEmergencyLock}
                onPress={handleEmergencyLockdownToggle}
              >
                {isTogglingEmergencyLock ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={isEmergencyLocked ? 'lock-open-outline' : 'hand-left-outline'}
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.emergencyLockBtnText}>
                      {isEmergencyLocked ? 'DESBLOQUEAR Y REANUDAR DISPOSITIVO' : '🚨 ACTIVAR BLOQUEO TOTAL DE EMERGENCIA'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Encabezado de Horarios */}
            <View style={styles.schedulesHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Programación de Horarios Automáticos</Text>
              <Text style={styles.schedulesHeaderNotice}>
                Aplica reglas de bloqueo en horas clave sin intervención manual
              </Text>
            </View>

            {/* Modo Escolar / Modo Estudio */}
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <View style={[styles.scheduleIconCircle, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                  <Ionicons name="school" size={24} color={theme.colors.parentAccent} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.scheduleTitle}>Modo Estudio / Horario Escolar</Text>
                  <Text style={styles.scheduleSub}>{schoolMode.days} • {schoolMode.startTime} a {schoolMode.endTime}</Text>
                </View>
                <Switch
                  value={schoolMode.enabled}
                  onValueChange={(val) => {
                    setSchoolMode((prev) => ({ ...prev, enabled: val }));
                    Alert.alert('Modo Estudio', val ? 'Horario escolar activado.' : 'Horario escolar pausado.');
                  }}
                  thumbColor={schoolMode.enabled ? theme.colors.parentAccent : '#94A3B8'}
                  trackColor={{ false: '#334155', true: 'rgba(14, 165, 233, 0.4)' }}
                />
              </View>

              {/* Status active chip */}
              <View
                style={[
                  styles.scheduleActivePill,
                  isSchoolActive ? styles.scheduleActivePillOn : styles.scheduleActivePillOff,
                ]}
              >
                <Ionicons
                  name={isSchoolActive ? 'lock-closed' : 'time-outline'}
                  size={14}
                  color={isSchoolActive ? '#38BDF8' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.scheduleActiveText,
                    { color: isSchoolActive ? '#38BDF8' : '#94A3B8' },
                  ]}
                >
                  {isSchoolActive
                    ? '🟢 Activo en este momento • Bloqueo escolar en curso'
                    : `Inactivo ahora • Se aplicará de ${schoolMode.startTime} a ${schoolMode.endTime}`}
                </Text>
              </View>

              <Text style={styles.scheduleDescription}>
                Bloquea juegos, redes sociales y apps de entretenimiento durante el horario de clases para favorecer la concentración en el aula.
              </Text>

              {/* Edit schedule button */}
              <TouchableOpacity
                style={styles.editScheduleButton}
                activeOpacity={0.8}
                onPress={() => handleOpenScheduleModal('school')}
              >
                <MaterialCommunityIcons name="clock-edit-outline" size={17} color="#38BDF8" />
                <Text style={styles.editScheduleButtonText}>
                  Modificar Rango de Horas ({schoolMode.startTime} - {schoolMode.endTime})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Modo Descanso / Modo Sueño (Bedtime) */}
            <View style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <View style={[styles.scheduleIconCircle, { backgroundColor: 'rgba(129, 140, 248, 0.15)' }]}>
                  <Ionicons name="moon" size={24} color="#818CF8" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.scheduleTitle}>Modo Sueño / Descanso Nocturno</Text>
                  <Text style={styles.scheduleSub}>{bedtimeMode.days} • {bedtimeMode.startTime} a {bedtimeMode.endTime}</Text>
                </View>
                <Switch
                  value={bedtimeMode.enabled}
                  onValueChange={(val) => {
                    setBedtimeMode((prev) => ({ ...prev, enabled: val }));
                    Alert.alert('Modo Sueño', val ? 'Bloqueo nocturno activado.' : 'Bloqueo nocturno pausado.');
                  }}
                  thumbColor={bedtimeMode.enabled ? '#818CF8' : '#94A3B8'}
                  trackColor={{ false: '#334155', true: 'rgba(129, 140, 248, 0.4)' }}
                />
              </View>

              {/* Status active chip */}
              <View
                style={[
                  styles.scheduleActivePill,
                  isBedtimeActive ? styles.scheduleActivePillOn : styles.scheduleActivePillOff,
                ]}
              >
                <Ionicons
                  name={isBedtimeActive ? 'moon' : 'time-outline'}
                  size={14}
                  color={isBedtimeActive ? '#818CF8' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.scheduleActiveText,
                    { color: isBedtimeActive ? '#818CF8' : '#94A3B8' },
                  ]}
                >
                  {isBedtimeActive
                    ? '🌙 Activo en este momento • Hora de descanso y dormir'
                    : `Inactivo ahora • Se aplicará de ${bedtimeMode.startTime} a ${bedtimeMode.endTime}`}
                </Text>
              </View>

              <Text style={styles.scheduleDescription}>
                Congela la pantalla y apaga notificaciones no esenciales durante la noche para proteger el descanso y la salud visual del menor.
              </Text>

              {/* Edit schedule button */}
              <TouchableOpacity
                style={[styles.editScheduleButton, { borderColor: 'rgba(129, 140, 248, 0.35)' }]}
                activeOpacity={0.8}
                onPress={() => handleOpenScheduleModal('bedtime')}
              >
                <MaterialCommunityIcons name="clock-edit-outline" size={17} color="#818CF8" />
                <Text style={[styles.editScheduleButtonText, { color: '#818CF8' }]}>
                  Modificar Rango de Horas ({bedtimeMode.startTime} - {bedtimeMode.endTime})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* TAB 3: ZONAS SEGURAS (GEOFENCING) */}
        {activeTab === 'geofencing' && (
          <View style={styles.geofencingWrapper}>
            <View style={styles.geofencingHeader}>
              <View style={styles.geofencingHeaderTop}>
                <Text style={styles.sectionHeaderTitle}>Zonas de Seguridad ({zones.length})</Text>
                <View style={styles.supabaseSyncPill}>
                  <Ionicons name="cloud-done" size={13} color="#10B981" />
                  <Text style={styles.supabaseSyncPillText}>Supabase Geofences</Text>
                </View>
              </View>
              <Text style={styles.geofencingNotice}>
                Define perímetros circulares en metros para recibir alertas automáticas cuando el GPS de Mateo entre o salga de cada zona.
              </Text>
            </View>

            {zones.map((zone) => {
              const zoneIcon =
                zone.type === 'home'
                  ? 'home'
                  : zone.type === 'school'
                  ? 'school'
                  : zone.type === 'family'
                  ? 'people'
                  : 'location';

              const zoneColor =
                zone.type === 'home'
                  ? '#10B981'
                  : zone.type === 'school'
                  ? '#38BDF8'
                  : zone.type === 'family'
                  ? '#818CF8'
                  : '#F59E0B';

              return (
                <View key={zone.id} style={styles.zoneCard}>
                  <View style={[styles.zoneIconBox, { backgroundColor: `${zoneColor}20` }]}>
                    <Ionicons name={zoneIcon} size={24} color={zoneColor} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <Text style={styles.zoneAddress} numberOfLines={1}>{zone.address}</Text>
                    <View style={styles.zoneRadiusRow}>
                      <View style={styles.zoneRadiusBadge}>
                        <Ionicons name="radio" size={11} color="#38BDF8" />
                        <Text style={styles.zoneRadiusBadgeText}>Radio: {zone.radiusMeters} m</Text>
                      </View>
                      <Text style={styles.zoneStatusAlert}>
                        {zone.isAlertEnabled ? '🔔 Alerta Activa' : '🔕 Silenciada'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.zoneCardActions}>
                    <Switch
                      value={zone.isAlertEnabled}
                      onValueChange={() => toggleZoneAlert(zone.id)}
                      thumbColor={zone.isAlertEnabled ? theme.colors.success : '#94A3B8'}
                      trackColor={{ false: '#334155', true: 'rgba(16, 185, 129, 0.4)' }}
                    />
                    <TouchableOpacity
                      style={styles.zoneDeleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleDeleteZone(zone.id, zone.name)}
                    >
                      <Ionicons name="trash-outline" size={17} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.addZoneButton}
              activeOpacity={0.88}
              onPress={() => setIsAddZoneModalVisible(true)}
            >
              <Ionicons name="add-circle" size={20} color={theme.colors.white} />
              <Text style={styles.addZoneButtonText}>Definir Nueva Zona en el Mapa</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 4: SEGURIDAD & OCULTAMIENTO DE APP */}
        {activeTab === 'security' && (
          <View style={styles.securityWrapper}>
            {/* Ocultamiento Remoto del Icono (Modo Sigiloso) */}
            <View style={styles.stealthCard}>
              <View style={styles.stealthHeader}>
                <View style={[styles.stealthIconCircle, { backgroundColor: 'rgba(129, 140, 248, 0.15)' }]}>
                  <Ionicons
                    name={isAppIconHidden ? 'eye-off' : 'eye'}
                    size={24}
                    color="#818CF8"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.stealthTitle}>Ocultar Icono de la App</Text>
                  <Text style={styles.stealthSub}>
                    {isAppIconHidden
                      ? 'Modo Sigiloso Activo • Icono no visible en el menú del celular'
                      : 'Icono visible normalmente en el cajón de aplicaciones'}
                  </Text>
                </View>
                <Switch
                  value={isAppIconHidden}
                  onValueChange={handleToggleHideAppIcon}
                  thumbColor={isAppIconHidden ? '#818CF8' : '#94A3B8'}
                  trackColor={{ false: '#334155', true: 'rgba(129, 140, 248, 0.4)' }}
                />
              </View>

              <Text style={styles.stealthDescription}>
                Al activar este switch, Kibbo oculta su icono en el cajón de aplicaciones de Android
                mediante el componente lanzador (PackageManager), evitando que el menor detecte la app o intente manipularla.
              </Text>
            </View>

            {/* Tarjeta de Código Secreto Dialer / Deep Link */}
            <View style={styles.secretMethodsCard}>
              <View style={styles.secretMethodsHeader}>
                <Ionicons name="keypad" size={22} color="#38BDF8" />
                <Text style={styles.secretMethodsTitle}>
                  Cómo Abrir la App en el Celular si está Oculta
                </Text>
              </View>
              <Text style={styles.secretMethodsSub}>
                Si tienes el teléfono físicamente y necesitas abrir la app:
              </Text>

              {/* Método 1: Marcador Telefónico */}
              <View style={styles.methodBox}>
                <View style={styles.methodTitleRow}>
                  <Text style={styles.methodBadge}>MÉTODO 1: LLAMADA SECRETA</Text>
                  <Ionicons name="call" size={16} color="#38BDF8" />
                </View>
                <Text style={styles.methodCode}>*#54226#</Text>
                <Text style={styles.methodExplanation}>
                  Abre la app de llamadas del teléfono, marca <Text style={{ fontWeight: '700', color: '#F8FAFC' }}>*#54226#</Text> (k-i-b-b-o) y presiona la tecla verde de llamar. Kibbo se abrirá inmediatamente en pantalla completa.
                </Text>
              </View>

              {/* Método 2: Enlace en Navegador */}
              <View style={styles.methodBox}>
                <View style={styles.methodTitleRow}>
                  <Text style={styles.methodBadge}>MÉTODO 2: URL RÁPIDA (DEEP LINK)</Text>
                  <Ionicons name="globe-outline" size={16} color="#10B981" />
                </View>
                <Text style={[styles.methodCode, { color: '#10B981' }]}>kibbo://settings</Text>
                <Text style={styles.methodExplanation}>
                  Escribe <Text style={{ fontWeight: '700', color: '#F8FAFC' }}>kibbo://settings</Text> en la barra de direcciones de Chrome del teléfono para abrirla al instante.
                </Text>
              </View>
            </View>

            {/* Tarjeta de Protección Anti-Desinstalación con PIN */}
            <View style={styles.antiUninstallCard}>
              <View style={styles.antiUninstallHeader}>
                <View style={[styles.stealthIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="shield-checkmark" size={24} color="#EF4444" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.antiUninstallTitle}>PIN de Seguridad Anti-Desinstalación</Text>
                  <Text style={styles.antiUninstallSub}>
                    PIN Maestro Actual: <Text style={{ color: '#F8FAFC', fontWeight: '800' }}>{adminPin}</Text>
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changePinBtn}
                  onPress={() => {
                    setNewAdminPin('');
                    setConfirmAdminPin('');
                    setIsPinModalVisible(true);
                  }}
                >
                  <Ionicons name="key" size={14} color="#F59E0B" />
                  <Text style={styles.changePinBtnText}>Cambiar PIN</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.antiUninstallDescription}>
                Si tu hijo intenta desinstalar o desvincular la app, se le exigirá obligatoriamente tu PIN.
                Si ingresa un PIN erróneo más de 3 veces consecutivas, el intento quedará bloqueado y recibirás una alerta prioritaria en tu panel.
              </Text>

              <View style={styles.rulesSummaryBox}>
                <View style={styles.ruleSummaryItem}>
                  <Ionicons name="lock-closed" size={16} color="#10B981" />
                  <Text style={styles.ruleSummaryText}>Bloqueo automático tras 3 intentos erróneos</Text>
                </View>
                <View style={styles.ruleSummaryItem}>
                  <Ionicons name="notifications" size={16} color="#F59E0B" />
                  <Text style={styles.ruleSummaryText}>Alerta prioritaria inmediata a Supabase notifications_log</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Modal Selección y Creación de Regla */}
        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Configurar Regla de App</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {!selectedApp ? (
                <>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar aplicación..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  <FlatList
                    data={filteredApps}
                    keyExtractor={(item) => item.packageName}
                    style={{ maxHeight: 320 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.appOptionItem}
                        onPress={() => setSelectedApp(item)}
                      >
                        <MaterialCommunityIcons name={item.iconName as any} size={24} color={theme.colors.parentAccent} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.appOptionTitle}>{item.appName}</Text>
                          <Text style={styles.appOptionCategory}>{item.category}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  />
                </>
              ) : (
                <View style={styles.formContainer}>
                  <View style={styles.selectedAppHeader}>
                    <MaterialCommunityIcons name={selectedApp.iconName as any} size={36} color={theme.colors.parentAccent} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.selectedAppName}>{selectedApp.appName}</Text>
                      <Text style={styles.selectedAppPkg}>{selectedApp.category}</Text>
                    </View>
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Bloquear aplicación por completo</Text>
                    <Switch
                      value={isBlocked}
                      onValueChange={setIsBlocked}
                      thumbColor={isBlocked ? theme.colors.danger : theme.colors.success}
                      trackColor={{ false: '#334155', true: 'rgba(239, 68, 68, 0.4)' }}
                    />
                  </View>

                  {!isBlocked && (
                    <View style={styles.sliderBox}>
                      <Text style={styles.sliderLabel}>Límite diario: {timeLimitMinutes} minutos</Text>
                      <View style={styles.presetRow}>
                        {[15, 30, 45, 60, 90, 120].map((min) => (
                          <TouchableOpacity
                            key={min}
                            style={[
                              styles.presetBtn,
                              timeLimitMinutes === min && styles.presetBtnActive,
                            ]}
                            onPress={() => setTimeLimitMinutes(min)}
                          >
                            <Text style={[styles.presetText, timeLimitMinutes === min && styles.presetTextActive]}>
                              {min}m
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveRule}
                    disabled={savingRule}
                  >
                    {savingRule ? (
                      <ActivityIndicator size="small" color={theme.colors.white} />
                    ) : (
                      <Text style={styles.saveBtnText}>Guardar Regla</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* ── MODAL: CONFIGURAR RANGO DE HORAS (BEDTIME / ESCUELA) ── */}
        <Modal visible={scheduleModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.scheduleEditCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingScheduleType === 'school'
                    ? 'Horario de Bloqueo Escolar'
                    : 'Horario de Modo Descanso'}
                </Text>
                <TouchableOpacity onPress={() => setScheduleModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.scheduleEditDesc}>
                Define las horas de inicio y fin para que el bloqueo se aplique automáticamente
                sin necesidad de intervención manual.
              </Text>

              {/* Time inputs */}
              <View style={styles.timeInputsRow}>
                <View style={styles.timeInputCol}>
                  <Text style={styles.timeInputLabel}>Hora de Inicio (Desde)</Text>
                  <TextInput
                    style={styles.timeTextInput}
                    value={editStartTime}
                    onChangeText={setEditStartTime}
                    placeholder="HH:MM"
                    placeholderTextColor="#64748B"
                    maxLength={5}
                  />
                </View>

                <View style={styles.timeInputCol}>
                  <Text style={styles.timeInputLabel}>Hora de Fin (Hasta)</Text>
                  <TextInput
                    style={styles.timeTextInput}
                    value={editEndTime}
                    onChangeText={setEditEndTime}
                    placeholder="HH:MM"
                    placeholderTextColor="#64748B"
                    maxLength={5}
                  />
                </View>
              </View>

              {/* Quick Presets */}
              <Text style={styles.timeInputLabel}>RANGOS SUGERIDOS RÁPIDOS</Text>
              <View style={styles.schedulePresetsRow}>
                {editingScheduleType === 'bedtime' ? (
                  <>
                    {[
                      { s: '22:00', e: '06:00', label: '22:00 a 06:00' },
                      { s: '21:30', e: '06:30', label: '21:30 a 06:30' },
                      { s: '23:00', e: '07:00', label: '23:00 a 07:00' },
                    ].map((p) => (
                      <TouchableOpacity
                        key={p.label}
                        style={[
                          styles.presetChip,
                          editStartTime === p.s && editEndTime === p.e && styles.presetChipActive,
                        ]}
                        onPress={() => {
                          setEditStartTime(p.s);
                          setEditEndTime(p.e);
                        }}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            editStartTime === p.s && editEndTime === p.e && styles.presetChipTextActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      { s: '08:00', e: '14:00', label: '08:00 a 14:00' },
                      { s: '07:30', e: '13:30', label: '07:30 a 13:30' },
                      { s: '08:00', e: '15:30', label: '08:00 a 15:30' },
                    ].map((p) => (
                      <TouchableOpacity
                        key={p.label}
                        style={[
                          styles.presetChip,
                          editStartTime === p.s && editEndTime === p.e && styles.presetChipActive,
                        ]}
                        onPress={() => {
                          setEditStartTime(p.s);
                          setEditEndTime(p.e);
                        }}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            editStartTime === p.s && editEndTime === p.e && styles.presetChipTextActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.scheduleModalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setScheduleModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { flex: 1, marginTop: 0 }]}
                  onPress={handleSaveSchedule}
                >
                  <Text style={styles.saveBtnText}>Guardar Horario</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── MODAL: DEFINIR NUEVA ZONA SEGURA (GEOFENCING) ── */}
        <Modal visible={isAddZoneModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.zoneModalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="location" size={22} color="#38BDF8" style={{ marginRight: 8 }} />
                  <Text style={styles.modalTitle}>Nueva Zona Segura</Text>
                </View>
                <TouchableOpacity onPress={() => setIsAddZoneModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.zoneModalDesc}>
                Define un punto de interés y un radio en metros para recibir alertas automáticas cuando el menor entre o salga.
              </Text>

              {/* Nombre de la zona */}
              <Text style={styles.zoneFieldLabel}>NOMBRE DEL LUGAR</Text>
              <TextInput
                style={styles.zoneTextInput}
                placeholder="Ej. Colegio San José, Casa Abuelos, Parque..."
                placeholderTextColor="#64748B"
                value={newZoneName}
                onChangeText={setNewZoneName}
              />

              {/* Dirección o referencia */}
              <Text style={styles.zoneFieldLabel}>DIRECCIÓN O REFERENCIA</Text>
              <TextInput
                style={styles.zoneTextInput}
                placeholder="Ej. Cra 7 # 170-20, Bogotá"
                placeholderTextColor="#64748B"
                value={newZoneAddress}
                onChangeText={setNewZoneAddress}
              />

              {/* Selector de Tipo */}
              <Text style={styles.zoneFieldLabel}>TIPO DE ZONA</Text>
              <View style={styles.zoneTypeSelectorRow}>
                {[
                  { type: 'home', label: '🏠 Casa' },
                  { type: 'school', label: '🏫 Colegio' },
                  { type: 'family', label: '👨‍👩‍👧 Familia' },
                  { type: 'other', label: '📍 Otro' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.zoneTypeChip,
                      newZoneType === item.type && styles.zoneTypeChipActive,
                    ]}
                    onPress={() => setNewZoneType(item.type as any)}
                  >
                    <Text
                      style={[
                        styles.zoneTypeChipText,
                        newZoneType === item.type && styles.zoneTypeChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Selector de Radio en Metros */}
              <Text style={styles.zoneFieldLabel}>
                RADIO DEL PERÍMETRO: <Text style={{ color: '#38BDF8', fontWeight: '800' }}>{newZoneRadius} METROS</Text>
              </Text>
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
                      {r >= 1000 ? '1 km' : `${r}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Botón Guardar */}
              <View style={styles.scheduleModalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsAddZoneModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { flex: 1, marginTop: 0 }]}
                  disabled={isSavingZone}
                  onPress={handleSaveNewZone}
                >
                  {isSavingZone ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Guardar en Supabase</Text>
                  )}
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
                Asigna o actualiza el PIN maestro. Este PIN es obligatorio para desinstalar o desvincular el dispositivo del hijo.
              </Text>

              <View style={styles.currentPinBanner}>
                <Text style={styles.currentPinLabel}>PIN ACTUAL:</Text>
                <Text style={styles.currentPinValue}>{adminPin}</Text>
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
      </ScrollView>
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
    marginBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  // 2x2 Grid Section Styles
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.xl,
    padding: 13,
    borderWidth: 1.5,
    marginBottom: 12,
    ...theme.shadows.card,
  },
  gridCardActive: {
    backgroundColor: '#162036',
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gridCardTitle: {
    ...theme.typography.bodyBold,
    color: '#F8FAFC',
    fontSize: 13.5,
    marginBottom: 2,
  },
  gridCardSub: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },
  appsSectionWrapper: {
    marginBottom: theme.spacing.lg,
  },
  appsSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  appsSectionNotice: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  addRuleCompactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.parentAccent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    gap: 4,
    ...theme.shadows.glowParent,
  },
  addRuleCompactBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  addIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.parentAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addRuleTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  addRuleSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  sectionHeaderTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginTop: 12,
  },
  emptySub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  rulesList: {
    gap: 12,
  },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ruleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleAppName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  ruleStatusText: {
    ...theme.typography.caption,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '500',
  },
  // Schedules Styles
  schedulesWrapper: {
    gap: 16,
  },
  scheduleCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  scheduleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  scheduleSub: {
    ...theme.typography.caption,
    color: '#38BDF8',
    marginTop: 2,
  },
  scheduleDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
  },
  // Geofencing Styles
  geofencingWrapper: {
    gap: 12,
  },
  geofencingHeader: {
    marginBottom: theme.spacing.xs,
  },
  geofencingNotice: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: -8,
    marginBottom: theme.spacing.sm,
  },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  zoneIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoneName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  zoneAddress: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  zoneRadius: {
    ...theme.typography.caption,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '600',
  },
  addZoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    marginTop: 8,
    gap: 8,
  },
  addZoneButtonText: {
    ...theme.typography.button,
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  searchInput: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  appOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  appOptionTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  appOptionCategory: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  formContainer: {
    gap: 16,
    paddingVertical: 8,
  },
  selectedAppHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedAppName: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  selectedAppPkg: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  sliderBox: {
    gap: 8,
  },
  sliderLabel: {
    ...theme.typography.bodyBold,
    color: '#38BDF8',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetBtnActive: {
    backgroundColor: theme.colors.parentAccent,
    borderColor: theme.colors.parentAccent,
  },
  presetText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  presetTextActive: {
    color: theme.colors.white,
  },
  saveBtn: {
    backgroundColor: theme.colors.parentAccent,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    ...theme.typography.button,
    color: theme.colors.white,
    fontWeight: '700',
  },
  // Automatic Schedules Enhancements
  scheduleActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
  },
  scheduleActivePillOn: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  scheduleActivePillOff: {
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  scheduleActiveText: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  editScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    marginTop: 10,
  },
  editScheduleButtonText: {
    ...theme.typography.caption,
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 12,
  },
  // Schedule Edit Modal
  scheduleEditCard: {
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    margin: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  scheduleEditDesc: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeInputCol: {
    flex: 1,
  },
  timeInputLabel: {
    ...theme.typography.caption,
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  timeTextInput: {
    backgroundColor: '#1E293B',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  schedulePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38BDF8',
  },
  presetChipText: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  scheduleModalButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cancelBtnText: {
    ...theme.typography.button,
    color: '#94A3B8',
    fontSize: 13,
  },
  // Security & Stealth Mode Styles
  securityWrapper: {
    gap: 16,
  },
  stealthCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.35)',
    ...theme.shadows.card,
  },
  stealthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  stealthIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stealthTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 15,
  },
  stealthSub: {
    ...theme.typography.caption,
    color: '#818CF8',
    marginTop: 2,
    fontSize: 11,
  },
  stealthDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
  },
  secretMethodsCard: {
    backgroundColor: '#0F172A',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  secretMethodsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  secretMethodsTitle: {
    ...theme.typography.bodyBold,
    color: '#F8FAFC',
    fontSize: 14,
  },
  secretMethodsSub: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 12,
  },
  methodBox: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  methodBadge: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  methodCode: {
    ...theme.typography.h3,
    color: '#38BDF8',
    fontSize: 20,
    letterSpacing: 1,
    marginVertical: 4,
  },
  methodExplanation: {
    ...theme.typography.caption,
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
  },
  antiUninstallCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    ...theme.shadows.card,
  },
  antiUninstallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  antiUninstallTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 15,
  },
  antiUninstallSub: {
    ...theme.typography.caption,
    color: '#94A3B8',
    marginTop: 2,
    fontSize: 11,
  },
  antiUninstallDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 12,
  },
  rulesSummaryBox: {
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  ruleSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleSummaryText: {
    ...theme.typography.caption,
    color: '#CBD5E1',
    fontSize: 11,
  },
  // Emergency Lockdown Styles
  emergencyLockCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.card,
  },
  emergencyLockCardActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderColor: '#EF4444',
  },
  emergencyLockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyBadgeRow: {
    marginBottom: 2,
  },
  emergencyBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emergencyBadgeYellow: {
    color: '#F59E0B',
  },
  emergencyBadgeRed: {
    color: '#EF4444',
  },
  emergencyLockTitle: {
    ...theme.typography.bodyBold,
    color: '#F8FAFC',
    fontSize: 16,
  },
  emergencyLockSub: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  emergencyLockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
    marginTop: 6,
  },
  emergencyLockActiveBtn: {
    backgroundColor: '#EF4444',
  },
  emergencyUnlockBtn: {
    backgroundColor: '#10B981',
  },
  emergencyLockBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  schedulesHeaderRow: {
    marginTop: 6,
    marginBottom: 12,
  },
  schedulesHeaderNotice: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  geofencingHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  supabaseSyncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  supabaseSyncPillText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  zoneRadiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  zoneRadiusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  zoneRadiusBadgeText: {
    color: '#38BDF8',
    fontSize: 10.5,
    fontWeight: '700',
  },
  zoneStatusAlert: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  zoneCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  zoneDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  zoneModalContent: {
    backgroundColor: '#0B132B',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    width: '92%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    ...theme.shadows.card,
  },
  zoneModalDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  zoneFieldLabel: {
    ...theme.typography.caption,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  zoneTextInput: {
    backgroundColor: '#1E293B',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  zoneTypeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  zoneTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  zoneTypeChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  zoneTypeChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  zoneTypeChipTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  radiusPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  radiusPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  radiusPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38BDF8',
  },
  radiusPillText: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontWeight: '600',
  },
  radiusPillTextActive: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  changePinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  changePinBtnText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
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
});
