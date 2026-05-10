-- Show current NOS units before update
SELECT id, code, name, company_id FROM finance_units WHERE code = 'NOS' ORDER BY company_id;

-- Update all NOS units to have proper name "Numbers"
UPDATE finance_units 
SET name = 'Numbers', updated_at = NOW()
WHERE code = 'NOS';

-- Show updated NOS units
SELECT id, code, name, company_id FROM finance_units WHERE code = 'NOS' ORDER BY company_id;
