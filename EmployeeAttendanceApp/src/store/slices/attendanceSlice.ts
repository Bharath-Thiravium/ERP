import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  total_hours: number;
  status: string;
  check_in_method?: string;
  check_out_method?: string;
}

interface AttendanceState {
  currentLocation: LocationData | null;
  faceImage: string | null;
  todayAttendance: AttendanceRecord | null;
  attendanceHistory: AttendanceRecord[];
  loading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  currentLocation: null,
  faceImage: null,
  todayAttendance: null,
  attendanceHistory: [],
  loading: false,
  error: null,
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setLocation: (state, action: PayloadAction<LocationData>) => {
      state.currentLocation = action.payload;
    },
    setFaceImage: (state, action: PayloadAction<string>) => {
      state.faceImage = action.payload;
    },
    markAttendanceStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    markAttendanceSuccess: (state, action: PayloadAction<AttendanceRecord>) => {
      state.todayAttendance = action.payload;
      state.loading = false;
      state.error = null;
    },
    markAttendanceFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    setTodayAttendance: (state, action: PayloadAction<AttendanceRecord | null>) => {
      state.todayAttendance = action.payload;
    },
    setAttendanceHistory: (state, action: PayloadAction<AttendanceRecord[]>) => {
      state.attendanceHistory = action.payload;
    },
    clearAttendanceData: (state) => {
      state.currentLocation = null;
      state.faceImage = null;
      state.error = null;
    },
  },
});

export const {
  setLocation,
  setFaceImage,
  markAttendanceStart,
  markAttendanceSuccess,
  markAttendanceFailure,
  setTodayAttendance,
  setAttendanceHistory,
  clearAttendanceData,
} = attendanceSlice.actions;

export default attendanceSlice.reducer;