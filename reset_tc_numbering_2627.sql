-- Reset TC Numbering for FY 2627 and Update Invoice Number

-- Step 1: Check current state
SELECT 'Current Invoice:' as info;
SELECT id, invoice_number, invoice_date, created_at 
FROM finance_invoices 
WHERE invoice_number = 'TC-INV-2627-027';

SELECT 'Current Numbering Counters:' as info;
SELECT module, scope_key, current_number, prefix 
FROM finance_numbering_counters 
WHERE company_id = 13 AND scope_key LIKE '%2627%';

-- Step 2: Update the invoice number
UPDATE finance_invoices 
SET invoice_number = 'TC-INV-2627-001'
WHERE invoice_number = 'TC-INV-2627-027';

-- Step 3: Reset numbering counter to 2 (since we now have 001)
UPDATE finance_numbering_counters 
SET current_number = 2
WHERE company_id = 13 
AND module = 'invoice'
AND scope_key LIKE '%2627%';

-- Step 4: Verify changes
SELECT 'Updated Invoice:' as info;
SELECT id, invoice_number, invoice_date, created_at 
FROM finance_invoices 
WHERE id = 262;

SELECT 'Updated Numbering Counter:' as info;
SELECT module, scope_key, current_number, prefix 
FROM finance_numbering_counters 
WHERE company_id = 13 AND scope_key LIKE '%2627%';

-- Step 5: Check if there are any other invoices for FY 2627
SELECT 'All TC Invoices for FY 2627:' as info;
SELECT invoice_number, invoice_date, created_at 
FROM finance_invoices 
WHERE company_id = 13 
AND invoice_number LIKE '%2627%'
ORDER BY created_at;
