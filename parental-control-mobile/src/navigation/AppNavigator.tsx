import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList, UserRole } from '../types';
import { RoleSelectionScreen } from '../screens/RoleSelectionScreen';
import { ParentNavigator } from './ParentNavigator';
import { ChildNavigator } from './ChildNavigator';
import { storageService } from '../services/storageService';
import { theme } from '../theme/theme';

import { supabase } from '../config/supabase';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const [initialRole, setInitialRole] = useState<UserRole | undefined>(undefined);

  useEffect(() => {
    const checkSavedRole = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          await storageService.saveParentId(data.session.user.id);
          await storageService.saveUserRole('parent');
          setInitialRole('parent');
          return;
        }
      } catch (e) {
        // ignore
      }
      const savedRole = await storageService.getUserRole();
      setInitialRole(savedRole);
    };
    checkSavedRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await storageService.saveParentId(session.user.id);
        await storageService.saveUserRole('parent');
        setInitialRole('parent');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (initialRole === undefined) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primaryLight} />
      </View>
    );
  }

  // Determine starting route based on saved role or default to RoleSelection
  const initialRoute: keyof RootStackParamList =
    initialRole === 'parent'
      ? 'ParentStack'
      : initialRole === 'child'
      ? 'ChildStack'
      : 'RoleSelection';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="ParentStack" component={ParentNavigator} />
      <Stack.Screen name="ChildStack" component={ChildNavigator} />
    </Stack.Navigator>
  );
};
