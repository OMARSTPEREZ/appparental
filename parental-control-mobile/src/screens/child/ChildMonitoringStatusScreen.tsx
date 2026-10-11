import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ChildStackParamList } from '../../types';
import { storageService } from '../../services/storageService';
import { realtimeService } from '../../services/realtimeService';
import { supabase } from '../../config/supabase';
import { theme } from '../../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<ChildStackParamList, 'ChildMonitoringStatus'>;
};

export const ChildMonitoringStatusScreen: React.FC<Props> = ({ navigation }) => {
  const childId = 'child_mateo_01';

  // Stealth mode state
  const [isIconHidden, setIsIconHidden] = useState(false);

  // Anti-Uninstall PIN state
  const [isUninstallModalVisible, setIsUninstallModalVisible] = useState(false);
  const [uninstallPin, setUninstallPin] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isUninstallBlocked, setIsUninstallBlocked] = useState(false);

  useEffect(() => {
    storageService.getAppIconHidden().then((hidden) => {
      setIsIconHidden(hidden);
    });
  }, []);

  const handleStartUninstallFlow = () => {
    if (isUninstallBlocked) {
      Alert.alert(
        'Acción Bloqueada',
        'Se han superado los 3 intentos fallidos de PIN. Esta función está temporalmente inhabilitada por seguridad parental.'
      );
      return;
    }
    setUninstallPin('');
    setIsUninstallModalVisible(true);
  };

  const handleVerifyUninstallPin = async () => {
    if (isUninstallBlocked) {
      Alert.alert('Acción Bloqueada', 'Has excedido el número de intentos permitidos.');
      return;
    }

    if (uninstallPin === '0000') {
      setIsUninstallModalVisible(false);
      setUninstallPin('');
      setFailedAttempts(0);

      Alert.alert(
        'PIN Confirmado',
        '¿Estás seguro de que deseas desvincular y desinstalar la supervisión de Kibbo de este dispositivo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desvincular',
            style: 'destructive',
            onPress: async () => {
              await storageService.saveUserRole(null);
              // @ts-ignore
              navigation.getParent()?.replace('RoleSelection');
            },
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
              'Intento no autorizado de desinstalación en el dispositivo del menor. Se ingresó un PIN erróneo más de 3 veces.',
          });
          await realtimeService.sendCommand(childId, 'SOS_ALERT', {
            reason: 'UNAUTHORIZED_UNINSTALL_ATTEMPT',
          });
        } catch (err) {
          console.warn('Error reporting failed uninstall attempt:', err);
        }

        Alert.alert(
          '🚨 Acción Bloqueada',
          'Has ingresado un PIN erróneo más de 3 veces. Se ha registrado una alerta prioritaria y tus padres han sido notificados.'
        );
      } else {
        Alert.alert(
          'PIN Incorrecto',
          `El PIN ingresado no es válido. Te quedan ${
            3 - nextAttempts
          } ${3 - nextAttempts === 1 ? 'intento' : 'intentos'} antes del bloqueo.`
        );
      }
    }
  };

  const permissions = [
    {
      id: 'p1',
      title: 'Geolocalización GPS',
      desc: 'Transmisión periódica de ubicación para seguridad y geofencing',
      status: 'Activo',
      icon: 'map-marker-check',
      isOk: true,
    },
    {
      id: 'p2',
      title: 'Servicio de Accesibilidad',
      desc: 'Supervisión de aplicaciones, límites de pantalla y bloqueos',
      status: 'Activo',
      icon: 'shield-check',
      isOk: true,
    },
    {
      id: 'p3',
      title: 'Cámara y Multimedia',
      desc: 'Transmisión remota de pantalla y verificación ambiental',
      status: 'Activo',
      icon: 'camera-check',
      isOk: true,
    },
    {
      id: 'p4',
      title: 'Modo Sigiloso (Icono Oculto)',
      desc: isIconHidden
        ? 'El icono está oculto del cajón de apps de Android'
        : 'Icono visible en el cajón de aplicaciones',
      status: isIconHidden ? 'Oculto' : 'Visible',
      icon: isIconHidden ? 'eye-off' : 'eye',
      isOk: true,
    },
    {
      id: 'p5',
      title: 'Protección Anti-Desinstalación',
      desc: 'Bloqueo con PIN de Administrador (máx. 3 intentos)',
      status: isUninstallBlocked ? 'Bloqueado' : 'Protegido',
      icon: 'shield-lock',
      isOk: !isUninstallBlocked,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Diagnóstico y Ajustes</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>
          Estado de servicios en segundo plano, seguridad anti-desinstalación y modo sigiloso.
        </Text>

        {/* Permissions & Services List */}
        <View style={styles.list}>
          {permissions.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemIcon}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={26}
                  color={theme.colors.childAccent}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <View
                    style={[
                      styles.badge,
                      !item.isOk && { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        !item.isOk && { color: '#EF4444' },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Secret Access Methods Card */}
        <View style={styles.secretCard}>
          <View style={styles.secretCardHeader}>
            <Ionicons name="keypad" size={22} color="#818CF8" />
            <Text style={styles.secretCardTitle}>Acceso en Modo Oculto</Text>
          </View>
          <Text style={styles.secretCardDesc}>
            Si el icono de la app está oculto, puedes acceder a este menú físicamente usando:
          </Text>
          <View style={styles.secretCodesRow}>
            <View style={styles.codePill}>
              <Text style={styles.codePillLabel}>MARCADOR:</Text>
              <Text style={styles.codePillVal}>*#54226#</Text>
            </View>
            <View style={styles.codePill}>
              <Text style={styles.codePillLabel}>URL NAVEGADOR:</Text>
              <Text style={styles.codePillVal}>kibbo://settings</Text>
            </View>
          </View>
        </View>

        {/* Dangerous Zone / Anti-Uninstall Button */}
        <View style={styles.dangerSectionCard}>
          <View style={styles.dangerHeader}>
            <MaterialCommunityIcons name="shield-alert-outline" size={22} color="#EF4444" />
            <Text style={styles.dangerTitle}>Zona de Administración</Text>
          </View>
          <Text style={styles.dangerDesc}>
            Para desinstalar o desvincular este dispositivo, se requiere el PIN de los padres.
          </Text>

          <TouchableOpacity
            style={styles.uninstallButton}
            activeOpacity={0.85}
            onPress={handleStartUninstallFlow}
          >
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.uninstallButtonText}>Desinstalar o Desvincular Dispositivo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── MODAL: PIN ANTI-DESINSTALACIÓN ── */}
      <Modal
        visible={isUninstallModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsUninstallModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-half" size={32} color="#EF4444" />
            </View>

            <Text style={styles.modalTitle}>Seguridad Anti-Desinstalación</Text>
            <Text style={styles.modalDesc}>
              Para desvincular este dispositivo, introduce el PIN de Administrador del Padre.
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
              style={styles.pinInput}
              placeholder="PIN del Padre (0000)"
              placeholderTextColor="#64748B"
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              value={uninstallPin}
              onChangeText={setUninstallPin}
              autoFocus
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setIsUninstallModalVisible(false);
                  setUninstallPin('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleVerifyUninstallPin}
              >
                <Text style={styles.confirmBtnText}>Validar PIN</Text>
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
    marginBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  list: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemIcon: {
    width: 46,
    height: 46,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  badgeText: {
    ...theme.typography.caption,
    color: theme.colors.childAccent,
    fontWeight: '700',
  },
  itemDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  // Secret Access Card
  secretCard: {
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
    marginBottom: theme.spacing.lg,
  },
  secretCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  secretCardTitle: {
    ...theme.typography.bodyBold,
    color: '#818CF8',
    fontSize: 14,
  },
  secretCardDesc: {
    ...theme.typography.caption,
    color: '#94A3B8',
    marginBottom: 10,
    lineHeight: 16,
  },
  secretCodesRow: {
    gap: 6,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'space-between',
  },
  codePillLabel: {
    ...theme.typography.caption,
    color: '#64748B',
    fontWeight: '700',
    fontSize: 10,
  },
  codePillVal: {
    ...theme.typography.bodyBold,
    color: '#38BDF8',
    fontSize: 13,
  },
  // Danger Section Card
  dangerSectionCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: theme.spacing.xl,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dangerTitle: {
    ...theme.typography.bodyBold,
    color: '#EF4444',
    fontSize: 14,
  },
  dangerDesc: {
    ...theme.typography.caption,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 16,
  },
  uninstallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
  },
  uninstallButtonText: {
    ...theme.typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: '#F8FAFC',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  modalDesc: {
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
  pinInput: {
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
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...theme.typography.button,
    color: '#94A3B8',
    fontSize: 13,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    ...theme.typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
