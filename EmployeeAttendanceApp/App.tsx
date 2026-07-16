import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store, RootState } from './src/store';
import { loginSuccess, logout } from './src/store/slices/authSlice';
import ApiService from './src/services/ApiService';
import LoginScreen from './src/screens/auth/LoginScreen';
import HomeScreen from './src/screens/home/HomeScreen';
import AttendanceScreen from './src/screens/attendance/AttendanceScreen';
import LeaveScreen from './src/screens/leave/LeaveScreen';
import PayslipScreen from './src/screens/payslip/PayslipScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import { Text, View } from 'react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <View
    style={{
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: focused ? '#4f46e5' : '#eef2ff',
      borderWidth: 1,
      borderColor: focused ? '#4f46e5' : '#dbeafe',
    }}
  >
    <Text style={{ color: focused ? '#fff' : '#475569', fontSize: 13, fontWeight: '900' }}>
      {name === 'Home' ? 'H' : name === 'Attendance' ? 'A' : name === 'Leave' ? 'L' : name === 'Payslip' ? 'S' : 'P'}
    </Text>
  </View>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused }) => (
        <TabIcon name={route.name} focused={focused} />
      ),
      tabBarActiveTintColor: '#3b82f6',
      tabBarInactiveTintColor: '#6b7280',
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '800',
        marginTop: 4,
      },
      tabBarStyle: {
        height: 74,
        paddingTop: 8,
        paddingBottom: 10,
        backgroundColor: '#ffffff',
        borderTopWidth: 0,
        elevation: 18,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Attendance" component={AttendanceScreen} />
    <Tab.Screen name="Leave" component={LeaveScreen} />
    <Tab.Screen name="Payslip" component={PayslipScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const sessionKey = await AsyncStorage.getItem('sessionKey');
      const employeeData = await AsyncStorage.getItem('employeeData');
      const companyData = await AsyncStorage.getItem('companyData');

      if (sessionKey && employeeData && companyData) {
        try {
          // Validate token with server
          await ApiService.validateToken();
          
          store.dispatch(loginSuccess({
            employee: JSON.parse(employeeData),
            company: JSON.parse(companyData),
            sessionKey,
          }));
        } catch (error) {
          // Token is invalid, clear local data
          console.log('Token validation failed, logging out');
          store.dispatch(logout());
          await ApiService.clearLocalData();
        }
      }
    } catch (error) {
      console.log('Error checking auth state:', error);
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
};

export default App;
