import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Employee {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  designation: string;
  profile_picture?: string;
}

interface Company {
  id: number;
  name: string;
  company_code: string;
  logo?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  employee: Employee | null;
  company: Company | null;
  sessionKey: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  employee: null,
  company: null,
  sessionKey: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ employee: Employee; company: Company; sessionKey: string }>) => {
      state.isAuthenticated = true;
      state.employee = action.payload.employee;
      state.company = action.payload.company;
      state.sessionKey = action.payload.sessionKey;
      state.loading = false;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.employee = null;
      state.company = null;
      state.sessionKey = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, clearError } = authSlice.actions;
export default authSlice.reducer;