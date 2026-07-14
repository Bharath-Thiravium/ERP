# Inventory Module User Manual

Ithu Inventory module-a end-to-end test panna complete Tanglish workflow manual. Intha document-a tester-ku kudutha, avanga menu by menu poi create, update, view, download, report, approval flow ellam verify panna mudiyum.

## 1. Before Start

### Login
1. Browser-la app open pannunga.
2. Inventory service user login pannunga.
3. Left sidebar-la `Inventory Management` module open aagum.
4. Dashboard top-la company name/logo correct-aa iruka check pannunga.

### Test Data Ready Pannunga
Testing-ku minimum intha data venum:
- 1 Category
- 1 Supplier
- 1 Warehouse
- 2 Products
- 1 Stock In movement
- 1 Purchase Order

Suggested sample data:
- Category: Electronics
- Supplier: ABC Suppliers
- Warehouse: Main Warehouse
- Product 1: Motherboard
- Product 2: Charger

## 2. Recommended Test Order

Inventory workflow correct-aa test panna intha order follow pannunga:

1. Overview
2. Categories
3. Suppliers
4. Warehouses
5. Products
6. Stock Movements
7. Stock Alerts
8. Purchase Orders
9. Inventory Audits
10. Product Bundles
11. Cycle Counts
12. Aging Analysis
13. Analytics
14. Settings

Reason: Inventory-la product create panna category, supplier, warehouse already irundha workflow clean-aa test panna mudiyum.

## 3. Overview Menu

### Use
Overview page inventory health summary kaamikum. Total products, stock value, low stock, recent movements, AI insights maari dashboard data irukum.

### Test Steps
1. Sidebar-la `Overview` click pannunga.
2. Cards load aagudha check pannunga.
3. Total Products count product menu count-oda match aagudha check pannunga.
4. Low stock / alerts values stock alert menu-oda match aagudha check pannunga.
5. Recent activity irundha latest stock movement / PO activity show aagudha check pannunga.

### Expected Result
- Dashboard data blank-a crash aaga koodathu.
- New product/stock movement create pannina refresh after overview numbers update aaganum.

## 4. Categories Menu

### Use
Products-a group panna category use aagum. Example Electronics, Mobile Phones, Spare Parts.

### Test Steps
1. `Categories` menu open pannunga.
2. `Add Category` click pannunga.
3. Category name, description fill pannunga.
4. `Create Category` click pannunga.
5. Created category list-la varudha check pannunga.
6. Edit icon click panni name/description update pannunga.
7. View icon click panni details correct-aa iruka check pannunga.
8. Search box-la category name type panni filter work aagudha check pannunga.
9. Delete icon click pannumbothu confirm flow correct-aa iruka check pannunga.

### Expected Result
- Category create/update/list/search/delete ellam work aaganum.
- Product-la category dropdown-la intha category show aaganum.

## 5. Suppliers Menu

### Use
Product purchase panna supplier/vendor details maintain panna use aagum.

### Test Steps
1. `Suppliers` menu open pannunga.
2. `Add Supplier` click pannunga.
3. Fill:
   - Supplier Name
   - Contact Person
   - Email
   - Phone
   - Address
   - GSTIN / Tax details irundha fill pannunga.
4. Create pannunga.
5. Supplier card/table-la show aagudha check pannunga.
6. Edit supplier and save.
7. Search supplier name panni check pannunga.
8. Product create form-la primary supplier dropdown-la supplier varudha check pannunga.

### Expected Result
- Supplier create/update/search work aaganum.
- PO create pannumbothu supplier select panna mudiyanum.

## 6. Warehouses Menu

### Use
Stock physical-aa enga iruku nu manage panna warehouse use aagum. Example Main Warehouse, Branch Store.

### Test Steps
1. `Warehouses` menu open pannunga.
2. `Add Warehouse` click pannunga.
3. Fill:
   - Warehouse Name
   - Code
   - Address
   - City
   - State
   - Capacity
4. Create pannunga.
5. Warehouse list-la show aagudha check pannunga.
6. Edit warehouse and save.
7. Product stock movement form-la warehouse dropdown-la varudha check pannunga.

### Expected Result
- Warehouse create/update/search work aaganum.
- Stock movement and cycle count-la warehouse selectable-aa irukanum.

## 7. Products Menu

### Use
Inventory-la sell/purchase/track panna products create panna main menu.

### Test Steps
1. `Products` menu open pannunga.
2. `Add Product` click pannunga.
3. Basic fields fill pannunga:
   - Product Name
   - Category
   - Product Type
   - Description
4. Price fields fill pannunga:
   - Cost Price
   - Selling Price
   - MRP
5. Tax fields:
   - HSN/SAC Code
   - Tax Rate
6. Stock settings:
   - Min Stock Level
   - Max Stock Level
   - Reorder Point
   - Reorder Quantity
7. Supplier select pannunga.
8. Barcode blank leave pannalam. System generate panna option irundha generate pannunga.
9. `Create Product` click pannunga.
10. Product list-la product code auto generated-aa varudha check pannunga.
11. View product details check pannunga.
12. Edit product price/stock settings update pannunga.
13. Export click panni product export work aagudha check pannunga.
14. Generate Barcode button use panni barcode create aagudha check pannunga.

### Expected Result
- Product create aagum.
- Product code company document numbering format-la varanum.
- Barcode blank duplicate error vara koodathu.
- Category/supplier relation correct-aa save aaganum.

## 8. Stock Movements Menu

### Use
Actual stock increase/decrease/adjustment track panna use aagum. Ithu stock ledger mathiri.

### Common Movement Types
- Stock In: Initial stock add panna
- Purchase: Supplier purchase stock add panna
- Sale / Stock Out: Stock reduce panna
- Adjustment: Physical/system correction
- Damage: Damaged stock remove panna
- Transfer: Warehouse to warehouse movement

### Test Steps
1. `Stock Movements` open pannunga.
2. Add/Create movement click pannunga.
3. Product select pannunga.
4. Warehouse select pannunga.
5. Movement Type `Stock In` select pannunga.
6. Quantity enter pannunga. Example 10.
7. Unit cost / notes fill pannunga.
8. Save pannunga.
9. Product menu-la product current stock update aagudha check pannunga.
10. Same product-ku `Stock Out` movement create pannunga. Example quantity 2.
11. Product stock 8-aa reduce aagudha check pannunga.

### Expected Result
- Movement list-la before/after quantity correct-aa show aaganum.
- Product current stock movement-ku sync aaganum.
- Wrong company product/warehouse access aaga koodathu.

## 9. Stock Alerts Menu

### Use
Low stock, out of stock, reorder alert, overstock maari stock warning manage panna use aagum.

### Test Steps
1. Product-la `Min Stock Level` and `Reorder Point` set pannunga.
2. Stock movement-la stock low aagura mathiri stock out pannunga.
3. `Stock Alerts` menu open pannunga.
4. Alert create/show aagudha check pannunga.
5. Search/filter priority use pannunga.
6. `Resolve` click pannunga.
7. `Show Resolved` enable pannunga.
8. Resolved alert list-la theriyudha check pannunga.

### Expected Result
- Low stock trigger aagum.
- Resolve panna status change aagum.
- Resolved alerts optional-aa show aaganum.

## 10. Purchase Orders Menu

### Use
Supplier-kitta product purchase order create panna use aagum. PO received panna stock increase aaganum.

### Test Steps
1. `Purchase Orders` menu open pannunga.
2. `Create PO` click pannunga.
3. Supplier select pannunga.
4. Expected delivery date select pannunga.
5. Add item:
   - Product
   - Quantity
   - Unit Price
6. Notes fill pannunga.
7. `Create Order` click pannunga.
8. PO list-la order show aagudha check pannunga.
9. View PO click pannunga.
10. Status flow check pannunga:
    - Pending
    - Approved
    - Received
    - Cancelled
11. Status `Received` panna stock increase aagudha check pannunga.
12. Download icon click panni PDF download pannunga.
13. PDF-la company name/logo, supplier, item table, total amount clean-aa iruka check pannunga.

### Expected Result
- PO create/edit/view/download work aaganum.
- Received status-la stock movement/stock level update aaganum.
- PDF modern layout-la varanum.

## 11. Inventory Audits Menu

### Use
Full physical stock verification panna use aagum. Audit na complete warehouse/category stock check.

### Status Flow
1. Planned
2. Start Audit / In Progress
3. Enter actual count
4. Complete Audit
5. Completed

### Test Steps
1. `Inventory Audits` menu open pannunga.
2. `Start Audit` click pannunga.
3. Fill:
   - Audit Name
   - Warehouse
   - Audit Date
   - Scope / Notes
4. Create audit.
5. Audit card/list-la `Planned` status varudha check pannunga.
6. View/Edit click pannunga.
7. `Start Audit` click panni status `In Progress` aagudha check pannunga.
8. Product rows-la expected quantity and actual quantity check pannunga.
9. Actual quantity enter pannunga.
10. Difference/variance calculate aagudha check pannunga.
11. `Complete Audit` click pannunga.
12. Status `Completed`, accuracy update aagudha check pannunga.
13. Download report click pannunga.
14. PDF report layout clean-aa iruka check pannunga.

### Expected Result
- Planned-la irundhu completed vara status flow correct-aa irukanum.
- Actual vs expected difference correct-aa calculate aaganum.
- Download PDF professional layout-la varanum.

## 12. Product Bundles Menu

### Use
Multiple products combine panni one kit/combo-aa sell panna use aagum. Example:
- Computer Kit = Motherboard + RAM + SSD
- Mobile Combo = Charger + Cable + Earphone

### Test Steps
1. `Product Bundles` menu open pannunga.
2. `Create Bundle` click pannunga.
3. Fill:
   - Bundle Name
   - Bundle Price
   - Discount if needed
   - Description
4. `Add Products to Bundle` section-la 2 products add pannunga.
5. Each product-ku quantity set pannunga.
6. Override price venumna set pannunga.
7. Cost/selling preview check pannunga.
8. `Create Bundle` click pannunga.
9. Bundle list-la show aagudha check pannunga.
10. View bundle click pannunga.
11. Product items, quantity, effective price, line total correct-aa iruka check pannunga.
12. Edit bundle panni item add/remove/update pannunga.
13. Delete bundle flow check pannunga.

### Expected Result
- More than one product bundle-aa create panna mudiyanum.
- Margin calculation crash aaga koodathu.
- Edit panna old items correctly load aaganum.

## 13. Cycle Counts Menu

### Use
Cycle Count na stock count thaan. Full audit panna vendam; regular interval-la selected warehouse/category/ABC class product count panna use aagum.

Example:
- Daily Class A product count
- Monthly Electronics category count
- Quarterly branch warehouse count

### Status Flow
1. Scheduled
2. Start
3. In Progress
4. Counted quantity enter
5. Save Count
6. Complete Count
7. Completed

### Test Steps
1. `Cycle Counts` menu open pannunga.
2. `Schedule Count` click pannunga.
3. Fill:
   - Count Name
   - Warehouse
   - Frequency: Daily / Weekly / Monthly / Quarterly
   - Next Count Date
4. Optional filters:
   - ABC Class A/B/C
   - Categories
5. `Schedule Count` click pannunga.
6. List-la status `Scheduled` show aagudha check pannunga.
7. `Start` click pannunga.
8. Status `In Progress` aagudha check pannunga.
9. `View` click pannunga.
10. Table-la products varanum:
    - Product
    - Expected quantity
    - Counted quantity
    - Variance
    - Notes
11. Physical stock count number `Counted` column-la enter pannunga.
12. Variance automatic-aa calculate aagudha check pannunga.
13. `Save Count` click pannunga.
14. All items counted after `Complete Count` click pannunga.
15. Completed status, accuracy, discrepancies update aagudha check pannunga.

### Expected Result
- Selected warehouse stock expected quantity-aa varanum.
- Warehouse stock row illa na expected 0 varalam, but product count panna row show aaganum.
- Complete panna all items counted quantity required.
- Accuracy and discrepancy correct-aa calculate aaganum.

## 14. Aging Analysis Menu

### Use
Aging Analysis expiry date report illa. Ithu stock last inbound/purchase movement-la irundhu evlo naal stock move aagala nu calculate pannum.

Buckets:
- Fresh: 0-30 days
- Good: 31-60 days
- Aging: 61-90 days
- Slow Moving: 91-180 days
- Very Slow: 181-365 days
- Dead Stock: 365+ days

### Test Steps
1. `Aging Analysis` menu open pannunga.
2. `Refresh Analysis` click pannunga.
3. Summary cards load aagudha check pannunga.
4. Aging Distribution bar chart values show aagudha check pannunga.
5. Detailed Aging Analysis table-la product, stock, last movement date, age, turnover show aagudha check pannunga.
6. Dead stock count correct-aa iruka check pannunga.

### Expected Result
- Last stock-in/purchase date based-aa days old calculate aaganum.
- Slow moving/dead stock identify aaganum.
- Expiry date based report venumna separate expiry report build panna vendum.

## 15. Analytics Menu

### Use
Inventory business insights, stock value, movement trend, low stock, reorder, performance analytics view panna use aagum.

### Test Steps
1. `Analytics` menu open pannunga.
2. Summary cards load aagudha check pannunga.
3. Stock valuation / movement / alert related analytics values check pannunga.
4. Navigation buttons irundha click panni related menu-ku pogudha check pannunga.
5. New stock movement or product add pannitu refresh panna analytics update aagudha check pannunga.

### Expected Result
- Analytics page crash aaga koodathu.
- Dashboard/stock/menu data-oda numbers broadly match aaganum.

## 16. Settings Menu

### Use
Inventory module preference/settings manage panna use aagum.

### Test Steps
1. `Settings` menu open pannunga.
2. Available settings tabs/sections load aagudha check pannunga.
3. Form fields irundha update panni save panna mudiyudha check pannunga.
4. Save after refresh pannalum value persist aagudha check pannunga.

### Expected Result
- Settings page load aaganum.
- Save panna toast/success message varanum.
- Refresh after values persist aaganum.

## 17. Full End-To-End Test Scenario

Intha scenario complete panna inventory module core workflow pass nu consider pannalam.

### Step 1: Setup Master Data
1. Category create pannunga: Electronics.
2. Supplier create pannunga: ABC Suppliers.
3. Warehouse create pannunga: Main Warehouse.

### Step 2: Product Create
1. Product create pannunga: Motherboard.
2. Category Electronics select pannunga.
3. Supplier ABC Suppliers select pannunga.
4. Cost price and selling price set pannunga.
5. Min stock/reorder point set pannunga.

### Step 3: Initial Stock Add
1. Stock Movements-la Stock In create pannunga.
2. Product Motherboard, Warehouse Main Warehouse, quantity 10.
3. Product current stock 10-aa iruka check pannunga.

### Step 4: Purchase Order
1. Purchase Order create pannunga.
2. Supplier ABC Suppliers select pannunga.
3. Motherboard quantity 5 add pannunga.
4. PO create pannunga.
5. PDF download panni layout check pannunga.
6. PO status Received panna stock increase aagudha check pannunga.

### Step 5: Stock Alert
1. Stock Out movement create panni stock reorder point below konduvanga.
2. Stock Alerts menu-la alert varudha check pannunga.
3. Resolve alert panni status check pannunga.

### Step 6: Inventory Audit
1. Audit create pannunga.
2. Start Audit.
3. Actual quantity enter pannunga.
4. Complete Audit.
5. PDF download panni check pannunga.

### Step 7: Bundle
1. Second product create pannunga: Charger.
2. Product Bundle create pannunga: Motherboard Combo.
3. Motherboard + Charger add pannunga.
4. View/Edit bundle check pannunga.

### Step 8: Cycle Count
1. Cycle Count schedule pannunga.
2. Warehouse Main Warehouse select pannunga.
3. Start count.
4. View click panni counted stock enter pannunga.
5. Save Count.
6. Complete Count.
7. Accuracy/discrepancy check pannunga.

### Step 9: Aging Analysis
1. Aging Analysis open pannunga.
2. Refresh Analysis.
3. Product age buckets and details check pannunga.

### Step 10: Final Analytics
1. Analytics open pannunga.
2. Total stock/value/reports update aagudha check pannunga.

## 18. Important Validation Checklist

Tester intha checklist complete panna vendum:

- Login successful.
- Overview loads without error.
- Category create/edit/view/search works.
- Supplier create/edit/view/search works.
- Warehouse create/edit/view/search works.
- Product create/edit/view/export/barcode works.
- Stock movement stock quantity update pannuthu.
- Stock alert create/resolve works.
- Purchase order create/edit/view/status/PDF works.
- Inventory audit planned/in progress/completed/PDF works.
- Product bundle create/edit/view/delete works.
- Cycle count scheduled/start/pause/resume/view/save/complete works.
- Aging analysis real data show pannuthu.
- Analytics page loads and values update.
- Settings page loads and save works.
- Multi-tenant: one company data another company/service user-ku show aaga koodathu.
- Delete action shared data irundha proper approval/reason flow follow aaganum.

## 19. Common Issues Note Panna Format

Bug report pannumbothu intha format use pannunga:

```text
Menu:
Action:
Input data:
Expected result:
Actual result:
Screenshot:
Console/backend error:
User login/service user:
Time:
```

## 20. Demo Pass Criteria

Inventory demo pass nu solla:
- Master data setup smooth-aa irukanum.
- Product stock quantity correct-aa update aaganum.
- PO PDF and Audit PDF professional-aa download aaganum.
- Cycle count actual physical stock count workflow clear-aa irukanum.
- Aging Analysis dead/slow stock concept clear-aa show aaganum.
- No page crash, no 400/500 error, no duplicate blank barcode error.
- Document numbering company format-la varanum.

