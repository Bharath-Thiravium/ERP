export const CONFIG = {
  // API Configuration
  API: {
    BASE_URL: __DEV__ ? 'http://10.0.2.2:8000' : 'https://your-production-domain.com',
    TIMEOUT: 15000,
    RETRY_ATTEMPTS: 3
  },
  
  // GPS Configuration
  GPS: {
    ACCURACY_THRESHOLD: 20, // meters
    TIMEOUT: 15000,
    MAXIMUM_AGE: 10000,
    ENABLE_HIGH_ACCURACY: true
  },
  
  // Camera Configuration
  CAMERA: {
    QUALITY: 0.8,
    MAX_WIDTH: 2000,
    MAX_HEIGHT: 2000,
    INCLUDE_BASE64: true
  },
  
  // Face Verification
  FACE_VERIFICATION: {
    CONFIDENCE_THRESHOLD: 0.8,
    ENABLED: true
  },
  
  // App Configuration
  APP: {
    VERSION: '1.0.0',
    AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
    OFFLINE_STORAGE_DAYS: 7
  },
  
  // Geofence Configuration
  GEOFENCE: {
    DEFAULT_RADIUS: 100, // meters
    CHECK_INTERVAL: 5000 // 5 seconds
  }
};

export default CONFIG;