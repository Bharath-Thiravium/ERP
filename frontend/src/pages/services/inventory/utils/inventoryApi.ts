import { apiClient } from '../../../../lib/api';
import type {
  Category,
  Supplier,
  Warehouse,
  Product,
  StockMovement,

  InventoryDashboardStats,

} from '../types/inventoryTypes';

export const inventoryApi = {
  // Dashboard
  getDashboardStats: async (): Promise<InventoryDashboardStats> => {
    const response = await apiClient.getInventoryDashboard();
    return response.data;
  },

  // Categories
  getCategories: async (params?: any) => {
    const response = await apiClient.getInventoryCategories(params);
    return response.data;
  },

  createCategory: async (data: Partial<Category>) => {
    const response = await apiClient.createInventoryCategory(data);
    return response.data;
  },

  getCategory: async (id: number): Promise<Category> => {
    const response = await apiClient.getInventoryCategory(id);
    return response.data;
  },

  updateCategory: async (id: number, data: Partial<Category>) => {
    const response = await apiClient.updateInventoryCategory(id, data);
    return response.data;
  },

  deleteCategory: async (id: number) => {
    const response = await apiClient.deleteInventoryCategory(id);
    return response.data;
  },

  getCategoriesDropdown: async (): Promise<Category[]> => {
    const response = await apiClient.getInventoryCategoriesDropdown();
    return response.data;
  },

  // Suppliers
  getSuppliers: async (params?: any) => {
    const response = await apiClient.getInventorySuppliers(params);
    return response.data;
  },

  createSupplier: async (data: Partial<Supplier>) => {
    const response = await apiClient.createInventorySupplier(data);
    return response.data;
  },

  getSupplier: async (id: number): Promise<Supplier> => {
    const response = await apiClient.getInventorySupplier(id);
    return response.data;
  },

  updateSupplier: async (id: number, data: Partial<Supplier>) => {
    const response = await apiClient.updateInventorySupplier(id, data);
    return response.data;
  },

  deleteSupplier: async (id: number) => {
    const response = await apiClient.deleteInventorySupplier(id);
    return response.data;
  },

  getSuppliersDropdown: async (): Promise<Supplier[]> => {
    const response = await apiClient.getInventorySuppliersDropdown();
    return response.data;
  },

  // Warehouses
  getWarehouses: async (params?: any) => {
    const response = await apiClient.getInventoryWarehouses(params);
    return response.data;
  },

  createWarehouse: async (data: Partial<Warehouse>) => {
    const response = await apiClient.createInventoryWarehouse(data);
    return response.data;
  },

  getWarehouse: async (id: number): Promise<Warehouse> => {
    const response = await apiClient.getInventoryWarehouse(id);
    return response.data;
  },

  updateWarehouse: async (id: number, data: Partial<Warehouse>) => {
    const response = await apiClient.updateInventoryWarehouse(id, data);
    return response.data;
  },

  deleteWarehouse: async (id: number) => {
    const response = await apiClient.deleteInventoryWarehouse(id);
    return response.data;
  },

  getWarehousesDropdown: async (): Promise<Warehouse[]> => {
    const response = await apiClient.getInventoryWarehousesDropdown();
    return response.data;
  },

  // Products
  getProducts: async (params?: any) => {
    const response = await apiClient.getInventoryProducts(params);
    return response.data;
  },

  createProduct: async (data: Partial<Product>) => {
    const response = await apiClient.createInventoryProduct(data);
    return response.data;
  },

  getProduct: async (id: number): Promise<Product> => {
    const response = await apiClient.getInventoryProduct(id);
    return response.data;
  },

  updateProduct: async (id: number, data: Partial<Product>) => {
    const response = await apiClient.updateInventoryProduct(id, data);
    return response.data;
  },

  deleteProduct: async (id: number) => {
    const response = await apiClient.deleteInventoryProduct(id);
    return response.data;
  },

  // Stock Movements
  getStockMovements: async (params?: any) => {
    const response = await apiClient.getStockMovements(params);
    return response.data;
  },

  createStockMovement: async (data: Partial<StockMovement>) => {
    const response = await apiClient.createStockMovement(data);
    return response.data;
  },

  // Stock Alerts
  getStockAlerts: async (params?: any) => {
    const response = await apiClient.getStockAlerts(params);
    return response.data;
  },

  resolveAlert: async (id: number) => {
    const response = await apiClient.post(`/api/inventory/alerts/${id}/resolve/`, {});
    return response.data;
  },

  // Bulk Operations
  bulkUpdateProducts: async (productIds: number[], updates: Partial<Product>) => {
    const response = await apiClient.post('/api/inventory/products/bulk-update/', {
      product_ids: productIds,
      updates
    });
    return response.data;
  },



  // Export/Import
  exportProducts: async (format: 'csv' | 'excel' = 'excel') => {
    const response = await apiClient.get('/api/inventory/products/export/', { format });
    return response.data;
  },

  importProducts: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClient.post('/api/inventory/products/import/', formData);
    return response.data;
  },

  // Barcode Generation
  generateBarcode: async (productId: number) => {
    const response = await apiClient.generateInventoryProductBarcode(productId);
    return response.data;
  },

  // QR Code Generation
  generateQRCode: async (productId: number) => {
    const response = await apiClient.post(`/api/inventory/products/${productId}/generate-qr/`, {});
    return response.data;
  },

  // Low Stock Report
  getLowStockReport: async () => {
    const response = await apiClient.getInventoryLowStockReport();
    return response.data;
  },

  // Stock Valuation Report
  getStockValuationReport: async () => {
    const response = await apiClient.getInventoryStockValuationReport();
    return response.data;
  },

  // ABC Analysis Report
  getABCAnalysisReport: async () => {
    const response = await apiClient.getInventoryABCAnalysisReport();
    return response.data;
  },

  // Image Upload
  uploadProductImage: async (productId: number, imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await apiClient.post(`/api/inventory/products/${productId}/upload-image/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Aging Analysis
  getAgingAnalysisReport: async (params?: any) => {
    const response = await apiClient.get('/api/inventory/reports/aging-analysis/', params);
    return response.data;
  },

  // Dead Stock Report
  getDeadStockReport: async (days: number = 365) => {
    const response = await apiClient.get('/api/inventory/reports/dead-stock/', { days });
    return response.data;
  },

  // Product Bundles
  getProductBundles: async (params?: any) => {
    const response = await apiClient.get('/api/inventory/bundles/', params);
    return response.data;
  },

  createProductBundle: async (data: any) => {
    const response = await apiClient.post('/api/inventory/bundles/', data);
    return response.data;
  },

  getProductBundle: async (id: number) => {
    const response = await apiClient.get(`/api/inventory/bundles/${id}/`);
    return response.data;
  },

  updateProductBundle: async (id: number, data: any) => {
    const response = await apiClient.put(`/api/inventory/bundles/${id}/`, data);
    return response.data;
  },

  deleteProductBundle: async (id: number) => {
    const response = await apiClient.delete(`/api/inventory/bundles/${id}/`);
    return response.data;
  },

  // Cycle Counts
  getCycleCounts: async (params?: any) => {
    const response = await apiClient.get('/api/inventory/cycle-counts/', params);
    return response.data;
  },

  createCycleCount: async (data: any) => {
    const response = await apiClient.post('/api/inventory/cycle-counts/', data);
    return response.data;
  },

  getCycleCount: async (id: number) => {
    const response = await apiClient.get(`/api/inventory/cycle-counts/${id}/`);
    return response.data;
  },

  updateCycleCount: async (id: number, data: any) => {
    const response = await apiClient.put(`/api/inventory/cycle-counts/${id}/`, data);
    return response.data;
  },

  startCycleCount: async (id: number) => {
    const sessionKey = sessionStorage.getItem('service_session_key');
    const response = await apiClient.post(`/api/inventory/cycle-counts/${id}/start/`, {
      session_key: sessionKey
    });
    return response.data;
  },

  pauseCycleCount: async (id: number) => {
    const sessionKey = sessionStorage.getItem('service_session_key');
    const response = await apiClient.post(`/api/inventory/cycle-counts/${id}/pause/`, {
      session_key: sessionKey
    });
    return response.data;
  },

  // Purchase Orders
  getPurchaseOrders: async (params?: any) => {
    const response = await apiClient.get('/api/inventory/purchase-orders/', params);
    return response.data;
  },

  createPurchaseOrder: async (data: any) => {
    const response = await apiClient.post('/api/inventory/purchase-orders/', data);
    return response.data;
  },

  getPurchaseOrder: async (id: number) => {
    const response = await apiClient.get(`/api/inventory/purchase-orders/${id}/`);
    return response.data;
  },

  updatePurchaseOrder: async (id: number, data: any) => {
    const response = await apiClient.put(`/api/inventory/purchase-orders/${id}/`, data);
    return response.data;
  },

  deletePurchaseOrder: async (id: number) => {
    const response = await apiClient.delete(`/api/inventory/purchase-orders/${id}/`);
    return response.data;
  },

  // Inventory Audits
  getInventoryAudits: async (params?: any) => {
    const response = await apiClient.get('/api/inventory/audits/', params);
    return response.data;
  },

  createInventoryAudit: async (data: any) => {
    const response = await apiClient.post('/api/inventory/audits/', data);
    return response.data;
  },

  getInventoryAudit: async (id: number) => {
    const response = await apiClient.get(`/api/inventory/audits/${id}/`);
    return response.data;
  },

  updateInventoryAudit: async (id: number, data: any) => {
    const response = await apiClient.put(`/api/inventory/audits/${id}/`, data);
    return response.data;
  },

  deleteInventoryAudit: async (id: number) => {
    const response = await apiClient.delete(`/api/inventory/audits/${id}/`);
    return response.data;
  },

  // Analytics (using existing endpoints)
  getInventoryAnalytics: async () => {
    // This uses the dashboard endpoint for now
    const response = await apiClient.getInventoryDashboard();
    return response.data;
  },

  // Enhanced Analytics
  getAnalyticsMetrics: async () => {
    try {
      // Use existing dashboard data for analytics
      const dashboard = await apiClient.getInventoryDashboard();
      return {
        success: true,
        data: dashboard.data
      };
    } catch (error) {
      console.error('Analytics API error:', error);
      return {
        success: false,
        error: error
      };
    }
  }
};