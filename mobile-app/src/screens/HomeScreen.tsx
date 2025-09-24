import React, {useState, useEffect} from 'react';
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
import {useAuth} from '../context/AuthContext';
import {requestLocationPermission, getCurrentLocation} from '../services/LocationService';
import {requestCameraPermission, takePhoto} from '../services/CameraService';
import {markAttendance, getTodayStatus} from '../services/AttendanceService';
import Toast from 'react-native-toast-message';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface TodayRecord {
  check_in_time?: string;
  check_out_time?: string;
  working_hours: number;
  status: string;
}

const HomeScreen = () => {
  const {employee} = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<'not_marked' | 'checked_in' | 'checked_out'>('not_marked');
  const [todayRecord, setTodayRecord] = useState<TodayRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await getLocation();
    await checkTodayAttendance();
  };

  const getLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      const locationData = await getCurrentLocation();
      if (locationData) {
        setLocation(locationData);
      }
    }
  };

  const checkTodayAttendance = async () => {
    if (employee) {
      const record = await getTodayStatus(employee.employee_id);
      if (record) {
        setTodayRecord(record);
        if (record.has_checked_out) {
          setAttendanceStatus('checked_out');
        } else if (record.has_checked_in) {
          setAttendanceStatus('checked_in');
        } else {
          setAttendanceStatus('not_marked');
        }
      }
    }
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (hasPermission) {
      const photo = await takePhoto();
      if (photo) {
        setPhotoUri(photo.uri);
      }
    }
  };

  const handleMarkAttendance = async (action: 'checkin' | 'checkout') => {
    if (!location) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Location not available. Please enable GPS.',
      });
      return;
    }

    if (action === 'checkin' && !photoUri) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Photo required for check-in',
      });
      return;
    }

    if (!employee) return;

    setIsLoading(true);
    const success = await markAttendance({
      employee_id: employee.employee_id,
      action,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      photo: photoUri,
    });

    setIsLoading(false);

    if (success) {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `${action === 'checkin' ? 'Check-in' : 'Check-out'} successful`,
      });
      setAttendanceStatus(action === 'checkin' ? 'checked_in' : 'checked_out');
      await checkTodayAttendance();
      if (action === 'checkin') {
        setPhotoUri(null);
      }
    }
  };

  if (!employee) return null;

  return (
    <ScrollView style={styles.container}>
      {/* Employee Info */}
      <View style={styles.header}>
        <View style={styles.employeeCard}>
          <View style={styles.avatar}>
            {employee.photo ? (
              <Image source={{uri: employee.photo}} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{employee.full_name.charAt(0)}</Text>
            )}
          </View>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>{employee.full_name}</Text>
            <Text style={styles.employeeId}>ID: {employee.employee_id}</Text>
            <Text style={styles.employeeRole}>Field Employee</Text>
          </View>
        </View>
      </View>

      {/* Today's Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Attendance</Text>
        <View style={styles.statusCard}>
          {todayRecord ? (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Check In:</Text>
                <Text style={styles.statusValue}>{todayRecord.check_in_time || 'Not marked'}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Check Out:</Text>
                <Text style={styles.statusValue}>{todayRecord.check_out_time || 'Not marked'}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Working Hours:</Text>
                <Text style={styles.statusValue}>{todayRecord.working_hours.toFixed(2)} hrs</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <View style={[styles.statusBadge, 
                  todayRecord.status === 'present' ? styles.statusPresent : styles.statusAbsent
                ]}>
                  <Text style={styles.statusBadgeText}>{todayRecord.status.toUpperCase()}</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.noRecord}>No attendance marked today</Text>
          )}
        </View>
      </View>

      {/* Location Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Status</Text>
        <View style={styles.locationCard}>
          <View style={styles.locationRow}>
            <Text style={styles.locationLabel}>GPS Status:</Text>
            <View style={[styles.locationBadge, 
              location && location.accuracy < 20 ? styles.locationGood : styles.locationPoor
            ]}>
              <Text style={styles.locationBadgeText}>
                {location && location.accuracy < 20 ? 'Good' : 'Poor'}
              </Text>
            </View>
          </View>
          {location && (
            <Text style={styles.locationAccuracy}>
              Accuracy: {location.accuracy.toFixed(1)}m
            </Text>
          )}
        </View>
      </View>

      {/* Photo Verification */}
      {attendanceStatus === 'not_marked' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Face Verification</Text>
          <View style={styles.photoCard}>
            {!photoUri ? (
              <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                <Text style={styles.photoButtonText}>📷 Take Photo</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.photoPreview}>
                <Image source={{uri: photoUri}} style={styles.photoImage} />
                <TouchableOpacity style={styles.retakeButton} onPress={() => setPhotoUri(null)}>
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Attendance Actions */}
      <View style={styles.section}>
        {attendanceStatus === 'not_marked' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.checkinButton, 
              (isLoading || !location || !photoUri) && styles.buttonDisabled
            ]}
            onPress={() => handleMarkAttendance('checkin')}
            disabled={isLoading || !location || !photoUri}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>✓ Check In</Text>
            )}
          </TouchableOpacity>
        )}

        {attendanceStatus === 'checked_in' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.checkoutButton,
              (isLoading || !location) && styles.buttonDisabled
            ]}
            onPress={() => handleMarkAttendance('checkout')}
            disabled={isLoading || !location}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>⏰ Check Out</Text>
            )}
          </TouchableOpacity>
        )}

        {attendanceStatus === 'checked_out' && (
          <View style={styles.completeCard}>
            <Text style={styles.completeIcon}>✅</Text>
            <Text style={styles.completeTitle}>Attendance Complete</Text>
            <Text style={styles.completeSubtitle}>See you tomorrow!</Text>
          </View>
        )}

        <TouchableOpacity style={styles.refreshButton} onPress={getLocation}>
          <Text style={styles.refreshButtonText}>🔄 Refresh Location</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#3B82F6',
    padding: 20,
    paddingTop: 60,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  employeeId: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  employeeRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPresent: {
    backgroundColor: '#dcfce7',
  },
  statusAbsent: {
    backgroundColor: '#fef2f2',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
  },
  noRecord: {
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  locationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationGood: {
    backgroundColor: '#dcfce7',
  },
  locationPoor: {
    backgroundColor: '#fed7aa',
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
  },
  locationAccuracy: {
    fontSize: 12,
    color: '#6b7280',
  },
  photoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoPreview: {
    alignItems: 'center',
  },
  photoImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
  retakeButton: {
    backgroundColor: '#6b7280',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  actionButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  checkinButton: {
    backgroundColor: '#10b981',
  },
  checkoutButton: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  completeCard: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  completeIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  completeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  completeSubtitle: {
    fontSize: 14,
    color: '#065f46',
  },
  refreshButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  refreshButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HomeScreen;