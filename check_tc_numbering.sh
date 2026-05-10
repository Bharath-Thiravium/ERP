#!/bin/bash

export PGPASSWORD=mango

echo "========================================="
echo "TC Finance Module Numbering Check - FY 2627"
echo "========================================="
echo ""

echo "Current Numbering Counters for TC (Company ID 13):"
echo "---------------------------------------------------"
psql -h 127.0.0.1 -U postgres -d modernsap << 'EOF'
SELECT 
    module,
    scope_key as fiscal_year,
    current_number,
    prefix
FROM finance_numbering_counters 
WHERE company_id = 13 
AND scope_key LIKE '%2627%'
ORDER BY module;
EOF

echo ""
echo "Latest Invoice Numbers for TC:"
echo "------------------------------"
psql -h 127.0.0.1 -U postgres -d modernsap << 'EOF'
SELECT 
    invoice_number,
    invoice_date,
    created_at
FROM finance_invoices 
WHERE company_id = 13 
ORDER BY created_at DESC 
LIMIT 5;
EOF

echo ""
echo "========================================="
echo "Do you want to reset numbering for FY 2627? (y/n)"
read -p "Answer: " answer

if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    echo ""
    echo "Resetting numbering counters for FY 2627..."
    psql -h 127.0.0.1 -U postgres -d modernsap << 'EOF'
    UPDATE finance_numbering_counters 
    SET current_number = 1
    WHERE company_id = 13 
    AND scope_key LIKE '%2627%';
EOF
    
    echo "✓ Numbering reset complete!"
    echo ""
    echo "New counters:"
    psql -h 127.0.0.1 -U postgres -d modernsap << 'EOF'
    SELECT 
        module,
        scope_key as fiscal_year,
        current_number,
        prefix
    FROM finance_numbering_counters 
    WHERE company_id = 13 
    AND scope_key LIKE '%2627%'
    ORDER BY module;
EOF
else
    echo "Numbering reset cancelled."
fi

echo ""
echo "========================================="
