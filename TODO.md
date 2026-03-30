# Global TDS Management System - /finance/tds ✅

## Status: ✅ PLAN APPROVED | 🔄 IMPLEMENTING

### 📋 IMPLEMENTATION STEPS

#### ✅ **PHASE 1: Backend Foundation** (Current)
- [x] Backend analysis complete (Payment model + TDSReportGenerator ready)
- [ ] **views.py** → TDSPaymentsListView + TDSExportCSVView
- [ ] **serializers.py** → TDSPaymentSerializer  
- [ ] **urls.py** → `/finance/tds/` + `/finance/tds/export/`

#### **PHASE 2: Backend Template**
- [ ] `backend/finance/templates/finance/tds_list.html` (DataTables + Q1-Q4 tabs)

#### **PHASE 3: Frontend React Page**
- [ ] `frontend/src/pages/finance/TDSList.tsx` 
- [ ] Finance sidebar nav link
- [ ] React Router route `/finance/tds`

#### **PHASE 4: Testing & Polish**
- [ ] Test quarters: Q1(Apr-Jun), Q2(Jul-Sep), Q3(Oct-Dec), Q4(Jan-Mar FY)
- [ ] CSV export: Deductee-wise + totals + Form16A pending
- [ ] Mobile responsive table
- [ ] Smoke test production

#### **PHASE 5: Deploy**
```
cd /var/www/SAP-Python/backend
python manage.py collectstatic
cd /var/www/SAP-Python
./deploy_production.sh
```

---

**Next Action:** Edit `backend/finance/views.py` → Add TDS views

**Features Delivered:**
✅ Global TDS across all invoices (not just modal)  
✅ Quarter-wise Q1-Q4 grouping (26Q compliant)  
✅ CSV Export for CA submission  
✅ Backend leverages existing TDSReportGenerator  
✅ CA tracking fields (ca_name, ca_submission_status)

