-- Fix Empty Units in Products and Invoice Items
-- This script copies unit codes from unit_ref to the unit field

BEGIN;

-- Step 1: Fix products with unit_ref but empty unit
UPDATE finance_products
SET unit = (SELECT code FROM finance_units WHERE id = finance_products.unit_ref_id)
WHERE (unit IS NULL OR unit = '')
  AND unit_ref_id IS NOT NULL;

-- Show how many products were fixed
SELECT 
    'Products Fixed' as status,
    COUNT(*) as count
FROM finance_products
WHERE unit IS NOT NULL AND unit != '' AND unit_ref_id IS NOT NULL;

-- Step 2: Fix invoice items with empty units by looking up from product
UPDATE finance_invoice_items
SET unit = (
    SELECT COALESCE(
        (SELECT code FROM finance_units WHERE id = p.unit_ref_id),
        p.unit,
        'NOS'
    )
    FROM finance_products p
    WHERE p.id = finance_invoice_items.product_id
)
WHERE (unit IS NULL OR unit = '')
  AND product_id IS NOT NULL;

-- Show how many invoice items were fixed
SELECT 
    'Invoice Items Fixed' as status,
    COUNT(*) as count
FROM finance_invoice_items
WHERE unit IS NOT NULL AND unit != '';

-- Step 3: Fix quotation items with empty units
UPDATE finance_quotation_items
SET unit = (
    SELECT COALESCE(
        (SELECT code FROM finance_units WHERE id = p.unit_ref_id),
        p.unit,
        'NOS'
    )
    FROM finance_products p
    WHERE p.id = finance_quotation_items.product_id
)
WHERE (unit IS NULL OR unit = '')
  AND product_id IS NOT NULL;

-- Step 4: Fix PO items with empty units
UPDATE finance_purchase_order_items
SET unit = (
    SELECT COALESCE(
        (SELECT code FROM finance_units WHERE id = p.unit_ref_id),
        p.unit,
        'NOS'
    )
    FROM finance_products p
    WHERE p.id = finance_purchase_order_items.product_id
)
WHERE (unit IS NULL OR unit = '')
  AND product_id IS NOT NULL;

-- Step 5: Fix proforma invoice items with empty units
UPDATE finance_proforma_invoice_items
SET unit = (
    SELECT COALESCE(
        (SELECT code FROM finance_units WHERE id = p.unit_ref_id),
        p.unit,
        'NOS'
    )
    FROM finance_products p
    WHERE p.id = finance_proforma_invoice_items.product_id
)
WHERE (unit IS NULL OR unit = '')
  AND product_id IS NOT NULL;

-- Summary
SELECT 
    'Summary' as status,
    (SELECT COUNT(*) FROM finance_products WHERE unit IS NOT NULL AND unit != '') as products_with_units,
    (SELECT COUNT(*) FROM finance_invoice_items WHERE unit IS NOT NULL AND unit != '') as invoice_items_with_units,
    (SELECT COUNT(*) FROM finance_quotation_items WHERE unit IS NOT NULL AND unit != '') as quotation_items_with_units,
    (SELECT COUNT(*) FROM finance_purchase_order_items WHERE unit IS NOT NULL AND unit != '') as po_items_with_units,
    (SELECT COUNT(*) FROM finance_proforma_invoice_items WHERE unit IS NOT NULL AND unit != '') as proforma_items_with_units;

COMMIT;
