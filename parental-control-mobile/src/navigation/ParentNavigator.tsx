import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ParentStackParamList } from '../types';
import { LoginScreen } from '../screens/parent/LoginScreen';
import { ParentDashboardScreen } from '../screens/parent/ParentDashboardScreen';
import { ParentLinkQRScreen } from '../screens/parent/ParentLinkQRScreen';
import { ParentRulesScreen } from '../screens/parent/ParentRulesScreen';
import { ParentMonitorScreen } from '../screens/parent/ParentMonitorScreen';
import { ParentAlertsScreen } from '../screens/parent/ParentAlertsScreen';
import { NotificationHistoryScreen } from '../screens/parent/NotificationHistoryScreen';
import { supabase } from '../config/supabase';
import { storageService } from '../services/storageService';
import { theme } from '../theme/theme';

const Stack = createNativeStackNavigator<ParentStackParamList>();

export const ParentNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Check initial Supabase active session
    const checkAuthStatus = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn('Parent auth guard check warning:', err);
        setIsAuthenticated(false);
      }
    };

    checkAuthStatus();

    // 2. Realtime listener for Supabase authentication state
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await storageService.saveParentId(session.user.id);
        await storageService.saveUserRole('parent');
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  if (isAuthenticated === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.parentAccent} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? 'ParentDashboard' : 'Login'}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ParentDashboard" component={ParentDashboardScreen} />
      <Stack.Screen name="ParentLinkQR" component={ParentLinkQRScreen} />
      <Stack.Screen name="ParentRules" component={ParentRulesScreen} />
      <Stack.Screen name="ParentMonitor" component={ParentMonitorScreen} />
      <Stack.Screen name="ParentAlerts" component={ParentAlertsScreen} />
      <Stack.Screen name="NotificationHistory" component={NotificationHistoryScreen} />
    </Stack.Navigator>
  );
};
