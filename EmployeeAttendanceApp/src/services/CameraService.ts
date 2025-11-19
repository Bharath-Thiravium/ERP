import { launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';

class CameraService {
  async requestCameraPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  async takePicture(): Promise<string> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    return new Promise((resolve, reject) => {
      const options = {
        mediaType: 'photo' as MediaType,
        quality: 0.9, // Higher quality for face recognition
        includeBase64: false,
        maxWidth: 1024, // Better resolution for face detection
        maxHeight: 1024,
        cameraType: 'front' as const,
        saveToPhotos: false,
        durationLimit: 0,
        videoQuality: 'high' as const,
      };

      launchCamera(options, (response: ImagePickerResponse) => {
        if (response.didCancel) {
          reject(new Error('User cancelled camera'));
        } else if (response.errorMessage) {
          reject(new Error(response.errorMessage));
        } else if (response.assets && response.assets[0]) {
          resolve(response.assets[0].uri!);
        } else {
          reject(new Error('Failed to capture image'));
        }
      });
    });
  }

  // Quick capture for attendance (optimized settings)
  async takeAttendancePhoto(): Promise<string> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    return new Promise((resolve, reject) => {
      const options = {
        mediaType: 'photo' as MediaType,
        quality: 0.8,
        includeBase64: false,
        maxWidth: 800,
        maxHeight: 800,
        cameraType: 'front' as const,
        saveToPhotos: false,
        storageOptions: {
          skipBackup: true,
          path: 'attendance',
        },
      };

      launchCamera(options, (response: ImagePickerResponse) => {
        if (response.didCancel) {
          reject(new Error('User cancelled camera'));
        } else if (response.errorMessage) {
          reject(new Error(response.errorMessage));
        } else if (response.assets && response.assets[0]) {
          resolve(response.assets[0].uri!);
        } else {
          reject(new Error('Failed to capture image'));
        }
      });
    });
  }
}

export default new CameraService();