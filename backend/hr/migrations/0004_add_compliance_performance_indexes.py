# Generated migration for compliance performance indexes

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('hr', '0003_add_statutory_compliance_models'),
    ]

    operations = [
        # Add indexes for StatutorySettings
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_statutory_settings_company ON hr_statutorysettings(company_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_statutory_settings_company;"
        ),
        
        # Add indexes for ComplianceAlert
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_compliance_alert_company_status ON hr_compliancealert(company_id, is_resolved);",
            reverse_sql="DROP INDEX IF EXISTS idx_compliance_alert_company_status;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_compliance_alert_priority ON hr_compliancealert(priority, created_at);",
            reverse_sql="DROP INDEX IF EXISTS idx_compliance_alert_priority;"
        ),
        
        # Add indexes for GovernmentReturn
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_government_return_company_type ON hr_governmentreturn(company_id, return_type);",
            reverse_sql="DROP INDEX IF EXISTS idx_government_return_company_type;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_government_return_status_date ON hr_governmentreturn(status, due_date);",
            reverse_sql="DROP INDEX IF EXISTS idx_government_return_status_date;"
        ),
        
        # Add indexes for PayslipStatutoryDetails
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_payslip_statutory_payslip ON hr_payslipstatutorydetails(payslip_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_payslip_statutory_payslip;"
        ),
        
        # Add indexes for EmployeeStatutoryDetails
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_employee_statutory_employee ON hr_employeestatutorydetails(employee_id);",
            reverse_sql="DROP INDEX IF EXISTS idx_employee_statutory_employee;"
        ),
    ]