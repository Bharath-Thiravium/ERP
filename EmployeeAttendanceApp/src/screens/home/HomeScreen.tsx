import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import ApiService from '../../services/ApiService';

const HomeScreen = () => {
  const { employee, company } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [payslip, setPayslip] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
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
  };

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
        <Text style={styles.sectionTitle}>What You Can Do</Text>
        <Text style={styles.line}>Attendance: {settings?.system_type === 'mobile_app' ? 'check in/out from phone' : 'view attendance records only'}</Text>
        <Text style={styles.line}>Leave: apply leave and track approval status</Text>
        <Text style={styles.line}>Payslip: view salary calculation after payroll is processed</Text>
        <Text style={styles.line}>Profile: check employee and company details</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef4ff' },
  content: { padding: 18, paddingBottom: 36 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eef4ff' },
  loadingText: { marginTop: 10, color: '#64748b' },
  hero: { backgroundColor: '#111827', borderRadius: 28, padding: 24, marginBottom: 18 },
  eyebrow: { color: '#93c5fd', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#cbd5e1', marginTop: 8, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#dbeafe' },
  cardLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  cardValue: { color: '#111827', fontSize: 20, fontWeight: '900', marginTop: 10 },
  section: { backgroundColor: '#fff', borderRadius: 22, padding: 18, marginTop: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '900', marginBottom: 12 },
  line: { color: '#475569', fontSize: 14, lineHeight: 24 },
});

export default HomeScreen;
