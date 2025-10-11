import { apiClient as api } from '../lib/api';

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  tax_rate: number;
}

export const financeApi = {
  getCustomers: async (): Promise<Customer[]> => {
    const response = await api.get('/finance/customers/');
    return response.data;
  },

  getProducts: async (): Promise<Product[]> => {
    const response = await api.get('/finance/products/');
    return response.data;
  },

  getInvoices: async (params?: any) => {
    const response = await api.get('/api/finance/invoices/', { params });
    return response.data;
  }
};