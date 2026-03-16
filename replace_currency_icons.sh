#!/bin/bash

# Replace DollarSign with IndianRupee in all frontend files

FILES=(
"/var/www/SAP-Python/frontend/src/pages/public/PublicJobDetail.tsx"
"/var/www/SAP-Python/frontend/src/pages/public/JobPortal.tsx"
"/var/www/SAP-Python/frontend/src/pages/master-admin/analytics/components/ServiceAnalytics.tsx"
"/var/www/SAP-Python/frontend/src/pages/master-admin/analytics/components/RevenueAnalytics.tsx"
"/var/www/SAP-Python/frontend/src/pages/master-admin/analytics/components/GrowthAnalytics.tsx"
"/var/www/SAP-Python/frontend/src/pages/master-admin/analytics/components/AnalyticsOverview.tsx"
"/var/www/SAP-Python/frontend/src/pages/master-admin/analytics/AnalyticsMain.tsx"
"/var/www/SAP-Python/frontend/src/pages/master-admin/ServicesManagement.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/inventory/components/analytics/InventoryAnalytics.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/inventory/components/purchase-orders/PurchaseOrderManager.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/crm/components/AIAnalyticsDashboard.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/crm/components/LeadModal.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/crm/components/CRMDashboard.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/crm/pages/SalesPipeline.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/crm/pages/CampaignsPage.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/crm/pages/OpportunitiesPage.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/hr/components/statutory/GovernmentReturns.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/hr/components/recruitment/JobPostingForm.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/hr/components/recruitment/JobDetailModal.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/hr/components/payroll/PayrollDashboard.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/hr/components/payroll/PayrollCycleForm.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/hr/components/payroll/PayslipDetailView.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/hr/pages/Recruitment.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/hr/pages/Analytics.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/InvoiceView.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/ProformaInvoiceView.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/SophisticatedPOModal.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/PaymentForm.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/PaymentGatewayTab.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/PaymentList.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/QuotationDetail.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/InvoiceList.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/ProductDetail.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/CustomerLedger.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/ProformaInvoiceList.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/CustomerDetail.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/components/AdvancedAnalyticsDashboard.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/pages/Products.tsx"
"/var/www/SAP-Python/frontend/src/pages/services/finance/pages/Invoices.tsx"
"/var/www/SAP-Python/frontend/src/pages/company/DetailedInfoForm.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    # Replace DollarSign with IndianRupee in imports
    sed -i 's/DollarSign/IndianRupee/g' "$file"
    echo "✓ Updated: $file"
  else
    echo "✗ Not found: $file"
  fi
done

echo ""
echo "✅ Replacement complete! All DollarSign icons replaced with IndianRupee (₹)"
