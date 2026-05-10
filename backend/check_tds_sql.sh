#!/bin/bash
# Simple script to check TDS in payments using direct SQL query

echo "================================================================================"
echo "CHECKING PAYMENTS FOR TDS INFORMATION"
echo "================================================================================"
echo ""

# Get database credentials from .env
DB_NAME=$(grep "^DB_NAME=" /var/www/SAP-Python/backend/.env | cut -d'=' -f2)
DB_USER=$(grep "^DB_USER=" /var/www/SAP-Python/backend/.env | cut -d'=' -f2)

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check total payments
echo "================================================================================"
echo "PAYMENT STATISTICS"
echo "================================================================================"

sudo -u postgres psql -d "$DB_NAME" << 'EOF'
-- Total completed payments
SELECT 
    COUNT(*) as total_completed_payments,
    COUNT(CASE WHEN tds_amount > 0 THEN 1 END) as payments_with_tds,
    COUNT(CASE WHEN tds_amount = 0 OR tds_amount IS NULL THEN 1 END) as payments_without_tds
FROM finance_payment
WHERE status = 'completed';

EOF

echo ""
echo "================================================================================"
echo "SAMPLE PAYMENTS WITHOUT TDS (Last 10)"
echo "================================================================================"

sudo -u postgres psql -d "$DB_NAME" << 'EOF'
SELECT 
    payment_number,
    payment_date,
    amount,
    tds_amount,
    tds_rate,
    tds_section,
    net_amount_received,
    tds_certificate_received
FROM finance_payment
WHERE status = 'completed' 
  AND (tds_amount = 0 OR tds_amount IS NULL)
ORDER BY payment_date DESC
LIMIT 10;

EOF

echo ""
echo "================================================================================"
echo "SAMPLE PAYMENTS WITH TDS (Last 10)"
echo "================================================================================"

sudo -u postgres psql -d "$DB_NAME" << 'EOF'
SELECT 
    payment_number,
    payment_date,
    amount as gross_amount,
    tds_amount,
    tds_rate,
    tds_section,
    net_amount_received,
    tds_certificate_received
FROM finance_payment
WHERE status = 'completed' 
  AND tds_amount > 0
ORDER BY payment_date DESC
LIMIT 10;

EOF

echo ""
echo "================================================================================"
echo "RECOMMENDATIONS"
echo "================================================================================"
echo ""
echo "If payments should have TDS but don't show TDS amounts:"
echo "1. Check if TDS was actually deducted when payment was received"
echo "2. Update payment records with correct TDS information"
echo "3. Ensure future payments capture TDS details during creation"
echo ""
echo "To update a payment with TDS (example):"
echo "  UPDATE finance_payment"
echo "  SET amount = 76800.00,"
echo "      tds_amount = 7680.00,"
echo "      tds_rate = 10.00,"
echo "      tds_section = '194C',"
echo "      tds_applicable = true,"
echo "      net_amount_received = 69120.00"
echo "  WHERE payment_number = 'PAY-25-000042';"
echo ""
