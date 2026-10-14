import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { storageService } from '../services/storageService';
import { theme } from '../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoleSelection'>;
};

export const RoleSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const handleSelectRole = async (role: 'parent' | 'child') => {
    await storageService.saveUserRole(role);
    if (role === 'parent') {
      navigation.replace('ParentStack');
    } else {
      navigation.replace('ChildStack');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      <View style={styles.container}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/logo.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Kibbo</Text>
          <Text style={styles.subtitle}>
            Seguridad Familiar & Control Parental Inteligente
          </Text>

          {/* Descripción de uso de la app */}
          <Text style={styles.appDescription}>
            Plataforma para supervisar la ubicación GPS en tiempo real de tus hijos, configurar horarios escolares y de sueño, limitar aplicaciones y recibir alertas de emergencia SOS.
          </Text>

          {/* Feature Highlights Pills */}
          <View style={styles.featureRow}>
            <View style={styles.featurePill}>
              <Ionicons name="location" size={12} color="#38BDF8" />
              <Text style={styles.featurePillText}>GPS en Vivo</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="time" size={12} color="#10B981" />
              <Text style={styles.featurePillText}>Límites de Uso</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="eye-off" size={12} color="#818CF8" />
              <Text style={styles.featurePillText}>Modo Sigiloso</Text>
            </View>
            <View style={styles.featurePill}>
              <Ionicons name="alert-circle" size={12} color="#EF4444" />
              <Text style={styles.featurePillText}>Alerta SOS</Text>
            </View>
          </View>
        </View>

        {/* Roles Selection Cards */}
        <View style={styles.cardsWrapper}>
          <Text style={styles.promptText}>Selecciona el perfil de este dispositivo</Text>

          {/* PARENT CARD */}
          <TouchableOpacity
            style={[styles.card, styles.parentCard]}
            activeOpacity={0.88}
            onPress={() => handleSelectRole('parent')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                <MaterialCommunityIcons
                  name="shield-account-outline"
                  size={24}
                  color={theme.colors.parentAccent}
                />
              </View>
              <View style={styles.badgeParent}>
                <Text style={styles.badgeTextParent}>MODO ADMINISTRADOR</Text>
              </View>
            </View>

            <Text style={styles.roleTitle}>Dispositivo de Padres</Text>
            <Text style={styles.roleDescription}>
              Monitorea ubicación en vivo, aprueba aplicaciones, define horarios y supervisa reglas.
            </Text>

            <View style={styles.cardFooter}>
              <Text style={[styles.enterText, { color: theme.colors.parentAccent }]}>
                Continuar como Padre / Madre
              </Text>
              <Ionicons name="arrow-forward-circle" size={20} color={theme.colors.parentAccent} />
            </View>
          </TouchableOpacity>

          {/* CHILD CARD */}
          <TouchableOpacity
            style={[styles.card, styles.childCard]}
            activeOpacity={0.88}
            onPress={() => handleSelectRole('child')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <MaterialCommunityIcons
                  name="cellphone-lock"
                  size={24}
                  color={theme.colors.childAccent}
                />
              </View>
              <View style={styles.badgeChild}>
                <Text style={styles.badgeTextChild}>MODO SUPERVISADO</Text>
              </View>
            </View>

            <Text style={styles.roleTitle}>Dispositivo del Hijo</Text>
            <Text style={styles.roleDescription}>
              Sincroniza límites saludables, botón SOS de emergencia y protección en segundo plano.
            </Text>

            <View style={styles.cardFooter}>
              <Text style={[styles.enterText, { color: theme.colors.childAccent }]}>
                Configurar dispositivo protegido
              </Text>
              <Ionicons name="arrow-forward-circle" size={20} color={theme.colors.childAccent} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="cloud-done-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.footerNote}>
            Sincronización en tiempo real con Supabase
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 2,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.borderParent,
    ...theme.shadows.card,
    overflow: 'hidden',
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.parentAccent,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 10,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  appDescription: {
    ...theme.typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 12,
    fontSize: 11.5,
    lineHeight: 15,
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  featurePillText: {
    ...theme.typography.caption,
    color: '#E2E8F0',
    fontSize: 10.5,
    fontWeight: '600',
  },
  cardsWrapper: {
    marginVertical: 4,
    gap: 8,
  },
  promptText: {
    ...theme.typography.caption,
    color: '#CBD5E1',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 12.5,
    marginBottom: 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    ...theme.shadows.card,
  },
  parentCard: {
    borderColor: theme.colors.borderParent,
  },
  childCard: {
    borderColor: theme.colors.borderChild,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeParent: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: theme.borderRadius.full,
  },
  badgeTextParent: {
    ...theme.typography.caption,
    color: theme.colors.parentAccent,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  badgeChild: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: theme.borderRadius.full,
  },
  badgeTextChild: {
    ...theme.typography.caption,
    color: theme.colors.childAccent,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  roleTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 3,
  },
  roleDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  enterText: {
    ...theme.typography.caption,
    fontWeight: '700',
    fontSize: 12.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 2,
  },
  footerNote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
});
