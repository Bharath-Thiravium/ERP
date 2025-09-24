import React, {createContext, useContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Employee {
  id: number;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  photo?: string;
  attendance_method: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  employee: Employee | null;
  login: (employeeId: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    checkStoredAuth();
  }, []);

  const checkStoredAuth = async () => {
    try {
      const storedEmployee = await AsyncStorage.getItem('employee_data');
      if (storedEmployee) {
        const empData = JSON.parse(storedEmployee);
        setEmployee(empData);
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Error checking stored auth:', error);
    }
  };

  const login = async (employeeId: string): Promise<boolean> => {
    try {
      // Use dynamic base URL
      const BASE_URL = __DEV__ ? 'http://10.0.2.2:8000' : 'https://your-production-domain.com';
      const response = await fetch(`${BASE_URL}/api/hr/employee-mobile/employee_login/?employee_id=${employeeId}`);
      const data = await response.json();
      
      if (data.success) {
        setEmployee(data.employee);
        setIsLoggedIn(true);
        await AsyncStorage.setItem('employee_data', JSON.stringify(data.employee));
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    setEmployee(null);
    setIsLoggedIn(false);
    await AsyncStorage.removeItem('employee_data');
  };

  return (
    <AuthContext.Provider value={{isLoggedIn, employee, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};