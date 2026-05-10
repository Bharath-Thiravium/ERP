-- Create numbering counters for all finance modules for FY 2627
INSERT INTO finance_numbering_counters (module, scope_key, next_value, updated_at, company_id)
VALUES 
    ('quotation', '2627', 1, NOW(), 13),
    ('purchase_order', '2627', 1, NOW(), 13),
    ('proforma_invoice', '2627', 1, NOW(), 13)
ON CONFLICT (company_id, module, scope_key) DO NOTHING;

-- Show all counters for TC FY 2627
SELECT module, scope_key, next_value 
FROM finance_numbering_counters 
WHERE company_id = 13 AND scope_key = '2627'
ORDER BY module;
