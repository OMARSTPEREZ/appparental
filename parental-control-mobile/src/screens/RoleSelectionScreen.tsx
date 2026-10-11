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
            Kibbo - Seguridad Familiar • Protección inteligente en tiempo real, límites saludables y tranquilidad familiar con Supabase
          </Text>
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
                  size={32}
                  color={theme.colors.parentAccent}
                />
              </View>
              <View style={styles.badgeParent}>
                <Text style={styles.badgeTextParent}>MODO ADMINISTRADOR</Text>
              </View>
            </View>

            <Text style={styles.roleTitle}>Dispositivo de Padres</Text>
            <Text style={styles.roleDescription}>
              Monitorea la ubicación en vivo, aprueba aplicaciones, define horarios de descanso y vincula teléfonos con código QR.
            </Text>

            <View style={styles.cardFooter}>
              <Text style={[styles.enterText, { color: theme.colors.parentAccent }]}>
                Continuar como Padre / Madre
              </Text>
              <Ionicons name="arrow-forward-circle" size={24} color={theme.colors.parentAccent} />
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
                  size={32}
                  color={theme.colors.childAccent}
                />
              </View>
              <View style={styles.badgeChild}>
                <Text style={styles.badgeTextChild}>MODO SUPERVISADO</Text>
              </View>
            </View>

            <Text style={styles.roleTitle}>Dispositivo del Hijo</Text>
            <Text style={styles.roleDescription}>
              Sincroniza límites de pantalla, activa el botón de Alerta SOS y escanea el código QR de tus padres para vincularte.
            </Text>

            <View style={styles.cardFooter}>
              <Text style={[styles.enterText, { color: theme.colors.childAccent }]}>
                Configurar dispositivo protegido
              </Text>
              <Ionicons name="arrow-forward-circle" size={24} color={theme.colors.childAccent} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="cloud-done-outline" size={16} color={theme.colors.textMuted} />
          <Text style={styles.footerNote}>
            Sincronización en tiempo real potenciada por Supabase
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderParent,
    ...theme.shadows.card,
    overflow: 'hidden',
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
    lineHeight: 22,
  },
  cardsWrapper: {
    marginVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  promptText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
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
    marginBottom: theme.spacing.md,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeParent: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  badgeTextParent: {
    ...theme.typography.caption,
    color: theme.colors.parentAccent,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeChild: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  badgeTextChild: {
    ...theme.typography.caption,
    color: theme.colors.childAccent,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  roleTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: 6,
  },
  roleDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  enterText: {
    ...theme.typography.bodyBold,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerNote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
});
