-- Fix BKC Invoice Numbering Counter for FY 2627
-- Current issue: Counter is at 2633, but should be at 7 (next after BKC/006/2627)

BEGIN;

-- Show current counter status
SELECT 
    'BEFORE FIX' as status,
    id, 
    module, 
    scope_key, 
    next_value,
    updated_at
FROM finance_numbering_counters 
WHERE company_id = 14 AND module = 'invoice' AND scope_key = '2627';

-- Show latest invoice number for FY 2627
SELECT 
    'LATEST INVOICE' as status,
    invoice_number, 
    invoice_date, 
    created_at
FROM finance_invoices 
WHERE company_id = 14 AND invoice_number LIKE 'BKC/%/2627' 
ORDER BY created_at DESC 
LIMIT 1;

-- Fix the counter: Set it to 7 (next after BKC/006/2627)
UPDATE finance_numbering_counters 
SET 
    next_value = 7,
    updated_at = NOW()
WHERE 
    company_id = 14 
    AND module = 'invoice' 
    AND scope_key = '2627';

-- Show fixed counter status
SELECT 
    'AFTER FIX' as status,
    id, 
    module, 
    scope_key, 
    next_value,
    updated_at
FROM finance_numbering_counters 
WHERE company_id = 14 AND module = 'invoice' AND scope_key = '2627';

-- Also fix the invoice BKC/2632/2627 to BKC/007/2627
UPDATE finance_invoices
SET invoice_number = 'BKC/007/2627'
WHERE company_id = 14 AND invoice_number = 'BKC/2632/2627';

-- Show the corrected invoice
SELECT 
    'CORRECTED INVOICE' as status,
    invoice_number, 
    invoice_date, 
    created_at
FROM finance_invoices 
WHERE company_id = 14 AND invoice_number = 'BKC/007/2627';

COMMIT;

-- Summary
SELECT 
    '✓ FIXED' as status,
    'Next invoice will be BKC/008/2627' as next_invoice;
