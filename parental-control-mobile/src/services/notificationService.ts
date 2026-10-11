import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Set notification handler safely
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (err) {
  console.warn('Notifications handler init note:', err);
}

export const notificationService = {
  /**
   * Request push/local notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return true;

    try {
      if (!Device.isDevice) {
        return true;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('parental-alerts', {
          name: 'Alertas de Control Parental',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366F1',
        });
      }

      return true;
    } catch (error) {
      console.warn('Notification permissions warning:', error);
      return false;
    }
  },

  /**
   * Schedule or trigger an immediate local alert notification
   */
  async sendLocalAlert(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        console.log(`[Web Notification] ${title}: ${body}`);
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Local alert warning:', error);
    }
  },
};
