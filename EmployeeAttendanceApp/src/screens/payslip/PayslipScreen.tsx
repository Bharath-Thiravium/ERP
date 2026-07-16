import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ApiService from '../../services/ApiService';

const money = (value: any) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`;

const PayslipScreen = () => {
  const [loading, setLoading] = useState(true);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  useEffect(() => {
    loadPayslips();
  }, []);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      const response = await ApiService.getMobilePayslips();
      setPayslips(response.data.results || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading payslips...</Text>
      </View>
    );
  }

  const latest = payslips[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPayslips} />}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Payroll</Text>
        <Text style={styles.title}>Payslips</Text>
        <Text style={styles.subtitle}>View salary, deductions, and payroll status.</Text>
      </View>

      {latest ? (
        <TouchableOpacity style={styles.latestCard} onPress={() => setSelectedPayslip(latest)}>
          <Text style={styles.cardLabel}>Latest Net Salary</Text>
          <Text style={styles.netAmount}>{money(latest.net_salary)}</Text>
          <Text style={styles.meta}>{latest.payroll_cycle_name} • {latest.status}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Gross</Text>
              <Text style={styles.summaryValue}>{money(latest.gross_salary)}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Deductions</Text>
              <Text style={styles.summaryValue}>{money(latest.total_deductions)}</Text>
            </View>
          </View>
          <Text style={styles.tapHint}>Tap to view full salary breakup</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No payslips yet</Text>
          <Text style={styles.emptyText}>Payslips will appear after HR calculates payroll.</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Payslips</Text>
      {payslips.map(item => (
        <TouchableOpacity key={item.id} style={styles.payslipCard} onPress={() => setSelectedPayslip(item)}>
          <View>
            <Text style={styles.payslipTitle}>{item.payroll_cycle_name}</Text>
            <Text style={styles.payslipMeta}>Paid days {item.present_days} / {item.working_days}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.payslipAmount}>{money(item.net_salary)}</Text>
            <Text style={styles.status}>{item.status}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <Modal visible={Boolean(selectedPayslip)} transparent animationType="slide" onRequestClose={() => setSelectedPayslip(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Payslip Details</Text>
                  <Text style={styles.modalSubtitle}>{selectedPayslip?.payroll_cycle_name}</Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedPayslip(null)}>
                  <Text style={styles.closeText}>X</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalNet}>
                <Text style={styles.modalNetLabel}>Net Salary</Text>
                <Text style={styles.modalNetValue}>{money(selectedPayslip?.net_salary)}</Text>
                <Text style={styles.modalNetMeta}>{selectedPayslip?.status}</Text>
              </View>

              <View style={styles.modalGrid}>
                <View style={styles.modalMetric}>
                  <Text style={styles.summaryLabel}>Working</Text>
                  <Text style={styles.summaryValue}>{selectedPayslip?.working_days}</Text>
                </View>
                <View style={styles.modalMetric}>
                  <Text style={styles.summaryLabel}>Present</Text>
                  <Text style={styles.summaryValue}>{selectedPayslip?.present_days}</Text>
                </View>
                <View style={styles.modalMetric}>
                  <Text style={styles.summaryLabel}>Absent</Text>
                  <Text style={styles.summaryValue}>{selectedPayslip?.absent_days}</Text>
                </View>
                <View style={styles.modalMetric}>
                  <Text style={styles.summaryLabel}>Overtime</Text>
                  <Text style={styles.summaryValue}>{selectedPayslip?.overtime_hours}</Text>
                </View>
              </View>

              <View style={styles.breakupCard}>
                <Text style={styles.breakupTitle}>Earnings</Text>
                {[
                  ['Basic Salary', selectedPayslip?.basic_salary],
                  ['HRA', selectedPayslip?.hra],
                  ['Conveyance', selectedPayslip?.conveyance_allowance],
                  ['Medical', selectedPayslip?.medical_allowance],
                  ['Special Allowance', selectedPayslip?.special_allowance],
                  ['Overtime', selectedPayslip?.overtime_amount],
                  ['Bonus', selectedPayslip?.bonus],
                  ['Other Earnings', selectedPayslip?.other_earnings],
                ].map(([label, value]) => (
                  <View key={label} style={styles.breakupRow}>
                    <Text style={styles.breakupLabel}>{label}</Text>
                    <Text style={styles.breakupValue}>{money(value)}</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Gross Salary</Text>
                  <Text style={styles.totalValue}>{money(selectedPayslip?.gross_salary)}</Text>
                </View>
              </View>

              <View style={styles.breakupCard}>
                <Text style={styles.breakupTitle}>Deductions</Text>
                {[
                  ['PF', selectedPayslip?.pf_employee],
                  ['ESI', selectedPayslip?.esi_employee],
                  ['Professional Tax', selectedPayslip?.professional_tax],
                  ['TDS', selectedPayslip?.tds],
                  ['Loan', selectedPayslip?.loan_deduction],
                  ['Advance', selectedPayslip?.advance_deduction],
                  ['Other Deductions', selectedPayslip?.other_deductions],
                ].map(([label, value]) => (
                  <View key={label} style={styles.breakupRow}>
                    <Text style={styles.breakupLabel}>{label}</Text>
                    <Text style={styles.breakupValue}>{money(value)}</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Deductions</Text>
                  <Text style={styles.deductionValue}>{money(selectedPayslip?.total_deductions)}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  latestCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#dbeafe', marginBottom: 18 },
  cardLabel: { color: '#64748b', fontWeight: '800' },
  netAmount: { color: '#16a34a', fontSize: 34, fontWeight: '900', marginTop: 8 },
  meta: { color: '#64748b', marginTop: 6, textTransform: 'capitalize' },
  summaryRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  summaryBox: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 10, padding: 12 },
  summaryLabel: { color: '#64748b', fontWeight: '700' },
  summaryValue: { color: '#0f172a', fontWeight: '900', marginTop: 8 },
  tapHint: { color: '#4f46e5', fontWeight: '800', marginTop: 14 },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '900', marginBottom: 12 },
  payslipCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  payslipTitle: { color: '#0f172a', fontWeight: '900' },
  payslipMeta: { color: '#64748b', marginTop: 6 },
  right: { alignItems: 'flex-end' },
  payslipAmount: { color: '#16a34a', fontWeight: '900', fontSize: 16 },
  status: { color: '#4f46e5', backgroundColor: '#eef2ff', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 4, marginTop: 8, textTransform: 'capitalize', fontWeight: '800' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 18 },
  emptyTitle: { color: '#0f172a', fontWeight: '900', fontSize: 17 },
  emptyText: { color: '#64748b', marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  modalSubtitle: { color: '#64748b', marginTop: 4 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#334155', fontWeight: '900' },
  modalNet: { backgroundColor: '#111827', borderRadius: 22, padding: 18, marginBottom: 14 },
  modalNetLabel: { color: '#cbd5e1', fontWeight: '800' },
  modalNetValue: { color: '#22c55e', fontSize: 32, fontWeight: '900', marginTop: 8 },
  modalNetMeta: { color: '#93c5fd', marginTop: 6, textTransform: 'capitalize', fontWeight: '800' },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  modalMetric: { width: '48%', backgroundColor: '#f8fafc', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  breakupCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, padding: 14, marginBottom: 14 },
  breakupTitle: { color: '#0f172a', fontSize: 17, fontWeight: '900', marginBottom: 10 },
  breakupRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  breakupLabel: { color: '#475569' },
  breakupValue: { color: '#0f172a', fontWeight: '800' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 4 },
  totalLabel: { color: '#0f172a', fontWeight: '900' },
  totalValue: { color: '#16a34a', fontWeight: '900' },
  deductionValue: { color: '#dc2626', fontWeight: '900' },
});

export default PayslipScreen;
