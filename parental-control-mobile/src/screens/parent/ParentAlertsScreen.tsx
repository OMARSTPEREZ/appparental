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
  Image,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ParentStackParamList, NotificationLog } from '../../types';
import { supabase } from '../../config/supabase';
import { realtimeService } from '../../services/realtimeService';
import { theme } from '../../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<ParentStackParamList, 'ParentAlerts'>;
  route: RouteProp<ParentStackParamList, 'ParentAlerts'>;
};

interface RiskAlert {
  id: string;
  category: 'BULLYING' | 'DROGAS' | 'CONTENIDO_SENSIBLE' | 'ACCESO_NO_PERMITIDO';
  severity: 'HIGH' | 'CRITICAL' | 'MEDIUM';
  appName: string;
  triggerPhrase: string;
  contextMessage: string;
  detectedAt: string;
}

interface ActivityEvent {
  id: string;
  type: 'APP_USAGE' | 'WEB_SEARCH' | 'SETTINGS_TAMPER';
  appName?: string;
  query?: string;
  durationMinutes?: number;
  timestamp: string;
}

interface EventScreenshot {
  id: string;
  eventTitle: string;
  appName: string;
  capturedAt: string;
  thumbnailPlaceholderColor: string;
}

export const ParentAlertsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { childId } = route.params;
  const [activeTab, setActiveTab] = useState<'RISK_ALERTS' | 'TIMELINE' | 'SCREENSHOTS'>('RISK_ALERTS');
  const [childName, setChildName] = useState<string>('Mateo');
  const [selectedScreenshot, setSelectedScreenshot] = useState<EventScreenshot | null>(null);

  // Risk Keywords detected
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([
    {
      id: 'ra_1',
      category: 'BULLYING',
      severity: 'HIGH',
      appName: 'WhatsApp',
      triggerPhrase: 'amenaza / insulto reiterado',
      contextMessage: 'Mensaje entrante de contacto desconocido con lenguaje hostil.',
      detectedAt: 'Hace 18 min',
    },
    {
      id: 'ra_2',
      category: 'CONTENIDO_SENSIBLE',
      severity: 'CRITICAL',
      appName: 'Instagram Direct',
      triggerPhrase: 'solicitud de foto privada',
      contextMessage: 'Intento de contacto en app social con solicitud de información personal.',
      detectedAt: 'Hace 2 horas',
    },
    {
      id: 'ra_3',
      category: 'ACCESO_NO_PERMITIDO',
      severity: 'MEDIUM',
      appName: 'Ajustes del Sistema',
      triggerPhrase: 'desactivación de permisos',
      contextMessage: 'Intento de modificar permisos de accesibilidad en el dispositivo.',
      detectedAt: 'Ayer 21:40',
    },
  ]);

  // Activity Timeline
  const [timelineEvents, setTimelineEvents] = useState<ActivityEvent[]>([
    {
      id: 'te_1',
      type: 'WEB_SEARCH',
      query: 'tareas de biologia celular grado 6',
      timestamp: '14:22',
    },
    {
      id: 'te_2',
      type: 'APP_USAGE',
      appName: 'YouTube',
      durationMinutes: 45,
      timestamp: '13:30 - 14:15',
    },
    {
      id: 'te_3',
      type: 'APP_USAGE',
      appName: 'WhatsApp',
      durationMinutes: 12,
      timestamp: '12:40 - 12:52',
    },
    {
      id: 'te_4',
      type: 'WEB_SEARCH',
      query: 'historia de los dinosaurios jurasico',
      timestamp: '11:15',
    },
    {
      id: 'te_5',
      type: 'SETTINGS_TAMPER',
      appName: 'Configuración Android',
      timestamp: '09:05',
    },
  ]);

  // Automatic screenshots on security triggers
  const [screenshots, setScreenshots] = useState<EventScreenshot[]>([
    {
      id: 'ss_1',
      eventTitle: 'Intento de abrir App Restringida (TikTok)',
      appName: 'TikTok',
      capturedAt: 'Hoy 14:05',
      thumbnailPlaceholderColor: '#1E293B',
    },
    {
      id: 'ss_2',
      eventTitle: 'Acceso a Ajustes de Seguridad',
      appName: 'Configuración Android',
      capturedAt: 'Hoy 09:05',
      thumbnailPlaceholderColor: '#0F172A',
    },
    {
      id: 'ss_3',
      eventTitle: 'Alerta de Palabras Clave en Mensajería',
      appName: 'WhatsApp',
      capturedAt: 'Ayer 21:40',
      thumbnailPlaceholderColor: '#1E293B',
    },
  ]);

  useEffect(() => {
    // Fetch child name from Supabase
    const fetchChild = async () => {
      try {
        const { data } = await supabase
          .from('children')
          .select('name')
          .eq('id', childId)
          .maybeSingle();
        if (data?.name) {
          setChildName(data.name);
        }
      } catch (err) {
        console.warn('Error fetching child in alerts:', err);
      }
    };
    fetchChild();

    // Listen to real-time notification alerts
    const unsub = realtimeService.subscribeToNotificationLogs(childId, (log) => {
      // Check for risk keywords
      const low = (log.message + ' ' + log.title).toLowerCase();
      const isBullying = low.includes('idiota') || low.includes('tonto') || low.includes('odio') || low.includes('pelea');
      const isSensitive = low.includes('foto') || low.includes('secreto') || low.includes('droga');

      if (isBullying || isSensitive) {
        const newAlert: RiskAlert = {
          id: `ra_${Date.now()}`,
          category: isBullying ? 'BULLYING' : 'CONTENIDO_SENSIBLE',
          severity: 'HIGH',
          appName: log.appName,
          triggerPhrase: isBullying ? 'Lenguaje hostil detectado' : 'Palabra sensible detectada',
          contextMessage: `${log.title}: ${log.message}`,
          detectedAt: 'Ahora mismo',
        };
        setRiskAlerts((prev) => [newAlert, ...prev]);
      }
    });

    return () => {
      unsub();
    };
  }, [childId]);

  const handleRequestInstantScreenshot = async () => {
    try {
      await realtimeService.sendCommand(childId, 'EVENT_SCREENSHOT', {
        reason: 'MANUAL_PARENT_REQUEST',
        timestamp: Date.now(),
      });
      Alert.alert(
        'Captura Solicitada',
        `Se envió una solicitud de captura de pantalla automática e invisible al teléfono de ${childName}.`
      );
    } catch (err) {
      console.warn('Error requesting screenshot:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Supervisión & Alertas</Text>
          <Text style={styles.headerSubtitle}>Dispositivo de {childName}</Text>
        </View>
        <TouchableOpacity
          style={styles.requestCaptureBtn}
          onPress={handleRequestInstantScreenshot}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="camera-iris" size={22} color="#38BDF8" />
        </TouchableOpacity>
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'RISK_ALERTS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('RISK_ALERTS')}
        >
          <MaterialCommunityIcons
            name="shield-alert-outline"
            size={18}
            color={activeTab === 'RISK_ALERTS' ? '#EF4444' : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'RISK_ALERTS' && { color: '#EF4444', fontWeight: '700' },
            ]}
          >
            Alertas ({riskAlerts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'TIMELINE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('TIMELINE')}
        >
          <MaterialCommunityIcons
            name="timeline-clock-outline"
            size={18}
            color={activeTab === 'TIMELINE' ? '#38BDF8' : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'TIMELINE' && { color: '#38BDF8', fontWeight: '700' },
            ]}
          >
            Línea de Tiempo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'SCREENSHOTS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('SCREENSHOTS')}
        >
          <MaterialCommunityIcons
            name="image-multiple-outline"
            size={18}
            color={activeTab === 'SCREENSHOTS' ? '#10B981' : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'SCREENSHOTS' && { color: '#10B981', fontWeight: '700' },
            ]}
          >
            Capturas
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* TAB 1: RISK ALERTS */}
        {activeTab === 'RISK_ALERTS' && (
          <View>
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={20} color="#38BDF8" />
              <Text style={styles.infoBannerText}>
                El detector de palabras clave supervisa en tiempo real notificaciones y mensajes entrantes para prevenir situaciones de riesgo.
              </Text>
            </View>

            {riskAlerts.map((alert) => (
              <View key={alert.id} style={styles.alertCard}>
                <View style={styles.alertCardTop}>
                  <View style={[styles.badgeSeverity, alert.severity === 'CRITICAL' ? styles.bgCrit : styles.bgHigh]}>
                    <Text style={styles.badgeSeverityText}>{alert.category.replace('_', ' ')}</Text>
                  </View>
                  <Text style={styles.alertTimeText}>{alert.detectedAt}</Text>
                </View>

                <View style={styles.alertAppNameRow}>
                  <Ionicons name="chatbubble-ellipses" size={16} color="#38BDF8" />
                  <Text style={styles.alertAppName}>{alert.appName}</Text>
                  <Text style={styles.triggerPhrase}>• {alert.triggerPhrase}</Text>
                </View>

                <Text style={styles.alertContextMessage}>{alert.contextMessage}</Text>
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: ACTIVITY TIMELINE */}
        {activeTab === 'TIMELINE' && (
          <View>
            <Text style={styles.sectionHeader}>Historial de Búsquedas y Uso de Apps</Text>
            {timelineEvents.map((evt, idx) => (
              <View key={evt.id} style={styles.timelineRow}>
                <View style={styles.timelineLeftTrack}>
                  <View style={styles.timelineDot} />
                  {idx < timelineEvents.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContentCard}>
                  <View style={styles.timelineContentHeader}>
                    <Text style={styles.timelineTypeTag}>
                      {evt.type === 'WEB_SEARCH' ? '🔍 Búsqueda Web' : evt.type === 'APP_USAGE' ? '📱 Uso de Aplicación' : '⚠️ Modificación de Ajustes'}
                    </Text>
                    <Text style={styles.timelineTime}>{evt.timestamp}</Text>
                  </View>
                  {evt.query && <Text style={styles.timelineQueryText}>"{evt.query}"</Text>}
                  {evt.appName && (
                    <Text style={styles.timelineAppNameText}>
                      {evt.appName} {evt.durationMinutes ? `• ${evt.durationMinutes} minutos de uso` : ''}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: EVENT SCREENSHOTS */}
        {activeTab === 'SCREENSHOTS' && (
          <View>
            <View style={styles.screenshotsIntroRow}>
              <Text style={styles.sectionHeader}>Capturas Automáticas por Evento</Text>
              <TouchableOpacity
                style={styles.requestScreenshotSmallBtn}
                onPress={handleRequestInstantScreenshot}
              >
                <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                <Text style={styles.requestScreenshotSmallText}>Tomar Captura</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.screenshotsGrid}>
              {screenshots.map((ss) => (
                <TouchableOpacity
                  key={ss.id}
                  style={styles.screenshotItem}
                  activeOpacity={0.8}
                  onPress={() => setSelectedScreenshot(ss)}
                >
                  <View style={[styles.screenshotThumb, { backgroundColor: ss.thumbnailPlaceholderColor }]}>
                    <MaterialCommunityIcons name="cellphone-screenshot" size={36} color="#38BDF8" />
                    <View style={styles.screenshotBadge}>
                      <Text style={styles.screenshotBadgeText}>{ss.appName}</Text>
                    </View>
                  </View>
                  <Text style={styles.screenshotTitle} numberOfLines={2}>{ss.eventTitle}</Text>
                  <Text style={styles.screenshotTime}>{ss.capturedAt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal Visor de Captura Ampliada */}
      <Modal
        visible={!!selectedScreenshot}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedScreenshot(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardLarge}>
            <View style={styles.modalLargeTop}>
              <Text style={styles.modalLargeTitle}>{selectedScreenshot?.eventTitle}</Text>
              <TouchableOpacity onPress={() => setSelectedScreenshot(null)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.fullScreenshotMockup}>
              <View style={styles.mockupHeader}>
                <Text style={{ color: '#94A3B8', fontSize: 11 }}>Captura Automática Cifrada • {selectedScreenshot?.capturedAt}</Text>
              </View>
              <View style={styles.mockupInnerScreen}>
                <MaterialCommunityIcons name="security" size={54} color="#38BDF8" />
                <Text style={styles.mockupInnerText}>Registro de Evento de Seguridad</Text>
                <Text style={styles.mockupSubText}>App: {selectedScreenshot?.appName}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setSelectedScreenshot(null)}
            >
              <Text style={styles.closeModalBtnText}>Cerrar Visor</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontSize: 18,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: '#38BDF8',
    fontWeight: '600',
    marginTop: 2,
  },
  requestCaptureBtn: {
    padding: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.4)',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderColor: '#38BDF8',
  },
  tabBtnText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  container: {
    padding: theme.spacing.lg,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginBottom: theme.spacing.lg,
    gap: 10,
  },
  infoBannerText: {
    ...theme.typography.caption,
    flex: 1,
    color: '#E0F2FE',
    fontSize: 12,
    lineHeight: 16,
  },
  alertCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  alertCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeSeverity: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bgCrit: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  bgHigh: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  badgeSeverityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  alertTimeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  alertAppNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  alertAppName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 14,
  },
  triggerPhrase: {
    ...theme.typography.caption,
    color: '#EF4444',
    fontWeight: '600',
  },
  alertContextMessage: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  sectionHeader: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 15,
    marginBottom: theme.spacing.md,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeftTrack: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38BDF8',
    marginTop: 6,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
    marginTop: 4,
  },
  timelineContentCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timelineContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineTypeTag: {
    ...theme.typography.caption,
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: 11,
  },
  timelineTime: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  timelineQueryText: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 13,
    marginTop: 2,
  },
  timelineAppNameText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  screenshotsIntroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  requestScreenshotSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.md,
  },
  requestScreenshotSmallText: {
    ...theme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  screenshotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  screenshotItem: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  screenshotThumb: {
    height: 100,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  screenshotBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  screenshotBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  screenshotTitle: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 11,
  },
  screenshotTime: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalCardLarge: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0F172A',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  modalLargeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalLargeTitle: {
    ...theme.typography.bodyBold,
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  fullScreenshotMockup: {
    height: 260,
    backgroundColor: '#000000',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    marginBottom: 16,
    overflow: 'hidden',
  },
  mockupHeader: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    alignItems: 'center',
  },
  mockupInnerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockupInnerText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 8,
  },
  mockupSubText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  closeModalBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  closeModalBtnText: {
    ...theme.typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
