import { apiClient as api } from '../lib/api';

// Branch Management
export interface Branch {
  id: number;
  branch_code: string;
  branch_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  country: string;
  gstin: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  is_head_office: boolean;
  created_at: string;
  updated_at: string;
}

// TDS Section
export interface TDSSection {
  id: number;
  section_code: string;
  section_name: string;
  description: string;
  individual_rate: number;
  company_rate: number;
  non_resident_rate: number;
  threshold_limit: number;
  exemption_limit: number;
}

// Reverse Charge Transaction
export interface ReverseChargeTransaction {
  id: number;
  transaction_type: string;
  supplier_name: string;
  supplier_gstin?: string;
  invoice_number: string;
  invoice_date: string;
  taxable_value: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  total_amount: number;
  branch?: number;
  branch_name?: string;
  is_filed_in_gstr2: boolean;
  gstr2_filing_date?: string;
  created_at: string;
}

// Import/Export Transaction
export interface ImportExportTransaction {
  id: number;
  transaction_type: 'import' | 'export';
  counterparty_name: string;
  counterparty_country: string;
  counterparty_address: string;
  counterparty_tax_id?: string;
  invoice_number: string;
  invoice_date: string;
  foreign_currency: string;
  foreign_amount: number;
  exchange_rate: number;
  inr_amount: number;
  bill_of_entry_number?: string;
  bill_of_entry_date?: string;
  port_code?: string;
  shipping_bill_number?: string;
  igst_rate: number;
  igst_amount: number;
  customs_duty: number;
  branch: number;
  branch_name?: string;
  is_filed_in_gstr1: boolean;
  is_filed_in_gstr2: boolean;
  created_at: string;
}

// Advanced TDS Deductee
export interface AdvancedTDSDeductee {
  id: number;
  deductee_name: string;
  deductee_type: string;
  pan_number: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  default_tds_section?: number;
  tds_section_name?: string;
  is_lower_deduction_certificate: boolean;
  lower_deduction_rate: number;
  certificate_number?: string;
  certificate_valid_from?: string;
  certificate_valid_to?: string;
  annual_threshold: number;
  current_year_payments: number;
  applicable_tds_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const multiCompanyApi = {
  // Branch Management
  getBranches: async (params?: any): Promise<{ results: Branch[] }> => {
    const response = await api.get('/api/finance/multi-company/branches/', { params });
    return response.data;
  },

  createBranch: async (data: Partial<Branch>): Promise<Branch> => {
    const response = await api.post('/api/finance/multi-company/branches/', data);
    return response.data;
  },

  getBranch: async (id: number): Promise<Branch> => {
    const response = await api.get(`/api/finance/multi-company/branches/${id}/`);
    return response.data;
  },

  updateBranch: async (id: number, data: Partial<Branch>): Promise<Branch> => {
    const response = await api.put(`/api/finance/multi-company/branches/${id}/`, data);
    return response.data;
  },

  deleteBranch: async (id: number): Promise<void> => {
    await api.delete(`/api/finance/multi-company/branches/${id}/`);
  },

  // TDS Sections
  getTDSSections: async (params?: any): Promise<{ results: TDSSection[] }> => {
    const response = await api.get('/api/finance/multi-company/tds-sections/', { params });
    return response.data;
  },

  // Reverse Charge Transactions
  getReverseChargeTransactions: async (params?: any): Promise<{ results: ReverseChargeTransaction[] }> => {
    const response = await api.get('/api/finance/multi-company/reverse-charge/', { params });
    return response.data;
  },

  createReverseChargeTransaction: async (data: Partial<ReverseChargeTransaction>): Promise<ReverseChargeTransaction> => {
    const response = await api.post('/api/finance/multi-company/reverse-charge/', data);
    return response.data;
  },

  // Import/Export Transactions
  getImportExportTransactions: async (params?: any): Promise<{ results: ImportExportTransaction[] }> => {
    const response = await api.get('/api/finance/multi-company/import-export/', { params });
    return response.data;
  },

  createImportExportTransaction: async (data: Partial<ImportExportTransaction>): Promise<ImportExportTransaction> => {
    const response = await api.post('/api/finance/multi-company/import-export/', data);
    return response.data;
  },

  // Advanced TDS Deductees
  getTDSDeductees: async (params?: any): Promise<{ results: AdvancedTDSDeductee[] }> => {
    const response = await api.get('/api/finance/multi-company/tds-deductees/', { params });
    return response.data;
  },

  createTDSDeductee: async (data: Partial<AdvancedTDSDeductee>): Promise<AdvancedTDSDeductee> => {
    const response = await api.post('/api/finance/multi-company/tds-deductees/', data);
    return response.data;
  },

  // Analytics and Calculations
  getMultiCompanyDashboard: async (): Promise<any> => {
    const response = await api.get('/api/finance/multi-company/dashboard/');
    return response.data;
  },

  calculateReverseChargeGST: async (data: {
    taxable_value: number;
    supplier_state: string;
    company_state: string;
    gst_rate: number;
  }): Promise<any> => {
    const response = await api.post('/api/finance/multi-company/calculate-reverse-charge/', data);
    return response.data;
  },

  calculateTDSAmount: async (data: {
    deductee_id: number;
    payment_amount: number;
  }): Promise<any> => {
    const response = await api.post('/api/finance/multi-company/calculate-tds/', data);
    return response.data;
  }
};