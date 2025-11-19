import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import ApiService from '../../services/ApiService';

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { employee, company } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await ApiService.logout();
            dispatch(logout());
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {employee?.first_name?.charAt(0)}{employee?.last_name?.charAt(0)}
          </Text>
        </View>
        <Text style={styles.name}>{employee?.first_name} {employee?.last_name}</Text>
        <Text style={styles.employeeId}>{employee?.employee_id}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Company:</Text>
          <Text style={styles.value}>{company?.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Company Code:</Text>
          <Text style={styles.value}>{company?.company_code}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Employee Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Department:</Text>
          <Text style={styles.value}>{employee?.department}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Designation:</Text>
          <Text style={styles.value}>{employee?.designation}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{employee?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mobile Features</Text>
        <View style={styles.featureRow}>
          <Text style={styles.featureLabel}>📍 GPS Tracking</Text>
          <View style={styles.featureStatus}>
            <Text style={styles.featureStatusText}>Enabled</Text>
          </View>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureLabel}>📷 Face Recognition</Text>
          <View style={styles.featureStatus}>
            <Text style={styles.featureStatusText}>Enabled</Text>
          </View>
        </View>
        <View style={styles.featureRow}>
          <Text style={styles.featureLabel}>🔒 Secure Login</Text>
          <View style={styles.featureStatus}>
            <Text style={styles.featureStatusText}>Active</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Employee Attendance App</Text>
        <Text style={styles.footerSubtext}>SAP System - Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  employeeId: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#6b7280',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  featureStatus: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  featureStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#166534',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    padding: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});

export default ProfileScreen;