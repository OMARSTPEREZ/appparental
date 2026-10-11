import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChildStackParamList } from '../types';
import { ChildDashboardScreen } from '../screens/child/ChildDashboardScreen';
import { ChildQRScannerScreen } from '../screens/child/ChildQRScannerScreen';
import { ChildMonitoringStatusScreen } from '../screens/child/ChildMonitoringStatusScreen';

const Stack = createNativeStackNavigator<ChildStackParamList>();

export const ChildNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ChildDashboard"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ChildDashboard" component={ChildDashboardScreen} />
      <Stack.Screen name="ChildQRScanner" component={ChildQRScannerScreen} />
      <Stack.Screen name="ChildMonitoringStatus" component={ChildMonitoringStatusScreen} />
    </Stack.Navigator>
  );
};
