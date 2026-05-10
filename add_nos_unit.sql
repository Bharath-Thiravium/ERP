-- Add NOS unit with proper name for company 14
INSERT INTO finance_units (code, name, is_active, company_id, created_at, updated_at)
VALUES ('NOS', 'Numbers', true, 14, NOW(), NOW())
ON CONFLICT (company_id, code) DO UPDATE 
SET name = 'Numbers', updated_at = NOW();

-- Show result
SELECT id, code, name FROM finance_units WHERE company_id = 14 AND code = 'NOS';
