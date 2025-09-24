import AsyncStorage from '@react-native-async-storage/async-storage';
import {CONFIG} from '../config/config';

interface OfflineAttendanceData {
  id: string;
  employee_id: string;
  action: 'checkin' | 'checkout';
  latitude: number;
  longitude: number;
  accuracy: number;
  photo?: string;
  timestamp: string;
  device_info: any;
  synced: boolean;
}

const OFFLINE_ATTENDANCE_KEY = 'offline_attendance_data';
const EMPLOYEE_DATA_KEY = 'employee_data';
const LAST_SYNC_KEY = 'last_sync_timestamp';

export class OfflineService {
  // Store attendance data offline
  static async storeOfflineAttendance(data: Omit<OfflineAttendanceData, 'id' | 'synced'>): Promise<void> {
    try {
      const offlineData: OfflineAttendanceData = {
        ...data,
        id: Date.now().toString(),
        synced: false
      };

      const existingData = await this.getOfflineAttendanceData();
      existingData.push(offlineData);

      await AsyncStorage.setItem(OFFLINE_ATTENDANCE_KEY, JSON.stringify(existingData));
    } catch (error) {
      console.error('Error storing offline attendance:', error);
    }
  }

  // Get all offline attendance data
  static async getOfflineAttendanceData(): Promise<OfflineAttendanceData[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_ATTENDANCE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting offline attendance data:', error);
      return [];
    }
  }

  // Get unsynced attendance data
  static async getUnsyncedAttendanceData(): Promise<OfflineAttendanceData[]> {
    try {
      const allData = await this.getOfflineAttendanceData();
      return allData.filter(item => !item.synced);
    } catch (error) {
      console.error('Error getting unsynced data:', error);
      return [];
    }
  }

  // Mark attendance data as synced
  static async markAsSynced(id: string): Promise<void> {
    try {
      const allData = await this.getOfflineAttendanceData();
      const updatedData = allData.map(item => 
        item.id === id ? { ...item, synced: true } : item
      );

      await AsyncStorage.setItem(OFFLINE_ATTENDANCE_KEY, JSON.stringify(updatedData));
    } catch (error) {
      console.error('Error marking as synced:', error);
    }
  }

  // Clear old synced data
  static async clearOldSyncedData(): Promise<void> {
    try {
      const allData = await this.getOfflineAttendanceData();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CONFIG.APP.OFFLINE_STORAGE_DAYS);

      const filteredData = allData.filter(item => {
        const itemDate = new Date(item.timestamp);
        return !item.synced || itemDate > cutoffDate;
      });

      await AsyncStorage.setItem(OFFLINE_ATTENDANCE_KEY, JSON.stringify(filteredData));
    } catch (error) {
      console.error('Error clearing old data:', error);
    }
  }

  // Store employee data
  static async storeEmployeeData(employeeData: any): Promise<void> {
    try {
      await AsyncStorage.setItem(EMPLOYEE_DATA_KEY, JSON.stringify(employeeData));
    } catch (error) {
      console.error('Error storing employee data:', error);
    }
  }

  // Get employee data
  static async getEmployeeData(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(EMPLOYEE_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting employee data:', error);
      return null;
    }
  }

  // Update last sync timestamp
  static async updateLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    } catch (error) {
      console.error('Error updating last sync time:', error);
    }
  }

  // Get last sync timestamp
  static async getLastSyncTime(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_SYNC_KEY);
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  // Check if device is online
  static isOnline(): boolean {
    // This would be enhanced with NetInfo in a real implementation
    return true;
  }

  // Sync offline data when online
  static async syncOfflineData(): Promise<boolean> {
    try {
      if (!this.isOnline()) {
        return false;
      }

      const unsyncedData = await this.getUnsyncedAttendanceData();
      
      for (const item of unsyncedData) {
        try {
          // Attempt to sync each item
          const success = await this.syncSingleItem(item);
          if (success) {
            await this.markAsSynced(item.id);
          }
        } catch (error) {
          console.error('Error syncing item:', error);
        }
      }

      await this.updateLastSyncTime();
      await this.clearOldSyncedData();
      
      return true;
    } catch (error) {
      console.error('Error syncing offline data:', error);
      return false;
    }
  }

  // Sync a single attendance item
  private static async syncSingleItem(item: OfflineAttendanceData): Promise<boolean> {
    try {
      // This would call your actual API endpoint
      const response = await fetch(`${CONFIG.API.BASE_URL}/api/hr/employee-mobile/mark_attendance/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: item.employee_id,
          action: item.action,
          latitude: item.latitude,
          longitude: item.longitude,
          accuracy: item.accuracy,
          photo: item.photo,
          device_info: item.device_info,
          offline_timestamp: item.timestamp
        }),
      });

      const result = await response.json();
      return result.success || false;
    } catch (error) {
      console.error('Error syncing single item:', error);
      return false;
    }
  }
}

export default OfflineService;