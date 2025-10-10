from django.db import models
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Employee, Company
from .statutory_models import StatutorySettings, ComplianceAlert
import logging

logger = logging.getLogger(__name__)

class ComplianceEngine:
    """Advanced compliance monitoring and automation engine"""
    
    def __init__(self, company):
        self.company = company
        self.statutory_settings = StatutorySettings.objects.filter(company=company).first()
    
    def run_compliance_checks(self):
        """Run all compliance checks and generate alerts"""
        alerts = []
        
        # PF Compliance Checks
        alerts.extend(self._check_pf_compliance())
        
        # ESI Compliance Checks
        alerts.extend(self._check_esi_compliance())
        
        # Professional Tax Checks
        alerts.extend(self._check_pt_compliance())
        
        # TDS Compliance Checks
        alerts.extend(self._check_tds_compliance())
        
        # Labor Law Compliance
        alerts.extend(self._check_labor_law_compliance())
        
        # Save alerts
        for alert_data in alerts:
            ComplianceAlert.objects.create(**alert_data)
        
        return alerts
    
    def _check_pf_compliance(self):
        """Check PF compliance issues"""
        alerts = []
        employees = Employee.objects.filter(company=self.company, status='active')
        
        for emp in employees:
            # Check UAN mapping
            if not hasattr(emp, 'statutory_details') or not emp.statutory_details.uan_number:
                alerts.append({
                    'company': self.company,
                    'alert_type': 'PF_UAN_MISSING',
                    'severity': 'HIGH',
                    'title': f'UAN Missing for {emp.first_name} {emp.last_name}',
                    'description': 'Employee UAN number is not mapped',
                    'employee': emp,
                    'due_date': timezone.now() + timedelta(days=7)
                })
            
            # Check PF eligibility vs enrollment
            if emp.basic_salary >= 15000 and not emp.statutory_details.pf_applicable:
                alerts.append({
                    'company': self.company,
                    'alert_type': 'PF_ENROLLMENT_REQUIRED',
                    'severity': 'HIGH',
                    'title': f'PF Enrollment Required for {emp.first_name} {emp.last_name}',
                    'description': 'Employee eligible for PF but not enrolled',
                    'employee': emp,
                    'due_date': timezone.now() + timedelta(days=3)
                })
        
        return alerts
    
    def _check_esi_compliance(self):
        """Check ESI compliance issues"""
        alerts = []
        employees = Employee.objects.filter(company=self.company, status='active')
        
        for emp in employees:
            if emp.gross_salary <= 21000 and not emp.statutory_details.esi_applicable:
                alerts.append({
                    'company': self.company,
                    'alert_type': 'ESI_ENROLLMENT_REQUIRED',
                    'severity': 'MEDIUM',
                    'title': f'ESI Enrollment Required for {emp.first_name} {emp.last_name}',
                    'description': 'Employee eligible for ESI but not enrolled',
                    'employee': emp,
                    'due_date': timezone.now() + timedelta(days=5)
                })
        
        return alerts
    
    def _check_pt_compliance(self):
        """Check Professional Tax compliance"""
        alerts = []
        
        # Check monthly PT return due dates
        today = timezone.now().date()
        if today.day >= 15:  # PT return due by 15th
            alerts.append({
                'company': self.company,
                'alert_type': 'PT_RETURN_DUE',
                'severity': 'HIGH',
                'title': 'Professional Tax Return Due',
                'description': f'PT return for {today.strftime("%B %Y")} is due',
                'due_date': timezone.now() + timedelta(days=1)
            })
        
        return alerts
    
    def _check_tds_compliance(self):
        """Check TDS compliance issues"""
        alerts = []
        
        # Check quarterly TDS return
        today = timezone.now().date()
        quarter_end_months = [3, 6, 9, 12]
        
        if today.month in quarter_end_months and today.day >= 25:
            alerts.append({
                'company': self.company,
                'alert_type': 'TDS_RETURN_DUE',
                'severity': 'CRITICAL',
                'title': 'Quarterly TDS Return Due',
                'description': f'TDS return for Q{(today.month-1)//3 + 1} is due',
                'due_date': timezone.now() + timedelta(days=5)
            })
        
        return alerts
    
    def _check_labor_law_compliance(self):
        """Check labor law compliance"""
        alerts = []
        
        # Check minimum wage compliance
        employees = Employee.objects.filter(company=self.company, status='active')
        min_wage = 15000  # Example minimum wage
        
        for emp in employees:
            if emp.basic_salary < min_wage:
                alerts.append({
                    'company': self.company,
                    'alert_type': 'MIN_WAGE_VIOLATION',
                    'severity': 'CRITICAL',
                    'title': f'Minimum Wage Violation - {emp.first_name} {emp.last_name}',
                    'description': f'Employee salary below minimum wage of ₹{min_wage}',
                    'employee': emp,
                    'due_date': timezone.now() + timedelta(days=1)
                })
        
        return alerts

class AutomatedReporting:
    """Automated report generation and submission"""
    
    def __init__(self, company):
        self.company = company
    
    def generate_monthly_reports(self):
        """Generate all monthly statutory reports"""
        reports = []
        
        # ECR Report
        reports.append(self._generate_ecr_report())
        
        # ESI Report
        reports.append(self._generate_esi_report())
        
        # PT Challan
        reports.append(self._generate_pt_challan())
        
        return reports
    
    def _generate_ecr_report(self):
        """Generate ECR report for PF"""
        from .form_generators import FormGenerator
        generator = FormGenerator(self.company)
        return generator.generate_ecr_report()
    
    def _generate_esi_report(self):
        """Generate ESI monthly report"""
        from .form_generators import FormGenerator
        generator = FormGenerator(self.company)
        return generator.generate_esi_report()
    
    def _generate_pt_challan(self):
        """Generate PT challan"""
        from .form_generators import FormGenerator
        generator = FormGenerator(self.company)
        return generator.generate_pt_challan()

class ComplianceScheduler:
    """Schedule compliance tasks and reminders"""
    
    @staticmethod
    def schedule_monthly_tasks():
        """Schedule monthly compliance tasks"""
        from django_celery_beat.models import PeriodicTask, CrontabSchedule
        
        # Monthly ECR generation
        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=0, hour=9, day_of_month=1
        )
        
        PeriodicTask.objects.get_or_create(
            name='Generate Monthly ECR',
            task='hr.tasks.generate_monthly_ecr',
            crontab=schedule,
            enabled=True
        )
    
    @staticmethod
    def schedule_compliance_checks():
        """Schedule daily compliance checks"""
        from django_celery_beat.models import PeriodicTask, CrontabSchedule
        
        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=0, hour=8
        )
        
        PeriodicTask.objects.get_or_create(
            name='Daily Compliance Check',
            task='hr.tasks.run_compliance_checks',
            crontab=schedule,
            enabled=True
        )