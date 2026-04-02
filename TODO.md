# Quotation PDF Templates Preview Fix - TODO  
Status: Approved ✅ | Priority: HIGH

**Progress: 2/7 Steps Complete** ✅✅

## Breakdown (7 Steps)

### 1. ✅ PLAN APPROVED
User approved comprehensive fix plan.

### 2. ✅ Create backend/finance/utils.py
Unified PDF response generator created.
Unified PDF response generator (inline/attachment).

### 3. Fix backend/finance/views.py [PENDING]  
Add `@action(detail=True)` pdf to QuotationListCreateView.

### 4. Fix backend/finance/quotation_pdf_service.py [PENDING]
Complete template context (gstin, shipping_info, totals).

### 5. Patch backend/company_dashboard/quotation_template_models.py [PENDING]
Auto-create default template settings.

### 6. Create/Update test_quotation_pdf.py [PENDING]
Test all templates (AS/BKGE/TC).

### 7. DEPLOY & VERIFY [PENDING]
```bash
cd backend && ./deploy_production.sh
# Test: https://sap.athenas.co.in/company
```

## Completion Criteria
- [ ] Inline PDF preview works (no download)
- [ ] All templates render correctly  
- [ ] Company template settings auto-created
- [ ] Zero WeasyPrint fallback errors
- [ ] Production deployed & verified

**Next: utils.py → views.py → service.py → deploy**

