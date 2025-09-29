import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

class LocationService {
  constructor() {
    // Start background tracking when service is created
    this.startLocationTracking();
  }

  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  async getCurrentLocation(): Promise<LocationData> {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission denied');
    }

    return new Promise((resolve, reject) => {
      // First try with cached location for speed
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          // If high accuracy fails, try with lower accuracy for speed
          Geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              });
            },
            (fallbackError) => reject(fallbackError),
            {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 30000, // Use cached location up to 30 seconds
            }
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 3000, // Reduced timeout for speed
          maximumAge: 10000,
        }
      );
    });
  }

  // Background location tracking for faster access
  private watchId: number | null = null;
  private lastKnownLocation: LocationData | null = null;

  startLocationTracking() {
    if (this.watchId) return;
    
    this.watchId = Geolocation.watchPosition(
      (position) => {
        this.lastKnownLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      },
      (error) => console.log('Background location error:', error),
      {
        enableHighAccuracy: false,
        distanceFilter: 10, // Update every 10 meters
        interval: 30000, // Update every 30 seconds
      }
    );
  }

  stopLocationTracking() {
    if (this.watchId) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  getLastKnownLocation(): LocationData | null {
    return this.lastKnownLocation;
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      const data = await response.json();
      return data.locality || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  }
}

export default new LocationService();