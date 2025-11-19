// Inventory Service Router Integration
export { default as InventoryDashboard } from './pages/Dashboard';
export { default as InventoryProducts } from './pages/Products';
export { default as InventoryAnalytics } from './pages/Analytics';
export { default as InventoryStockMovements } from './pages/StockMovements';
export { default as InventoryAlerts } from './pages/Alerts';
export { default as InventoryPurchaseOrders } from './pages/PurchaseOrders';
export { default as InventoryAudits } from './pages/Audits';

// Components

export { default as ProductList } from './components/products/ProductList';
export { default as CategoryManager } from './components/categories/CategoryManager';
export { default as SupplierManager } from './components/suppliers/SupplierManager';
export { default as WarehouseManager } from './components/warehouses/WarehouseManager';
export { default as StockMovementTracker } from './components/stock/StockMovementTracker';
export { default as StockAlerts } from './components/alerts/StockAlerts';
export { default as PurchaseOrderManager } from './components/purchase-orders/PurchaseOrderManager';
export { default as InventoryAuditsComponent } from './components/audits/InventoryAudits';

// API and Types
export { inventoryApi } from './utils/inventoryApi';
export type * from './types/inventoryTypes';