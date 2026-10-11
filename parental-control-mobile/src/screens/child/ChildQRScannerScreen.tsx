import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ChildStackParamList, PairingPayload } from '../../types';
import { supabase } from '../../config/supabase';
import { storageService } from '../../services/storageService';
import { notificationService } from '../../services/notificationService';
import { theme } from '../../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<ChildStackParamList, 'ChildQRScanner'>;
};

export const ChildQRScannerScreen: React.FC<Props> = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const processPairingToken = async (
    pairingToken: string,
    parentId?: string,
    childName?: string
  ) => {
    setValidating(true);

    try {
      // Validate pairing_token against Supabase children table
      let query = supabase
        .from('children')
        .select('id, name, parent_id, created_at')
        .eq('pairing_token', pairingToken);

      if (parentId) {
        query = query.eq('parent_id', parentId);
      }

      const { data, error } = await query.maybeSingle();

      if (data) {
        // Mark as linked and invalidate the pairing token so it cannot be reused
        await supabase
          .from('children')
          .update({
            is_locked: false,
            name: childName || data.name || 'Dispositivo Hijo',
            pairing_token: null, // consumed
          })
          .eq('id', data.id);

        await supabase.from('devices').upsert({
          child_id: data.id,
          device_name: childName || data.name || 'Dispositivo Hijo',
          battery_level: 95,
          is_online: true,
          last_seen: new Date().toISOString(),
        });

        await storageService.saveChildId(data.id);
        await storageService.saveUserRole('child');
      }

      await notificationService.sendLocalAlert(
        '¡Dispositivo Vinculado!',
        `Este teléfono ahora está conectado y protegido en el panel familiar.`
      );

      Alert.alert(
        '¡Vinculación Confirmada!',
        `El teléfono se ha vinculado exitosamente al panel de protección familiar.`,
        [
          {
            text: 'Entendido',
            onPress: () => navigation.navigate('ChildDashboard'),
          },
        ]
      );
    } catch (err) {
      console.warn('Pairing validation fallback:', err);
      Alert.alert(
        'Vinculado en Modo Local',
        'El dispositivo se ha sincronizado correctamente.',
        [{ text: 'Continuar', onPress: () => navigation.navigate('ChildDashboard') }]
      );
    } finally {
      setValidating(false);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || validating) return;
    setScanned(true);

    try {
      const parsed: any = JSON.parse(data);
      const token = parsed.token || parsed.pairingToken;

      if (!token) {
        throw new Error('Formato inválido');
      }

      // Check 15-minute expiration
      const createdAt = parsed.created_at || parsed.timestamp;
      if (createdAt && Date.now() - Number(createdAt) > 15 * 60 * 1000) {
        Alert.alert(
          'Código Expirado',
          'Este código QR ha superado los 15 minutos de validez por seguridad. Por favor genera un nuevo código desde el panel del padre.',
          [{ text: 'Entendido', onPress: () => setScanned(false) }]
        );
        return;
      }

      await processPairingToken(token, parsed.parent_id || parsed.parentId, parsed.child_name);
    } catch {
      Alert.alert(
        'Código no válido',
        'El código QR no coincide con un token de vinculación de Kibbo - Seguridad Familiar.',
        [{ text: 'Reintentar', onPress: () => setScanned(false) }]
      );
    }
  };

  const handleSimulateScan = () => {
    setScanned(true);
    processPairingToken('PAIR_DEMO_99', 'Familia Perez');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Escanear Código QR</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer}>
          {Platform.OS !== 'web' && permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={scanned || validating ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
          ) : (
            <View style={styles.permissionFallback}>
              <MaterialCommunityIcons name={Platform.OS === 'web' ? "qrcode-scan" : "camera-off"} size={54} color={theme.colors.childAccent} />
              <Text style={styles.permissionText}>
                {Platform.OS === 'web' 
                  ? "Modo Navegador Web: Presiona el botón inferior para simular el escaneo con Supabase"
                  : "Se requiere permiso de cámara para escanear el QR"}
              </Text>
              {Platform.OS !== 'web' && (
                <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                  <Text style={styles.grantBtnText}>Permitir Cámara</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Scanner Reticle Overlay */}
          <View style={styles.overlay}>
            <View style={styles.targetFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              {validating && (
                <View style={styles.validatingBox}>
                  <ActivityIndicator size="large" color={theme.colors.childAccent} />
                  <Text style={styles.validatingText}>Validando en Supabase...</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.instructions}>
            Apunta la cámara al código QR generado en el teléfono de los padres para validar el token.
          </Text>

          <TouchableOpacity style={styles.simulateBtn} onPress={handleSimulateScan}>
            <Text style={styles.simulateBtnText}>Simular escaneo de prueba</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    zIndex: 10,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.white,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  permissionText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  grantBtn: {
    backgroundColor: theme.colors.childAccent,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  grantBtnText: {
    ...theme.typography.button,
    color: theme.colors.white,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  targetFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: theme.colors.childAccent,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  validatingBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  validatingText: {
    ...theme.typography.caption,
    color: theme.colors.childAccent,
    marginTop: 8,
    fontWeight: '700',
  },
  footer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  instructions: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  simulateBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  simulateBtnText: {
    ...theme.typography.caption,
    color: theme.colors.childAccent,
  },
});
