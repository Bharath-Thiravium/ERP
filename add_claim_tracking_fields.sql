-- Migration: Add claim tracking fields to invoice_items
-- This allows tracking percentage-based claims and claimed status per line item

-- Add new columns to finance_invoice_items table
ALTER TABLE finance_invoice_items 
ADD COLUMN IF NOT EXISTS claim_type VARCHAR(20) DEFAULT 'unit',
ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS claimed_percentage DECIMAL(5,2) DEFAULT 0.00;

-- Add comment for documentation
COMMENT ON COLUMN finance_invoice_items.claim_type IS 'Type of claim: unit (quantity-based) or percentage (percentage-based)';
COMMENT ON COLUMN finance_invoice_items.is_claimed IS 'Whether this line item has been claimed';
COMMENT ON COLUMN finance_invoice_items.claimed_percentage IS 'Percentage claimed if claim_type is percentage';

-- Show updated table structure
\d finance_invoice_items;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'finance_invoice_items' 
AND column_name IN ('claim_type', 'is_claimed', 'claimed_percentage')
ORDER BY column_name;
