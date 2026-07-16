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
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const tabMeta: Record<string, { short: string; label: string }> = {
  Home: { short: 'HM', label: 'Home' },
  Attendance: { short: 'AT', label: 'Attendance' },
  Leave: { short: 'LV', label: 'Leave' },
  Payslip: { short: 'PS', label: 'Payslip' },
  Profile: { short: 'ME', label: 'Profile' },
};

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <View
    style={[styles.tabIcon, focused && styles.tabIconActive]}
  >
    <Text style={[styles.tabIconText, focused && styles.tabIconTextActive]}>
      {tabMeta[name]?.short || name.slice(0, 2).toUpperCase()}
    </Text>
  </View>
);

const MainTabs = () => (
  <Tab.Navigator
    safeAreaInsets={{ top: 0 }}
    screenOptions={({ route }) => ({
      tabBarPosition: 'top',
      tabBarIcon: ({ focused }) => (
        <TabIcon name={route.name} focused={focused} />
      ),
      tabBarLabel: tabMeta[route.name]?.label || route.name,
      tabBarActiveTintColor: '#4f46e5',
      tabBarInactiveTintColor: '#64748b',
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '800',
        marginTop: 2,
      },
      tabBarLabelPosition: 'below-icon',
      tabBarItemStyle: { minWidth: 0, paddingHorizontal: 0 },
      tabBarStyle: {
        minHeight: 70,
        paddingTop: 6,
        paddingBottom: 6,
        backgroundColor: '#ffffff',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e2e8f0',
        elevation: 4,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      tabBarHideOnKeyboard: true,
      sceneStyle: { backgroundColor: '#f6f8fc' },
      lazy: true,
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Provider store={store}>
        <AppNavigator />
      </Provider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabIconActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  tabIconText: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '900',
  },
  tabIconTextActive: {
    color: '#ffffff',
  },
});

export default App;
