import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import {
  setLocation,
  setFaceImage,
  markAttendanceStart,
  markAttendanceSuccess,
  markAttendanceFailure,
  setTodayAttendance,
  clearAttendanceData,
} from '../../store/slices/attendanceSlice';
import LocationService from '../../services/LocationService';
import CameraService from '../../services/CameraService';
import ApiService from '../../services/ApiService';
import InlineCamera from '../../components/InlineCamera';

const AttendanceScreen = () => {
  const dispatch = useDispatch();
  const { employee, company } = useSelector((state: RootState) => state.auth);
  const { currentLocation, faceImage, todayAttendance, loading } = useSelector((state: RootState) => state.attendance);
  
  const [showCamera, setShowCamera] = useState(false);
  const [locationStatus, setLocationStatus] = useState<{
    isValid: boolean;
    distance: number;
    message: string;
  } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    loadTodayAttendance();
    loadSettings();
    loadHistorySummary();
  }, []);

  const loadTodayAttendance = async () => {
    if (!employee) return;
    
    try {
      const response = await ApiService.getTodayAttendance();
      dispatch(setTodayAttendance(response.data.attendance || null));
    } catch (error) {
      console.log('No attendance record for today');
    }
  };

  const loadSettings = async () => {
    try {
      const response = await ApiService.getAttendanceSystemSettings();
      setSettings(response.data);
    } catch (error) {
      console.log('Attendance settings unavailable');
    }
  };

  const loadHistorySummary = async () => {
    if (!employee) return;
    try {
      const response = await ApiService.getAttendanceHistory();
      setHistoryCount(response.data.results?.length || 0);
    } catch (error) {
      setHistoryCount(0);
    }
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      // First try to get cached location for speed
      const cachedLocation = LocationService.getLastKnownLocation();
      if (cachedLocation) {
        const address = await LocationService.reverseGeocode(
          cachedLocation.latitude,
          cachedLocation.longitude
        );
        
        dispatch(setLocation({
          latitude: cachedLocation.latitude,
          longitude: cachedLocation.longitude,
          address,
        }));
        
        // Validate location against geo-fence
        await validateLocationWithGeofence(cachedLocation.latitude, cachedLocation.longitude);
        return;
      }

      // If no cached location, get fresh location
      const locationData = await LocationService.getCurrentLocation();
      const address = await LocationService.reverseGeocode(
        locationData.latitude,
        locationData.longitude
      );
      
      dispatch(setLocation({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address,
      }));
      
      // Validate location against geo-fence
      await validateLocationWithGeofence(locationData.latitude, locationData.longitude);
      
    } catch (error: any) {
      Alert.alert('Location Error', error.message);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const validateLocationWithGeofence = async (latitude: number, longitude: number) => {
    try {
      const response = await ApiService.validateLocation(latitude, longitude);
      const { isValid, distance, message } = response.data;
      
      setLocationStatus({ isValid, distance, message });
      
      if (isValid) {
        Alert.alert('✅ Location Verified', `You are within office premises (${distance}m from office)`);
      } else {
        Alert.alert('⚠️ Location Warning', message || `You are ${distance}m away from office. Attendance may be restricted.`);
      }
    } catch (error: any) {
      console.log('Location validation error:', error);
      setLocationStatus({ isValid: true, distance: 0, message: 'Location validation unavailable' });
    }
  };

  const capturePhoto = async () => {
    try {
      const imageUri = await CameraService.takeAttendancePhoto();
      handleCameraCapture(imageUri);
    } catch (error: any) {
      if (error.message !== 'User cancelled camera') {
        Alert.alert('Camera Error', error.message);
      }
    }
  };

  const handleCameraCapture = (uri: string) => {
    dispatch(setFaceImage(uri));
    Alert.alert('📷 Photo Captured', 'Face photo ready for verification');
  };

  const markAttendance = async (action: 'checkin' | 'checkout') => {
    if (!settings?.enable_mobile_app || settings?.system_type !== 'mobile_app') {
      Alert.alert('Attendance Disabled', 'HR has not enabled mobile app attendance for your company');
      return;
    }

    if (!currentLocation) {
      Alert.alert('Error', 'Please capture location first');
      return;
    }

    const faceRequired = action === 'checkin'
      ? settings?.require_face_for_checkin
      : settings?.require_face_for_checkout;
    if (faceRequired && !faceImage) {
      Alert.alert('Face Required', 'HR settings require a face photo for this action');
      return;
    }

    dispatch(markAttendanceStart());

    try {
      const formData = new FormData();
      formData.append('employee_id', employee!.employee_id);
      formData.append('action', action);
      formData.append('latitude', currentLocation.latitude.toString());
      formData.append('longitude', currentLocation.longitude.toString());
      formData.append('location_name', currentLocation.address);

      if (faceImage) {
        formData.append('face_image', {
          uri: faceImage,
          type: 'image/jpeg',
          name: 'face.jpg',
        } as any);
      }

      const response = await ApiService.markAttendance(formData);
      
      dispatch(markAttendanceSuccess(response.data.attendance));
      Alert.alert('Success', response.data.message);
      
      dispatch(clearAttendanceData());
      loadTodayAttendance();
      loadHistorySummary();
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to mark attendance';
      dispatch(markAttendanceFailure(errorMessage));
      Alert.alert('Error', errorMessage);
    }
  };

  const canCheckIn = !todayAttendance?.check_in_time;
  const canCheckOut = todayAttendance?.check_in_time && !todayAttendance?.check_out_time;
  const isMobileAttendanceEnabled = settings?.system_type === 'mobile_app' && settings?.enable_mobile_app;
  const attendanceModeLabel =
    settings?.system_type === 'biometric'
      ? 'Biometric Device'
      : settings?.system_type === 'mobile_app'
        ? 'Mobile App Location Based'
        : 'Manual Entry';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.eyebrow}>{company?.name}</Text>
          <Text style={styles.welcomeText}>Hi, {employee?.first_name}</Text>
          <Text style={styles.employeeId}>ID: {employee?.employee_id}</Text>
        </View>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{todayAttendance?.status || 'Ready'}</Text>
        </View>
      </View>

      {/* Today's Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Today</Text>
        {todayAttendance ? (
          <View style={styles.statusInfo}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Check In:</Text>
              <Text style={styles.statusValue}>
                {todayAttendance.check_in_time 
                  ? new Date(todayAttendance.check_in_time).toLocaleTimeString()
                  : 'Not checked in'
                }
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Check Out:</Text>
              <Text style={styles.statusValue}>
                {todayAttendance.check_out_time 
                  ? new Date(todayAttendance.check_out_time).toLocaleTimeString()
                  : 'Not checked out'
                }
              </Text>
            </View>
            {todayAttendance.total_hours > 0 && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Total Hours:</Text>
                <Text style={styles.statusValue}>{todayAttendance.total_hours}h</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noAttendance}>No check-in yet. Capture location to start.</Text>
        )}
      </View>

      <View style={styles.quickGrid}>
        <View style={styles.quickCard}>
          <Text style={styles.quickLabel}>Mode</Text>
          <Text style={styles.quickValue}>{attendanceModeLabel}</Text>
        </View>
        <View style={styles.quickCard}>
          <Text style={styles.quickLabel}>Geo Fence</Text>
          <Text style={styles.quickValue}>{settings?.enable_geo_fencing ? `${settings.geo_fence_radius}m` : 'Off'}</Text>
        </View>
        <View style={styles.quickCard}>
          <Text style={styles.quickLabel}>History</Text>
          <Text style={styles.quickValue}>{historyCount} days</Text>
        </View>
      </View>

      {!isMobileAttendanceEnabled && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Punch Disabled</Text>
          <Text style={styles.noAttendance}>
            Your company uses {attendanceModeLabel}. You can view attendance history here, but check-in/check-out is handled by HR or the attendance device.
          </Text>
        </View>
      )}

      {isMobileAttendanceEnabled && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Verification</Text>
            {currentLocation ? (
              <View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationText}>{currentLocation.address}</Text>
                  <Text style={styles.coordsText}>
                    {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                  </Text>
                </View>
                
                {locationStatus && (
                  <View style={[
                    styles.geofenceStatus,
                    locationStatus.isValid ? styles.geofenceValid : styles.geofenceInvalid
                  ]}>
                    <Text style={[
                      styles.geofenceText,
                      locationStatus.isValid ? styles.geofenceValidText : styles.geofenceInvalidText
                    ]}>
                      {locationStatus.message}
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity
                  style={[styles.refreshButton]}
                  onPress={getCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : (
                    <Text style={styles.refreshButtonText}>Refresh Location</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.button, isGettingLocation && styles.disabledButton]}
                onPress={getCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Get Current Location</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {(settings?.require_face_for_checkin || settings?.require_face_for_checkout) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Face Verification</Text>
              {faceImage ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: faceImage }} style={styles.capturedImage} />
                  <TouchableOpacity style={styles.retakeButton} onPress={capturePhoto}>
                    <Text style={styles.buttonText}>Retake Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.button} onPress={capturePhoto}>
                  <Text style={styles.buttonText}>Take Face Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}

      {/* Inline Camera Modal */}
      <InlineCamera
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />

      {/* Attendance Actions */}
      {isMobileAttendanceEnabled && (
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[
            styles.attendanceButton,
            styles.checkinButton,
            (!canCheckIn || !currentLocation || (locationStatus && !locationStatus.isValid)) && styles.disabledButton
          ]}
          onPress={() => markAttendance('checkin')}
          disabled={Boolean(loading || !currentLocation || !canCheckIn || (locationStatus && !locationStatus.isValid))}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.attendanceButtonText}>Check In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.attendanceButton,
            styles.checkoutButton,
            (!canCheckOut || !currentLocation) && styles.disabledButton
          ]}
          onPress={() => markAttendance('checkout')}
          disabled={loading || !currentLocation || !canCheckOut}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.attendanceButtonText}>Check Out</Text>
          )}
        </TouchableOpacity>
      </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8fc',
  },
  content: {
    paddingBottom: 24,
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#111827',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  employeeId: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 4,
  },
  heroBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: '38%',
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  statusInfo: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  noAttendance: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
  },
  quickCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  quickLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 6,
  },
  quickValue: {
    color: '#1e3a8a',
    fontSize: 15,
    fontWeight: '800',
  },
  locationInfo: {
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  locationText: {
    fontSize: 16,
    color: '#1e40af',
    fontWeight: '500',
  },
  coordsText: {
    fontSize: 14,
    color: '#3b82f6',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
  },
  capturedImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  retakeButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 12,
  },
  attendanceButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkinButton: {
    backgroundColor: '#10b981',
  },
  checkoutButton: {
    backgroundColor: '#ef4444',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  attendanceButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  geofenceStatus: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  geofenceValid: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  geofenceInvalid: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  geofenceText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  geofenceValidText: {
    color: '#166534',
  },
  geofenceInvalidText: {
    color: '#dc2626',
  },
  refreshButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  refreshButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AttendanceScreen;
