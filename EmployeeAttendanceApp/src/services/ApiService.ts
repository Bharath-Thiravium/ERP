import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.29.133:8000/api'; // Your computer's IP address

class ApiService {
  private api;

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.api.interceptors.request.use(
      async (config) => {
        console.log('🔍 API Request:', config.method?.toUpperCase(), config.url);
        console.log('🔍 Request data:', config.data);
        
        const sessionKey = await AsyncStorage.getItem('sessionKey');
        
        if (sessionKey) {
          config.headers.Authorization = `Bearer ${sessionKey}`;
        }
        
        return config;
      },
      (error) => {
        console.error('🚨 Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => {
        console.log('✅ API Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('🚨 API Error:', error.response?.status, error.response?.data || error.message);
        console.error('🚨 Error config:', error.config?.url);
        
        // Don't auto-logout on 401 for logout endpoint itself
        if (error.response?.status === 401 && !error.config?.url?.includes('/logout/')) {
          this.clearLocalData();
        }
        return Promise.reject(error);
      }
    );
  }

  // Test API connectivity
  async testConnection() {
    try {
      const response = await this.api.get('/hr/public/jobs/');
      return response;
    } catch (error) {
      console.error('🚨 Connection test failed:', error);
      throw error;
    }
  }

  // Employee login with company context
  async employeeLogin(credentials: {
    employee_id: string;
    password: string;
    device_id?: string;
  }) {
    try {
      console.log('🔍 Attempting employee login for:', credentials.employee_id);
      const response = await this.api.post('/hr/employee-login/', {
        ...credentials,
        device_id: credentials.device_id || 'mobile-app'
      });
      console.log('✅ Login successful:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Mark attendance with face and location
  async markAttendance(attendanceData: FormData) {
    return await this.api.post('/hr/attendance/mobile/', attendanceData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Get employee's attendance history
  async getAttendanceHistory(employeeId: string) {
    return await this.api.get(`/hr/attendance/?employee_id=${employeeId}`);
  }

  // Get today's attendance record
  async getTodayAttendance(employeeId: string) {
    const today = new Date().toISOString().split('T')[0];
    return await this.api.get(`/hr/attendance/records/?employee_id=${employeeId}&date=${today}`);
  }

  // Get employee profile
  async getEmployeeProfile() {
    return await this.api.get('/hr/employee/profile/');
  }

  // Get attendance dashboard stats
  async getAttendanceStats() {
    return await this.api.get('/hr/attendance/dashboard_stats/');
  }

  // Get company attendance system settings
  async getAttendanceSystemSettings() {
    return await this.api.get('/hr/attendance/system/');
  }

  // Validate location against geo-fence
  async validateLocation(latitude: number, longitude: number) {
    return await this.api.post('/hr/attendance/validate-location/', {
      latitude,
      longitude
    });
  }

  // Clear local data only
  async clearLocalData() {
    await AsyncStorage.multiRemove([
      'sessionKey',
      'employeeData',
      'companyData',
      'attendanceSettings'
    ]);
  }

  // Logout
  async logout() {
    await this.clearLocalData();
  }
}

export default new ApiService();