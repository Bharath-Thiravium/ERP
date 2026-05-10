-- SQL Script to delete specific invoice entries
-- Invoice numbers to delete:
-- BKC/001/2627, BKC/02O/2526, BKC/020/2526, INV-25-002630, INV-25-002629

BEGIN;

-- Display invoices before deletion
SELECT 
    id,
    invoice_number,
    invoice_date,
    total_amount,
    customer_id
FROM finance_invoices
WHERE invoice_number IN (
    'BKC/001/2627',
    'BKC/02O/2526',
    'BKC/020/2526',
    'INV-25-002630',
    'INV-25-002629'
);

-- Delete related invoice items first (foreign key constraint)
DELETE FROM finance_invoice_items
WHERE invoice_id IN (
    SELECT id FROM finance_invoices
    WHERE invoice_number IN (
        'BKC/001/2627',
        'BKC/02O/2526',
        'BKC/020/2526',
        'INV-25-002630',
        'INV-25-002629'
    )
);

-- Delete related payments (if any)
DELETE FROM finance_payments
WHERE invoice_id IN (
    SELECT id FROM finance_invoices
    WHERE invoice_number IN (
        'BKC/001/2627',
        'BKC/02O/2526',
        'BKC/020/2526',
        'INV-25-002630',
        'INV-25-002629'
    )
);

-- Delete the invoices
DELETE FROM finance_invoices
WHERE invoice_number IN (
    'BKC/001/2627',
    'BKC/02O/2526',
    'BKC/020/2526',
    'INV-25-002630',
    'INV-25-002629'
);

-- Display summary
SELECT 
    'Invoices deleted successfully' AS status,
    COUNT(*) AS remaining_count
FROM finance_invoices
WHERE invoice_number IN (
    'BKC/001/2627',
    'BKC/02O/2526',
    'BKC/020/2526',
    'INV-25-002630',
    'INV-25-002629'
);

COMMIT;
