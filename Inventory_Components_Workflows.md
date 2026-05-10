# Inventory Module — Components & Workflows
**Project:** SAP-Python  
**Base URL:** `https://sap.athenas.co.in/api/inventory/`  

## Architecture Overview

```
inventory/
├── models.py           — Core stock models
├── views.py            — CRUD + adjustments
├── urls.py             — API routing
└── utils.py            — Stock calculations
```

## Core Components

### 1. Master Data
| Sub-Component | Models | Key Features |
|---------------|--------|--------------|
| Products | Product (shared w/ Finance) | HSN/SAC, units (NOS/KG), pricing |
| Categories | Category | Hierarchical (code: CAT001) |
| Suppliers | Supplier/Vendor | Linked to Procurement |

### 2. Locations & Stock
| Sub-Component | Models | Key Features |
|---------------|--------|--------------|
| Warehouses | Warehouse | Multi-location, transfers |
| Stock | StockEntry, StockTransfer | Serial/batch tracking |

### 3. Transactions
| Sub-Component | Models | Key Features |
|---------------|--------|--------------|
| Receipts | PurchaseReceipt | From PO/vendor invoice |
| Issues | StockIssue | To production/sales |

## Detailed Workflows

### Stock Receipt Workflow
```mermaid
flowchart TD
    A[PO Approved + Goods Received] --> B[Create PurchaseReceipt]
    B --> C[Verify Items/Units/Qty]
    C --> D[StockEntry: qty_received]
    D --> E[Update Warehouse Balance]
    E --> F[Alert if Low Stock]
```

### Stock Transfer Workflow
```mermaid
sequenceDiagram
    participant W1 as Warehouse A
    participant W2 as Warehouse B
    participant ST as StockTransfer
    Note over W1,W2: Initiate Transfer
    W1->>ST: Create Transfer Request
    ST->>W2: Goods Received
    ST->>W1: Deduct Stock
    ST->>W2: Add Stock
```

### Inventory Adjustment
```mermaid
graph LR
    A[Physical Count Diff] --> B[Adjustment Entry:<br/>+ve Excess / -ve Shortage]
    B --> C[Reason: Damage/Theft/Expiry]
    C --> D[Auto-Valuation]
    D --> E[Audit Trail]
```

### Low Stock Alert
```mermaid
flowchart LR
    A[Daily Celery Scan] --> B{Stock < Reorder?}
    B -->|Yes| C[Purchase Request Auto-Create]
    B -->|No| D[Continue Monitoring]
```

## API Endpoints Summary

| Category | Key Endpoints |
|----------|---------------|
| Products | GET/POST /products/ (shared) |
| Stock | POST /stock-entries/ |
| Transfers | POST /stock-transfers/ |
| Reports | GET /stock-analytics/ |

**Inferred from**: App catalog, units fixes, HSN.csv.

## Integration Notes
- **Procurement**: PO → PurchaseReceipt → Stock.
- **Finance**: Product pricing/units sync.
- **Numbering**: INV000123, atomic counters.

