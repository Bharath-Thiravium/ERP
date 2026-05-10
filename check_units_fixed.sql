-- Check a sample of items with empty units and their product's unit_ref
SELECT 
    fii.id,
    fii.product_id,
    fii.unit,
    fp.unit as product_unit,
    fp.unit_ref_id,
    fu.code as unit_ref_code
FROM finance_invoice_items fii
LEFT JOIN finance_products fp ON fii.product_id = fp.id
LEFT JOIN finance_unit fu ON fp.unit_ref_id = fu.id
WHERE fii.unit IS NULL OR fii.unit = ''
LIMIT 5;
