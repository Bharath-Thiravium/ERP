-- Fix empty units in quotation items
UPDATE finance_quotation_items fqi
SET unit = COALESCE(
    NULLIF(fp.unit, ''),
    fu.code,
    'NOS'
)
FROM finance_products fp
LEFT JOIN finance_units fu ON fp.unit_ref_id = fu.id
WHERE fqi.product_id = fp.id
AND (fqi.unit IS NULL OR fqi.unit = '');

-- Fix empty units in purchase order items
UPDATE finance_purchase_order_items fpoi
SET unit = COALESCE(
    NULLIF(fp.unit, ''),
    fu.code,
    'NOS'
)
FROM finance_products fp
LEFT JOIN finance_units fu ON fp.unit_ref_id = fu.id
WHERE fpoi.product_id = fp.id
AND (fpoi.unit IS NULL OR fpoi.unit = '');

-- Show results
SELECT 
    (SELECT COUNT(*) FROM finance_quotation_items WHERE unit IS NULL OR unit = '') as empty_quotation_units,
    (SELECT COUNT(*) FROM finance_purchase_order_items WHERE unit IS NULL OR unit = '') as empty_po_units;
