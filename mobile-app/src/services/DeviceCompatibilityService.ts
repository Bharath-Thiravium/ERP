import {Platform, Dimensions, PixelRatio} from 'react-native';
import DeviceInfo from 'react-native-device-info';

export interface DeviceCapabilities {
  hasCamera: boolean;
  hasGPS: boolean;
  hasGyroscope: boolean;
  hasBiometrics: boolean;
  screenSize: 'small' | 'medium' | 'large';
  isTablet: boolean;
  osVersion: string;
  deviceType: string;
}

class DeviceCompatibilityService {
  private static instance: DeviceCompatibilityService;
  private capabilities: DeviceCapabilities | null = null;

  static getInstance(): DeviceCompatibilityService {
    if (!DeviceCompatibilityService.instance) {
      DeviceCompatibilityService.instance = new DeviceCompatibilityService();
    }
    return DeviceCompatibilityService.instance;
  }

  async getDeviceCapabilities(): Promise<DeviceCapabilities> {
    if (this.capabilities) {
      return this.capabilities;
    }

    const {width, height} = Dimensions.get('window');
    const screenData = Dimensions.get('screen');
    const isTablet = await DeviceInfo.isTablet();

    // Determine screen size
    const screenSize = this.getScreenSize(width, height);

    this.capabilities = {
      hasCamera: await this.checkCameraSupport(),
      hasGPS: await this.checkGPSSupport(),
      hasGyroscope: await this.checkGyroscopeSupport(),
      hasBiometrics: await this.checkBiometricSupport(),
      screenSize,
      isTablet,
      osVersion: await DeviceInfo.getSystemVersion(),
      deviceType: await DeviceInfo.getDeviceType()
    };

    return this.capabilities;
  }

  private getScreenSize(width: number, height: number): 'small' | 'medium' | 'large' {
    const pixelDensity = PixelRatio.get();
    const adjustedWidth = width * pixelDensity;
    const adjustedHeight = height * pixelDensity;
    const diagonal = Math.sqrt(adjustedWidth * adjustedWidth + adjustedHeight * adjustedHeight);

    if (diagonal < 1000) return 'small';
    if (diagonal < 1500) return 'medium';
    return 'large';
  }

  private async checkCameraSupport(): Promise<boolean> {
    try {
      return await DeviceInfo.hasSystemFeature('android.hardware.camera') || Platform.OS === 'ios';
    } catch {
      return Platform.OS === 'ios'; // Assume iOS has camera
    }
  }

  private async checkGPSSupport(): Promise<boolean> {
    try {
      return await DeviceInfo.hasSystemFeature('android.hardware.location.gps') || Platform.OS === 'ios';
    } catch {
      return true; // Most devices have GPS
    }
  }

  private async checkGyroscopeSupport(): Promise<boolean> {
    try {
      return await DeviceInfo.hasSystemFeature('android.hardware.sensor.gyroscope') || Platform.OS === 'ios';
    } catch {
      return false;
    }
  }

  private async checkBiometricSupport(): Promise<boolean> {
    try {
      return await DeviceInfo.hasSystemFeature('android.hardware.fingerprint') || Platform.OS === 'ios';
    } catch {
      return false;
    }
  }

  // Get optimized camera settings based on device
  getCameraSettings() {
    const {width} = Dimensions.get('window');
    
    if (width < 400) {
      // Low-end devices
      return {
        quality: 0.6,
        maxWidth: 1280,
        maxHeight: 960
      };
    } else if (width < 600) {
      // Mid-range devices
      return {
        quality: 0.7,
        maxWidth: 1920,
        maxHeight: 1440
      };
    } else {
      // High-end devices
      return {
        quality: 0.8,
        maxWidth: 2560,
        maxHeight: 1920
      };
    }
  }

  // Get optimized GPS settings based on device
  getGPSSettings() {
    return {
      enableHighAccuracy: true,
      timeout: Platform.OS === 'ios' ? 20000 : 15000,
      maximumAge: 10000,
      distanceFilter: 1
    };
  }

  // Check if device meets minimum requirements
  async meetsMinimumRequirements(): Promise<{meets: boolean; missing: string[]}> {
    const capabilities = await this.getDeviceCapabilities();
    const missing: string[] = [];

    if (!capabilities.hasCamera) {
      missing.push('Camera');
    }

    if (!capabilities.hasGPS) {
      missing.push('GPS/Location Services');
    }

    // Check OS version
    const osVersion = parseFloat(capabilities.osVersion);
    if (Platform.OS === 'android' && osVersion < 6.0) {
      missing.push('Android 6.0 or higher');
    } else if (Platform.OS === 'ios' && osVersion < 12.0) {
      missing.push('iOS 12.0 or higher');
    }

    return {
      meets: missing.length === 0,
      missing
    };
  }

  // Get device-specific UI adjustments
  getUIAdjustments() {
    const {width, height} = Dimensions.get('window');
    const isSmallScreen = width < 400 || height < 600;

    return {
      fontSize: {
        small: isSmallScreen ? 12 : 14,
        medium: isSmallScreen ? 14 : 16,
        large: isSmallScreen ? 16 : 18,
        xlarge: isSmallScreen ? 18 : 20
      },
      spacing: {
        small: isSmallScreen ? 8 : 12,
        medium: isSmallScreen ? 12 : 16,
        large: isSmallScreen ? 16 : 20,
        xlarge: isSmallScreen ? 20 : 24
      },
      buttonHeight: isSmallScreen ? 44 : 48,
      inputHeight: isSmallScreen ? 40 : 44
    };
  }
}

export default DeviceCompatibilityService;