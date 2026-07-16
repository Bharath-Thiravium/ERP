export interface InvoiceProp {
  id: number;
  invoice_number: string;
  total_amount: string;
  outstanding_amount: string;
  subtotal?: string;
  tds_applicable?: boolean;
  tds_section?: string;
  tds_rate?: string | number;
  tds_cash_outstanding?: string;
  tds_amount_outstanding?: string;
}

export interface PaymentRecord {
  id: number;
  payment_number: string;
  payment_date: string;
  gross_payment_amount: string;
  net_amount_received: string;
  tds_applicable: boolean;
  tds_rate: string;
  tds_amount: string;
  tds_section: string;
  tds_deposited: boolean;
  tds_certificate_received: boolean;
  payment_method: string;
  reference_number: string;
  status: string;
  payment_type?: string;
}

export interface TDSDeposit {
  id: number;
  deposit_date: string;
  amount: string;
  challan_number: string;
  form16a_number: string;
  certificate_received: boolean;
  notes: string;
}

export const TDS_SECTIONS = [
  { value: '194C', label: '194C — Work / Contract',          rate: 2  },
  { value: '194J', label: '194J — Professional / Technical', rate: 10 },
  { value: '194I', label: '194I — Rent',                     rate: 10 },
  { value: '194H', label: '194H — Commission / Brokerage',   rate: 5  },
  { value: '194A', label: '194A — Interest',                 rate: 10 },
];

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'rtgs',          label: 'RTGS'          },
  { value: 'neft',          label: 'NEFT'          },
  { value: 'imps',          label: 'IMPS'          },
  { value: 'upi',           label: 'UPI'           },
  { value: 'cheque',        label: 'Cheque'        },
  { value: 'cash',          label: 'Cash'          },
  { value: 'other',         label: 'Other'         },
];

export const fmt = (v: string | number | undefined) =>
  parseFloat(String(v ?? 0) || '0').toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
