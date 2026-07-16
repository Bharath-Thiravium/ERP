import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiService from '../../services/ApiService';
import { useFocusEffect } from '@react-navigation/native';

type LeaveType = {
  id: number;
  name: string;
  code: string;
  days_per_year: string | number;
  is_paid: boolean;
};

type LeaveBalance = {
  id: number;
  leave_type_name: string;
  credited: string | number;
  used: string | number;
  closing_balance: string | number;
};

type LeaveApplication = {
  id: number;
  leave_type_name: string;
  from_date: string;
  to_date: string;
  total_days: string | number;
  status: string;
  reason: string;
  rejection_reason?: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const LeaveScreen = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);

  const loadLeaveData = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      const [typesResponse, balancesResponse, appsResponse] = await Promise.all([
        ApiService.getLeaveTypes(),
        ApiService.getLeaveBalances(),
        ApiService.getLeaveApplications(),
      ]);
      const types = typesResponse.data.results || [];
      setLeaveTypes(types);
      setBalances(balancesResponse.data.results || []);
      setApplications(appsResponse.data.results || []);
      if (types.length > 0) {
        setSelectedLeaveType(current => current || types[0].id);
      }
    } catch (error: any) {
      Alert.alert('Leave Data Error', error.response?.data?.error || 'Unable to load leave data');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLeaveData();
      const refreshTimer = setInterval(() => loadLeaveData(false), 20000);
      return () => clearInterval(refreshTimer);
    }, [loadLeaveData]),
  );

  const selectedType = useMemo(
    () => leaveTypes.find(item => item.id === selectedLeaveType),
    [leaveTypes, selectedLeaveType],
  );
  const totalBalance = balances.reduce((sum, item) => sum + Number(item.closing_balance || 0), 0);

  const submitLeave = async () => {
    if (leaveTypes.length === 0) {
      Alert.alert('Leave Not Ready', 'HR has not configured leave types yet');
      return;
    }
    if (!selectedLeaveType || !fromDate || !toDate || !reason.trim()) {
      Alert.alert('Missing Details', 'Select leave type, dates, and enter reason');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      Alert.alert('Invalid Date', 'Use YYYY-MM-DD format');
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      Alert.alert('Invalid Date Range', 'To date must be same as or after from date');
      return;
    }
    setSubmitting(true);
    try {
      const response = await ApiService.submitLeaveApplication({
        leave_type: selectedLeaveType,
        from_date: fromDate,
        to_date: toDate,
        reason: reason.trim(),
      });
      Alert.alert('Submitted', response.data.message || 'Leave request sent to HR');
      setReason('');
      await loadLeaveData();
    } catch (error: any) {
      Alert.alert('Leave Request Failed', error.response?.data?.error || 'Unable to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const statusStyle = (status: string) => {
    if (status === 'approved') return styles.approved;
    if (status === 'rejected') return styles.rejected;
    if (status === 'cancelled') return styles.cancelled;
    return styles.pending;
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6d28d9" />
        <Text style={styles.loadingText}>Loading leave details...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLeaveData} />}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Employee Self Service</Text>
        <Text style={styles.title}>Leave Center</Text>
        <Text style={styles.subtitle}>Apply leave, track approval, and check balance.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Balance</Text>
          <Text style={styles.balanceTotal}>{totalBalance} days</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {balances.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No balances yet</Text>
              <Text style={styles.emptyText}>Ask HR to initialize leave balances for this year.</Text>
            </View>
          ) : balances.map(balance => (
            <View key={balance.id} style={styles.balanceCard}>
              <Text style={styles.balanceName}>{balance.leave_type_name}</Text>
              <Text style={styles.balanceValue}>{balance.closing_balance}</Text>
              <Text style={styles.balanceMeta}>Used {balance.used} / Credit {balance.credited}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>New Leave Request</Text>
        <Text style={styles.label}>Leave Type</Text>
        <View style={styles.typeGrid}>
          {leaveTypes.length === 0 ? (
            <Text style={styles.helperText}>No leave types configured. Ask HR to add leave types first.</Text>
          ) : leaveTypes.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[styles.typePill, selectedLeaveType === type.id && styles.typePillActive]}
              onPress={() => setSelectedLeaveType(type.id)}
            >
              <Text style={[styles.typeText, selectedLeaveType === type.id && styles.typeTextActive]}>
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedType && (
          <Text style={styles.helperText}>
            {selectedType.is_paid ? 'Paid leave' : 'Unpaid leave'} • {selectedType.days_per_year} days/year
          </Text>
        )}

        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>From</Text>
            <TextInput style={styles.input} value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>To</Text>
            <TextInput style={styles.input} value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" />
          </View>
        </View>

        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="Tell HR why you need leave"
        />

        <TouchableOpacity
          style={[styles.submitButton, (submitting || leaveTypes.length === 0) && styles.disabled]}
          onPress={submitLeave}
          disabled={submitting || leaveTypes.length === 0}
        >
          <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit for Approval'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Requests</Text>
        {applications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No leave requests</Text>
            <Text style={styles.emptyText}>Your requests will appear here after submission.</Text>
          </View>
        ) : applications.slice(0, 8).map(application => (
          <TouchableOpacity key={application.id} style={styles.requestCard} onPress={() => setSelectedApplication(application)}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestTitle}>{application.leave_type_name}</Text>
              <Text style={[styles.statusBadge, statusStyle(application.status)]}>{application.status}</Text>
            </View>
            <Text style={styles.requestMeta}>{application.from_date} to {application.to_date} • {application.total_days} days</Text>
            <Text style={styles.requestReason}>{application.reason}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={Boolean(selectedApplication)} transparent animationType="slide" onRequestClose={() => setSelectedApplication(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Leave Request</Text>
                <Text style={styles.modalSubtitle}>{selectedApplication?.leave_type_name}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedApplication(null)}>
                <Text style={styles.closeText}>X</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={[styles.statusBadge, selectedApplication ? statusStyle(selectedApplication.status) : styles.pending]}>
                {selectedApplication?.status}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>From</Text>
              <Text style={styles.detailValue}>{selectedApplication?.from_date}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To</Text>
              <Text style={styles.detailValue}>{selectedApplication?.to_date}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Days</Text>
              <Text style={styles.detailValue}>{selectedApplication?.total_days}</Text>
            </View>
            <View style={styles.reasonBox}>
              <Text style={styles.detailLabel}>Reason</Text>
              <Text style={styles.reasonText}>{selectedApplication?.reason || 'No reason provided'}</Text>
            </View>
            {selectedApplication?.rejection_reason ? (
              <View style={styles.rejectionBox}>
                <Text style={styles.detailLabel}>HR Response</Text>
                <Text style={styles.rejectionText}>{selectedApplication.rejection_reason}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 16, paddingBottom: 32 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fb' },
  loadingText: { marginTop: 12, color: '#64748b' },
  hero: { backgroundColor: '#111827', borderRadius: 16, padding: 20, marginBottom: 16 },
  eyebrow: { color: '#a78bfa', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 6 },
  subtitle: { color: '#cbd5e1', marginTop: 8, lineHeight: 20 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  balanceTotal: { color: '#6d28d9', fontWeight: '900', backgroundColor: '#ede9fe', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  balanceCard: { width: 164, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  balanceName: { color: '#475569', fontWeight: '700' },
  balanceValue: { color: '#6d28d9', fontSize: 34, fontWeight: '900', marginTop: 10 },
  balanceMeta: { color: '#64748b', marginTop: 8, fontSize: 12 },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  typePill: { borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#fff' },
  typePillActive: { backgroundColor: '#6d28d9', borderColor: '#6d28d9' },
  typeText: { color: '#475569', fontWeight: '700' },
  typeTextActive: { color: '#fff' },
  helperText: { color: '#64748b', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, marginBottom: 14, backgroundColor: '#fff', color: '#0f172a' },
  textArea: { minHeight: 86, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#6d28d9', borderRadius: 10, alignItems: 'center', paddingVertical: 15 },
  disabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '800' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { color: '#0f172a', fontWeight: '800', marginBottom: 6 },
  emptyText: { color: '#64748b' },
  requestCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestTitle: { color: '#0f172a', fontWeight: '800', fontSize: 15 },
  statusBadge: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  pending: { backgroundColor: '#fef3c7', color: '#92400e' },
  approved: { backgroundColor: '#dcfce7', color: '#166534' },
  rejected: { backgroundColor: '#fee2e2', color: '#991b1b' },
  cancelled: { backgroundColor: '#e2e8f0', color: '#475569' },
  requestMeta: { color: '#64748b', marginTop: 8 },
  requestReason: { color: '#334155', marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  modalTitle: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  modalSubtitle: { color: '#64748b', marginTop: 4 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#334155', fontWeight: '900' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  detailLabel: { color: '#64748b', fontWeight: '800' },
  detailValue: { color: '#0f172a', fontWeight: '900' },
  reasonBox: { backgroundColor: '#f8fafc', borderRadius: 18, padding: 14, marginTop: 14 },
  reasonText: { color: '#334155', marginTop: 8, lineHeight: 20 },
  rejectionBox: { marginTop: 12, borderRadius: 12, padding: 12, backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3' },
  rejectionText: { color: '#be123c', lineHeight: 20, marginTop: 6 },
});

export default LeaveScreen;
