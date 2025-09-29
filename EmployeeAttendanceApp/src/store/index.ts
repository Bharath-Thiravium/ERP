import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import attendanceSlice from './slices/attendanceSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    attendance: attendanceSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;