import DeviceInfo from 'react-native-device-info';
import {CONFIG} from '../config/config';
import NetworkService from './NetworkService';
import OfflineService from './OfflineService';
import Toast from 'react-native-toast-message';

const BASE_URL = CONFIG.API.BASE_URL;
const networkService = NetworkService.getInstance();

interface AttendanceData {
  employee_id: string;
  action: 'checkin' | 'checkout';
  latitude: number;
  longitude: number;
  accuracy: number;
  photo?: string | null;
}

interface AttendanceRecord {
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  working_hours: number;
  overtime_hours: number;
  status: string;
  location?: string;
  attendance_method: string;
}

export const markAttendance = async (data: AttendanceData): Promise<boolean> => {
  try {
    const deviceInfo = {
      model: await DeviceInfo.getModel(),
      os: await DeviceInfo.getSystemName(),
      browser: 'React Native',
      uuid: await DeviceInfo.getUniqueId(),
    };

    const attendanceData = {
      ...data,
      device_info: deviceInfo,
      timestamp: new Date().toISOString()
    };

    // Check if online
    if (!networkService.isOnline()) {
      // Store offline and show message
      await OfflineService.storeOfflineAttendance(attendanceData);
      Toast.show({
        type: 'info',
        text1: 'Stored Offline',
        text2: 'Attendance will sync when online',
      });
      return true;
    }

    // Try to sync any pending offline data first
    await OfflineService.syncOfflineData();

    const response = await networkService.makeRequest(
      `${BASE_URL}/api/hr/employee-mobile/mark_attendance/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData),
      }
    );

    const result = await response.json();
    return result.success || false;
  } catch (error) {
    console.error('Mark attendance error:', error);
    
    // If network error, store offline
    if (error instanceof Error && error.message.includes('offline')) {
      const deviceInfo = {
        model: await DeviceInfo.getModel(),
        os: await DeviceInfo.getSystemName(),
        browser: 'React Native',
        uuid: await DeviceInfo.getUniqueId(),
      };
      
      await OfflineService.storeOfflineAttendance({
        ...data,
        device_info: deviceInfo,
        timestamp: new Date().toISOString()
      });
      
      Toast.show({
        type: 'info',
        text1: 'Stored Offline',
        text2: 'Will sync when connection is restored',
      });
      
      return true;
    }
    
    return false;
  }
};

export const getTodayAttendance = async (employeeId: string): Promise<AttendanceRecord | null> => {
  try {
    const response = await fetch(
      `${BASE_URL}/api/hr/employee-mobile/attendance_history/?employee_id=${employeeId}&limit=1`
    );
    const data = await response.json();
    
    if (data.success && data.history && data.history.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const record = data.history[0];
      
      if (record.date === today) {
        return record;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Get today attendance error:', error);
    return null;
  }
};

export const getAttendanceHistory = async (employeeId: string, limit: number = 10): Promise<AttendanceRecord[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/api/hr/employee-mobile/attendance_history/?employee_id=${employeeId}&limit=${limit}`
    );
    const data = await response.json();
    
    if (data.success && data.history) {
      return data.history;
    }
    
    return [];
  } catch (error) {
    console.error('Get attendance history error:', error);
    return [];
  }
};

export const getTodayStatus = async (employeeId: string): Promise<AttendanceRecord | null> => {
  try {
    const response = await fetch(
      `${BASE_URL}/api/hr/mobile-attendance/get_today_status/?employee_id=${employeeId}`
    );
    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error('Get today status error:', error);
    return null;
  }
};

export const getGeofenceLocations = async (sessionKey: string): Promise<any[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/api/hr/mobile-attendance/get_geofence_locations/`,
      {
        headers: {
          'Authorization': `Bearer ${sessionKey}`
        }
      }
    );
    const data = await response.json();
    
    if (data.success && data.locations) {
      return data.locations;
    }
    
    return [];
  } catch (error) {
    console.error('Get geofence locations error:', error);
    return [];
  }
};