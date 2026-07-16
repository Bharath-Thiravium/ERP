import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import ApiService from '../../services/ApiService';

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { employee, company } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [payslip, setPayslip] = useState<any>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsResponse, todayResponse, balancesResponse, payslipsResponse] = await Promise.allSettled([
        ApiService.getAttendanceSystemSettings(),
        ApiService.getTodayAttendance(),
        ApiService.getLeaveBalances(),
        ApiService.getMobilePayslips(),
      ]);

      if (settingsResponse.status === 'fulfilled') {
        setSettings(settingsResponse.value.data);
      }
      if (todayResponse.status === 'fulfilled') {
        setToday(todayResponse.value.data.attendance || null);
      }
      if (balancesResponse.status === 'fulfilled') {
        setBalances(balancesResponse.value.data.results || []);
      }
      if (payslipsResponse.status === 'fulfilled') {
        setPayslip((payslipsResponse.value.data.results || [])[0] || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const attendanceMode =
    settings?.system_type === 'mobile_app'
      ? 'Mobile App'
      : settings?.system_type === 'biometric'
        ? 'Biometric'
        : 'Manual Entry';

  const totalLeaveBalance = balances.reduce(
    (sum, item) => sum + Number(item.closing_balance || 0),
    0,
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading your workspace...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDashboard} />}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{company?.name}</Text>
        <Text style={styles.title}>Hi, {employee?.first_name}</Text>
        <Text style={styles.subtitle}>Your HR self-service dashboard is ready.</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Attendance Mode</Text>
          <Text style={styles.cardValue}>{attendanceMode}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today</Text>
          <Text style={styles.cardValue}>{today?.status || 'Not Marked'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Leave Balance</Text>
          <Text style={styles.cardValue}>{totalLeaveBalance}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Latest Net Salary</Text>
          <Text style={styles.cardValue}>Rs {Number(payslip?.net_salary || 0).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRow}>
          {[
            {
              route: 'Attendance',
              code: 'AT',
              title: 'Attendance',
              detail: settings?.system_type === 'mobile_app' ? 'Check in and out' : 'View your records',
              color: '#eff6ff',
            },
            { route: 'Leave', code: 'LV', title: 'Leave', detail: 'Apply and track status', color: '#f5f3ff' },
            { route: 'Payslip', code: 'PS', title: 'Payslip', detail: 'Salary and PDF', color: '#ecfdf5' },
            { route: 'Profile', code: 'ME', title: 'Profile', detail: 'Employee details', color: '#fff7ed' },
          ].map(action => (
            <TouchableOpacity
              key={action.route}
              style={[styles.actionCard, { backgroundColor: action.color }]}
              activeOpacity={0.78}
              onPress={() => navigation.navigate(action.route)}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionCode}>{action.code}</Text>
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDetail}>{action.detail}</Text>
              <Text style={styles.actionLink}>Open  &gt;</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fc' },
  content: { padding: 16, paddingBottom: 32 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f8fc' },
  loadingText: { marginTop: 10, color: '#64748b' },
  hero: { backgroundColor: '#111827', borderRadius: 16, padding: 20, marginBottom: 16 },
  eyebrow: { color: '#93c5fd', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 6 },
  subtitle: { color: '#cbd5e1', marginTop: 8, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexBasis: '47%', flexGrow: 1, minWidth: 140, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  cardLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  cardValue: { color: '#111827', fontSize: 20, fontWeight: '900', marginTop: 10 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '900', marginBottom: 12 },
  actionRow: { gap: 10, paddingRight: 4 },
  actionCard: { width: 154, minHeight: 150, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  actionIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginBottom: 12 },
  actionCode: { color: '#4f46e5', fontWeight: '900', fontSize: 10 },
  actionTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  actionDetail: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 5, flex: 1 },
  actionLink: { color: '#4f46e5', fontSize: 12, fontWeight: '800', marginTop: 10 },
});

export default HomeScreen;
