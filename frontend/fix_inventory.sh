#!/bin/bash

# Fix StockAlerts.tsx - remove unused imports
sed -i 's/, AnimatePresence//' src/pages/services/inventory/components/alerts/StockAlerts.tsx
sed -i 's/Save//' src/pages/services/inventory/components/alerts/StockAlerts.tsx
sed -i '/import { Input }/d' src/pages/services/inventory/components/alerts/StockAlerts.tsx

# Fix InventoryAnalytics.tsx - remove unused import
sed -i '/import { Button }/d' src/pages/services/inventory/components/analytics/InventoryAnalytics.tsx

# Fix InventoryAudits.tsx - remove unused import and fix array type
sed -i '/import { Input }/d' src/pages/services/inventory/components/audits/InventoryAudits.tsx
sed -i 's/setWarehouses(Array.isArray(data) ? data : \[\]);/setWarehouses(Array.isArray(data) ? data : [] as any[]);/' src/pages/services/inventory/components/audits/InventoryAudits.tsx

# Fix CategoryManager.tsx - remove unused import
sed -i '/import { Input }/d' src/pages/services/inventory/components/categories/CategoryManager.tsx

# Fix CycleCountManager.tsx - remove unused import and fix status comparison
sed -i '/import { Modal }/d' src/pages/services/inventory/components/cycle-counts/CycleCountManager.tsx
sed -i "s/count.status === 'paused'/false/" src/pages/services/inventory/components/cycle-counts/CycleCountManager.tsx

# Fix ProductList.tsx - remove unused imports
sed -i 's/, useMemo//' src/pages/services/inventory/components/products/ProductList.tsx
sed -i '/import { Input }/d' src/pages/services/inventory/components/products/ProductList.tsx

# Fix PurchaseOrderManager.tsx - remove unused import and fix property access
sed -i '/import { Input }/d' src/pages/services/inventory/components/purchase-orders/PurchaseOrderManager.tsx
sed -i 's/warehouses\[0\].id/warehouses[0]?.id || null/g' src/pages/services/inventory/components/purchase-orders/PurchaseOrderManager.tsx
sed -i 's/order.notes/order.notes || ""/g' src/pages/services/inventory/components/purchase-orders/PurchaseOrderManager.tsx
sed -i 's/selectedOrder.notes/selectedOrder.notes || ""/g' src/pages/services/inventory/components/purchase-orders/PurchaseOrderManager.tsx

# Fix StockMovementTracker.tsx - remove unused import
sed -i '/import { Input }/d' src/pages/services/inventory/components/stock/StockMovementTracker.tsx

# Fix SupplierManager.tsx - remove unused import
sed -i '/import { Input }/d' src/pages/services/inventory/components/suppliers/SupplierManager.tsx

# Fix WarehouseManager.tsx - remove unused import
sed -i '/import { Input }/d' src/pages/services/inventory/components/warehouses/WarehouseManager.tsx

echo "Fixed inventory component errors"
