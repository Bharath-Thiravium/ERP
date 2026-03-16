#!/bin/bash

# Reset passwords for all finance service users
# Default password: Finance@123

cd /var/www/SAP-Python/backend

# Unset DEBUG environment variable
unset DEBUG

source venv/bin/activate

echo "Resetting passwords for finance service users..."
echo "Default password: Finance@123"
echo ""

python manage.py reset_service_user_password TC_Bharath_001 "Finance@123"
python manage.py reset_service_user_password AS_Bharath_001 "Finance@123"
python manage.py reset_service_user_password BKC_Harini_001 "Finance@123"
python manage.py reset_service_user_password MAK47_harnin_001 "Finance@123"
python manage.py reset_service_user_password SE_Harini_001 "Finance@123"
python manage.py reset_service_user_password BKGE_Harini_001 "Finance@123"

echo ""
echo "Password reset complete!"
echo ""
echo "Login credentials:"
echo "===================="
echo "1. TC_Bharath_001 - bharath@athenas.co.in - Finance@123"
echo "2. AS_Bharath_001 - bharath@athenas.co.in - Finance@123"
echo "3. BKC_Harini_001 - bkconstruction202@gmail.com - Finance@123"
echo "4. MAK47_harnin_001 - admin@athenas.co.in - Finance@123"
echo "5. SE_Harini_001 - shamy.enterprises@gmail.com - Finance@123"
echo "6. BKGE_Harini_001 - accounts@bkgreenenergy.com - Finance@123"
