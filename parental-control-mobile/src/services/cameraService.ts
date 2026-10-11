import { Camera } from 'expo-camera';

export const cameraService = {
  /**
   * Request camera permissions for QR scanning and photo monitoring
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  },

  /**
   * Request microphone permission for ambient audio monitoring
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const { status } = await Camera.requestMicrophonePermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  },
};
