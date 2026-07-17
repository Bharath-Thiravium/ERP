import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://erp.athenas.co.in/api';

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
        console.log('API Request:', config.method?.toUpperCase(), config.url);
        console.log('Request data:', config.data);
        
        const sessionKey = await AsyncStorage.getItem('sessionKey');
        
        if (sessionKey) {
          config.headers.Authorization = `Bearer ${sessionKey}`;
        }
        
        return config;
      },
      (error) => {
        console.log('Request Error:', error?.message || error);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => {
        console.log('API Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.log('API Error:', error.response?.status, error.response?.data || error.message);
        console.log('Error config:', error.config?.url);
        
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
      console.log('Connection test failed:', error);
      throw error;
    }
  }

  // Employee login with company context
  async employeeLogin(credentials: {
    employee_id: string;
    password: string;
    company_code?: string;
    device_id?: string;
  }) {
    try {
      console.log('Attempting employee login for:', credentials.employee_id);
      const response = await this.api.post('/hr/employee-login/', {
        ...credentials,
        device_id: credentials.device_id || 'mobile-app'
      });
      console.log('Login successful:', response.data);
      return response;
    } catch (error: any) {
      console.log('Login failed:', error.response?.data || error.message);
      throw error;
    }
  }

  // Mark attendance with face and location
  async markAttendance(attendanceData: FormData) {
    return await this.api.post('/hr/mobile/attendance/mark/', attendanceData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Get employee's attendance history
  async getAttendanceHistory() {
    return await this.api.get('/hr/mobile/attendance/history/');
  }

  // Get today's attendance record
  async getTodayAttendance() {
    return await this.api.get('/hr/mobile/attendance/today/');
  }

  // Get employee profile
  async getEmployeeProfile() {
    return await this.api.get('/hr/mobile/me/');
  }

  // Get attendance dashboard stats
  async getAttendanceStats() {
    return await this.api.get('/hr/attendance/dashboard_stats/');
  }

  // Get company attendance system settings
  async getAttendanceSystemSettings() {
    return await this.api.get('/hr/mobile/attendance/settings/');
  }

  async getLeaveTypes() {
    return await this.api.get('/hr/mobile/leave/types/');
  }

  async getLeaveBalances() {
    return await this.api.get('/hr/mobile/leave/balances/');
  }

  async getLeaveApplications() {
    return await this.api.get('/hr/mobile/leave/applications/');
  }

  async getMobilePayslips() {
    return await this.api.get('/hr/mobile/payslips/');
  }

  async submitLeaveApplication(data: {
    leave_type: number;
    from_date: string;
    to_date: string;
    reason: string;
  }) {
    return await this.api.post('/hr/mobile/leave/applications/', data);
  }

  // Validate location against geo-fence
  async validateLocation(latitude: number, longitude: number) {
    return await this.api.post('/hr/mobile/attendance/validate-location/', {
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

  // Validate token
  async validateToken() {
    try {
      const response = await this.getEmployeeProfile();
      return response;
    } catch (error) {
      console.log('Token validation failed:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      await this.api.post('/auth/logout/');
    } catch (error) {
      console.log('Logout API call failed, clearing local data anyway');
    }
    await this.clearLocalData();
  }
}

export default new ApiService();
