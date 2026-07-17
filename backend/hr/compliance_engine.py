from datetime import timedelta
from decimal import Decimal
import logging

from django.db.models import Q
from django.utils import timezone

from .models import Employee
from .statutory_models import (
    ComplianceAlert,
    EmployeeStatutoryDetails,
    GovernmentReturn,
    MinimumWageRate,
    StatutorySettings,
)
from .error_handlers import ComplianceError


logger = logging.getLogger(__name__)


class ComplianceEngine:
    """Generate evidence-based statutory readiness and filing alerts."""

    def __init__(self, company):
        self.company = company
        self.settings = StatutorySettings.objects.filter(company=company).first()
        self.today = timezone.localdate()

    @staticmethod
    def _statutory_details(employee):
        try:
            return employee.statutory_details
        except EmployeeStatutoryDetails.DoesNotExist:
            return None

    def _active_employees(self):
        return Employee.objects.filter(company=self.company, status='active').select_related(
            'statutory_details'
        )

    def run_compliance_checks(self):
        """Run enabled checks and update unresolved alerts without duplicating them."""
        try:
            alerts = []
            if not self.settings:
                alerts.append(self._alert(
                    'compliance_violation',
                    'high',
                    'Statutory settings are not configured',
                    'Configure the statutory schemes applicable to this company before payroll processing.',
                    self.today + timedelta(days=3),
                ))
            else:
                if self.settings.pf_enabled:
                    alerts.extend(self._check_pf_compliance())
                if self.settings.esi_enabled:
                    alerts.extend(self._check_esi_compliance())
                if self.settings.pt_enabled and not self.settings.pt_registration_number:
                    alerts.append(self._alert(
                        'compliance_violation', 'high', 'Professional Tax registration missing',
                        'Professional Tax is enabled, but the company registration number is missing.',
                        self.today + timedelta(days=7),
                    ))
                if self.settings.tds_enabled and not self.settings.tan_number:
                    alerts.append(self._alert(
                        'compliance_violation', 'high', 'TAN registration missing',
                        'TDS is enabled, but the company TAN is missing.',
                        self.today + timedelta(days=7),
                    ))
                alerts.extend(self._check_return_deadlines())

            alerts.extend(self._check_minimum_wage_compliance())
            saved = [self._save_alert(alert) for alert in alerts]
            logger.info(
                'Compliance check completed for company %s: %s active issues',
                self.company.id,
                len(saved),
            )
            return saved
        except Exception as exc:
            logger.exception('Compliance check failed for company %s', self.company.id)
            raise ComplianceError('Compliance check failed', 'COMPLIANCE_CHECK_ERROR') from exc

    def _alert(self, alert_type, priority, title, message, due_date=None):
        return {
            'company': self.company,
            'alert_type': alert_type,
            'priority': priority,
            'title': title,
            'message': message,
            'due_date': due_date,
        }

    def _save_alert(self, alert):
        lookup = {
            'company': self.company,
            'title': alert['title'],
            'is_resolved': False,
        }
        defaults = {key: value for key, value in alert.items() if key not in {'company', 'title'}}
        instance, _ = ComplianceAlert.objects.update_or_create(**lookup, defaults=defaults)
        return instance

    def _check_pf_compliance(self):
        alerts = []
        ceiling = Decimal(self.settings.pf_ceiling)
        for employee in self._active_employees():
            details = self._statutory_details(employee)
            has_pf_identity = bool(
                employee.uan_number
                or employee.pf_number
                or (details and (details.uan_number or details.pf_account_number))
            )
            # A new employee at or below the configured wage ceiling requires enrollment.
            if employee.base_salary <= ceiling and not has_pf_identity:
                alerts.append(self._alert(
                    'compliance_violation',
                    'high',
                    f'PF enrollment missing - {employee.employee_id}',
                    f'UAN/PF account is missing for {employee.full_name}.',
                    self.today + timedelta(days=7),
                ))
        return alerts

    def _check_esi_compliance(self):
        alerts = []
        ceiling = Decimal(self.settings.esi_ceiling)
        for employee in self._active_employees():
            details = self._statutory_details(employee)
            has_esi_identity = bool(employee.esi_number or (details and details.esi_ip_number))
            if employee.base_salary <= ceiling and not has_esi_identity:
                alerts.append(self._alert(
                    'compliance_violation',
                    'high',
                    f'ESI enrollment missing - {employee.employee_id}',
                    f'ESI insurance number is missing for {employee.full_name}.',
                    self.today + timedelta(days=7),
                ))
        return alerts

    def _check_return_deadlines(self):
        enabled_types = set()
        if self.settings.pf_enabled:
            enabled_types.add('pf_ecr')
        if self.settings.esi_enabled:
            enabled_types.add('esi_return')
        if self.settings.pt_enabled:
            enabled_types.add('pt_return')
        if self.settings.tds_enabled:
            enabled_types.add('tds_24q')

        alerts = []
        returns = GovernmentReturn.objects.filter(
            company=self.company,
            return_type__in=enabled_types,
            status__in=['pending', 'generated', 'overdue', 'rejected'],
            due_date__lte=self.today + timedelta(days=7),
        )
        for filing in returns:
            overdue = filing.due_date < self.today
            priority = 'critical' if overdue or filing.status == 'rejected' else 'high'
            state = 'overdue' if overdue else 'due soon'
            alerts.append(self._alert(
                'filing_due',
                priority,
                f'{filing.get_return_type_display()} {filing.period_month:02d}/{filing.period_year} {state}',
                f'Return status is {filing.get_status_display()} and due date is {filing.due_date:%d %b %Y}.',
                filing.due_date,
            ))
        return alerts

    def _check_minimum_wage_compliance(self):
        alerts = []
        missing_rates = set()
        for employee in self._active_employees():
            details = self._statutory_details(employee)
            state = (employee.permanent_state or employee.state or '').strip()
            category = details.wage_category if details else 'skilled'
            if not state:
                alerts.append(self._alert(
                    'compliance_violation', 'medium',
                    f'Employee state missing - {employee.employee_id}',
                    f'Permanent state is required to validate minimum wage for {employee.full_name}.',
                    self.today + timedelta(days=14),
                ))
                continue

            rate = MinimumWageRate.objects.filter(
                state__iexact=state,
                category=category,
                is_active=True,
                effective_from__lte=self.today,
            ).filter(
                # An open-ended rate or a rate still effective today.
                Q(effective_to__isnull=True) | Q(effective_to__gte=self.today)
            ).order_by('-effective_from').first()
            if not rate:
                missing_rates.add((state, category))
                continue
            if employee.base_salary < rate.monthly_rate:
                alerts.append(self._alert(
                    'wage_violation', 'critical',
                    f'Minimum wage violation - {employee.employee_id}',
                    f'{employee.full_name} salary is below the configured {state} {category} minimum wage.',
                    self.today + timedelta(days=1),
                ))

        for state, category in sorted(missing_rates):
            alerts.append(self._alert(
                'compliance_violation', 'medium',
                f'Minimum wage rate missing - {state} / {category}',
                'Add a current minimum wage rate before treating payroll as compliance-ready.',
                self.today + timedelta(days=14),
            ))
        return alerts


class ComplianceScheduler:
    """Create only the supported compliance monitoring schedule."""

    @staticmethod
    def schedule_compliance_checks():
        from django_celery_beat.models import CrontabSchedule, PeriodicTask

        schedule, _ = CrontabSchedule.objects.get_or_create(minute=0, hour=8)
        PeriodicTask.objects.get_or_create(
            name='Daily Compliance Check',
            task='hr.tasks.run_compliance_checks',
            crontab=schedule,
            defaults={'enabled': True},
        )
