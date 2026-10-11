import React from 'react';
import { View, StyleSheet, Platform, Text, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppNavigator } from './src/navigation/AppNavigator';

const linking = {
  prefixes: ['kibbo://', 'https://kibbo.app'],
  config: {
    screens: {
      RoleSelection: 'role',
      ParentStack: {
        path: 'parent',
        screens: {
          ParentDashboard: 'dashboard',
          ParentRules: 'rules',
          ParentMonitor: 'monitor',
          NotificationHistory: 'notifications',
        },
      },
      ChildStack: {
        path: 'child',
        screens: {
          ChildDashboard: 'dashboard',
          ChildMonitoringStatus: 'settings',
          ChildQRScanner: 'qr',
        },
      },
    },
  },
};

export default function App() {
  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && width > 600;

  const content = (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );

  if (!isWebDesktop) {
    return content;
  }

  // Mobile Device Simulator Frame for PC Web preview
  return (
    <View style={styles.webBackdrop}>
      {/* Top Simulator Brand Bar */}
      <View style={styles.simulatorBar}>
        <View style={styles.brandRow}>
          <View style={styles.liveIndicator} />
          <Text style={styles.simulatorTitle}>Kiboo Mobile Emulator</Text>
        </View>
        <Text style={styles.simulatorHint}>
          Simulador Móvil Activo (395 x 820) • Pulsa F12 para modo táctil
        </Text>
      </View>

      {/* Smartphone Device Chassis */}
      <View style={styles.phoneChassis}>
        {/* Dynamic Island / Speaker */}
        <View style={styles.dynamicIsland}>
          <View style={styles.cameraLens} />
          <View style={styles.speakerGrill} />
        </View>

        {/* Smartphone Screen Viewport */}
        <View style={styles.phoneScreen}>
          {content}
        </View>

        {/* Home Indicator Bar */}
        <View style={styles.homeBarContainer}>
          <View style={styles.homeBar} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    minHeight: '100vh' as any,
    backgroundColor: '#070B14',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  simulatorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 410,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  simulatorTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  simulatorHint: {
    color: '#64748B',
    fontSize: 11,
  },
  phoneChassis: {
    width: 410,
    height: 840,
    maxHeight: '90vh' as any,
    backgroundColor: '#1E2333',
    borderRadius: 52,
    padding: 10,
    borderWidth: 3,
    borderColor: '#333A4D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.65,
    shadowRadius: 35,
    elevation: 20,
    position: 'relative',
    alignItems: 'center',
  },
  dynamicIsland: {
    position: 'absolute',
    top: 18,
    zIndex: 9999,
    width: 105,
    height: 24,
    backgroundColor: '#090D16',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cameraLens: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#1E293B',
  },
  speakerGrill: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1E293B',
  },
  phoneScreen: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 42,
    overflow: 'hidden',
  },
  homeBarContainer: {
    position: 'absolute',
    bottom: 12,
    width: '100%',
    alignItems: 'center',
    zIndex: 9999,
  },
  homeBar: {
    width: 120,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
});
