-- Fix empty units in invoice items
-- Set to product's unit if available, otherwise use 'NOS'
UPDATE finance_invoice_items fii
SET unit = COALESCE(
    NULLIF(fp.unit, ''),
    fu.code,
    'NOS'
)
FROM finance_products fp
LEFT JOIN finance_units fu ON fp.unit_ref_id = fu.id
WHERE fii.product_id = fp.id
AND (fii.unit IS NULL OR fii.unit = '');

-- Show results
SELECT COUNT(*) as fixed_count FROM finance_invoice_items WHERE unit IS NULL OR unit = '';
