"""
Enhanced statutory calculations for Indian compliance
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, datetime
from .statutory_models import StatutorySettings, MinimumWageRate
from .error_handlers import SafeCalculator, ComplianceError
import logging

logger = logging.getLogger(__name__)


class StatutoryCalculator:
    """Enhanced statutory calculations for Indian compliance"""
    
    def __init__(self, company):
        self.company = company
        self.settings = self.get_statutory_settings()

    @staticmethod
    def _safe_decimal(value, field_name):
        try:
            return max(Decimal(str(value)), Decimal('0'))
        except (TypeError, ValueError, ArithmeticError):
            raise ComplianceError(
                f'Invalid value for {field_name}',
                'INVALID_INPUT',
            )
    
    def get_statutory_settings(self):
        """Get persisted company settings without silently enabling deductions."""
        try:
            settings, created = StatutorySettings.objects.get_or_create(
                company=self.company,
                defaults={
                    'pf_enabled': False,
                    'esi_enabled': False,
                    'pt_enabled': False,
                    'tds_enabled': False,
                    'overtime_enabled': False,
                },
            )
            if created:
                logger.warning(
                    "Created disabled statutory settings for company %s; HR must configure them",
                    self.company.id,
                )
            return settings
        except Exception as e:
            logger.error(f"Error getting statutory settings: {str(e)}")
            raise ComplianceError("Failed to retrieve statutory settings", "SETTINGS_ERROR")
    
    def calculate_pf(self, employee, basic_salary, present_days=None, working_days=None):
        """Calculate PF once on the already-earned basic wage."""
        try:
            if not self.settings.pf_enabled:
                return {
                    'employee_pf': Decimal('0'),
                    'employer_pf': Decimal('0'),
                    'eps_contribution': Decimal('0'),
                    'pf_wages': Decimal('0'),
                    'ceiling_applied': False,
                    'eligible': False
                }
            
            # Validate inputs
            if not isinstance(basic_salary, (int, float, Decimal)):
                raise ComplianceError("Invalid input types for PF calculation", "INVALID_INPUT")
            pf_wages = max(Decimal(str(basic_salary)), Decimal('0'))

            statutory_details = getattr(employee, 'statutory_details', None)
            existing_member = bool(
                getattr(employee, 'uan_number', '')
                or getattr(employee, 'pf_number', '')
                or getattr(statutory_details, 'uan_number', '')
                or getattr(statutory_details, 'pf_account_number', '')
            )
            if not existing_member and Decimal(str(employee.base_salary or 0)) > self.settings.pf_ceiling:
                return {
                    'employee_pf': Decimal('0'), 'employer_pf': Decimal('0'),
                    'eps_contribution': Decimal('0'), 'pf_wages': Decimal('0'),
                    'ceiling_applied': False, 'eligible': False,
                }

            # Apply PF ceiling
            ceiling_applied = False
            if pf_wages > self.settings.pf_ceiling:
                pf_wages = self.settings.pf_ceiling
                ceiling_applied = True

            # Calculate contributions
            employee_pf = (pf_wages * self.settings.pf_employee_rate / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            employer_pf = (pf_wages * self.settings.pf_employer_rate / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # EPS contribution (8.33% of PF wages, max ₹1,250)
            eps_rate = Decimal('8.33')
            eps_contribution = (pf_wages * eps_rate / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            if eps_contribution > Decimal('1250'):
                eps_contribution = Decimal('1250')

            return {
                'employee_pf': employee_pf,
                'employer_pf': employer_pf,
                'eps_contribution': eps_contribution,
                'pf_wages': pf_wages,
                'ceiling_applied': ceiling_applied,
                'eligible': True
            }
        except ComplianceError:
            raise
        except Exception as e:
            logger.error(f"Error in PF calculation: {str(e)}")
            raise ComplianceError("PF calculation failed", "PF_CALC_ERROR")
    
    def calculate_esi(
        self, employee, gross_salary, present_days=None, working_days=None,
        eligibility_wages=None,
    ):
        """Calculate ESI on earned wages; test eligibility on regular monthly wages."""
        if not self.settings.esi_enabled:
            return {
                'employee_esi': Decimal('0'),
                'employer_esi': Decimal('0'),
                'esi_wages': Decimal('0'),
                'ceiling_applied': False,
                'eligible': False,
                'esi_days': 0
            }
        
        esi_wages = max(Decimal(str(gross_salary)), Decimal('0'))
        regular_wages = Decimal(str(eligibility_wages if eligibility_wages is not None else gross_salary))
        if regular_wages > self.settings.esi_ceiling:
            return {
                'employee_esi': Decimal('0'),
                'employer_esi': Decimal('0'),
                'esi_wages': Decimal('0'),
                'ceiling_applied': True,
                'eligible': False,
                'esi_days': 0
            }
        
        # Calculate contributions
        employee_esi = (esi_wages * self.settings.esi_employee_rate / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        employer_esi = (esi_wages * self.settings.esi_employer_rate / 100).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        return {
            'employee_esi': employee_esi,
            'employer_esi': employer_esi,
            'esi_wages': esi_wages,
            'ceiling_applied': False,
            'eligible': True,
            'esi_days': int(present_days or 0)
        }
    
    def calculate_professional_tax(self, employee, gross_salary):
        """Calculate PT from company-verified monthly salary slabs."""
        if not self.settings.pt_enabled:
            return {
                'professional_tax': Decimal('0'),
                'pt_slab': '',
                'exemption_applied': False,
                'state': self.settings.pt_state
            }
        
        state = self.settings.pt_state
        gross_salary = self._safe_decimal(gross_salary, 'gross_salary')
        pt_amount = Decimal('0')
        pt_slab = 'No matching configured slab'
        for slab in self.settings.pt_slabs or []:
            minimum = Decimal(str(slab.get('min_salary', 0)))
            maximum_value = slab.get('max_salary')
            maximum = Decimal(str(maximum_value)) if maximum_value not in (None, '') else None
            if gross_salary >= minimum and (maximum is None or gross_salary <= maximum):
                pt_amount = Decimal(str(slab.get('amount', 0))).quantize(Decimal('0.01'))
                pt_slab = (
                    f'{minimum:,.2f} and above'
                    if maximum is None
                    else f'{minimum:,.2f} - {maximum:,.2f}'
                )
                break
        
        return {
            'professional_tax': pt_amount,
            'pt_slab': pt_slab,
            'exemption_applied': pt_amount == 0,
            'state': state
        }
    
    def calculate_tds(self, employee, annual_gross, hra_exemption=None, investments=None):
        """Calculate monthly TDS using the default new-regime FY 2025-26 slabs."""
        if not self.settings.tds_enabled:
            return {
                'monthly_tds': Decimal('0'),
                'annual_tds': Decimal('0'),
                'taxable_income': Decimal('0'),
                'tax_slab': 'No Tax',
                'hra_exemption': Decimal('0'),
                'standard_deduction': Decimal('0')
            }
        
        annual_gross = max(Decimal(str(annual_gross)), Decimal('0'))
        standard_deduction = Decimal('75000')
        hra_exemption = Decimal('0')
        taxable_income = max(annual_gross - standard_deduction, Decimal('0'))

        slabs = (
            (Decimal('400000'), Decimal('0')),
            (Decimal('800000'), Decimal('0.05')),
            (Decimal('1200000'), Decimal('0.10')),
            (Decimal('1600000'), Decimal('0.15')),
            (Decimal('2000000'), Decimal('0.20')),
            (Decimal('2400000'), Decimal('0.25')),
        )
        annual_tax = Decimal('0')
        lower = Decimal('0')
        tax_slab = 'No Tax'
        for upper, rate in slabs:
            taxable_band = min(max(taxable_income - lower, Decimal('0')), upper - lower)
            annual_tax += taxable_band * rate
            if taxable_income > lower:
                tax_slab = f'{int(rate * 100)}%'
            lower = upper
        if taxable_income > lower:
            annual_tax += (taxable_income - lower) * Decimal('0.30')
            tax_slab = '30%'

        if taxable_income <= Decimal('1200000'):
            annual_tax = Decimal('0')
            tax_slab = 'Rebate (87A)'
        
        # Add Health and Education Cess (4%)
        annual_tax = annual_tax * Decimal('1.04')
        
        # Monthly TDS
        monthly_tds = (annual_tax / 12).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        return {
            'monthly_tds': monthly_tds,
            'annual_tds': annual_tax.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            'taxable_income': taxable_income.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            'tax_slab': tax_slab,
            'hra_exemption': hra_exemption.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            'standard_deduction': standard_deduction
        }
    
    def validate_minimum_wage(self, employee, monthly_salary):
        """Validate minimum wage compliance"""
        try:
            # Get applicable minimum wage rate
            min_wage = MinimumWageRate.objects.filter(
                state=employee.state or 'Maharashtra',
                category=getattr(employee.statutory_details, 'wage_category', 'skilled') if hasattr(employee, 'statutory_details') else 'skilled',
                is_active=True,
                effective_from__lte=date.today()
            ).order_by('-effective_from').first()
            
            if not min_wage:
                return {
                    'is_compliant': True,
                    'minimum_wage': Decimal('0'),
                    'current_wage': monthly_salary,
                    'difference': Decimal('0'),
                    'message': 'No minimum wage data available'
                }
            
            is_compliant = monthly_salary >= min_wage.monthly_rate
            difference = monthly_salary - min_wage.monthly_rate
            
            return {
                'is_compliant': is_compliant,
                'minimum_wage': min_wage.monthly_rate,
                'current_wage': monthly_salary,
                'difference': difference,
                'message': 'Compliant' if is_compliant else f'Below minimum wage by ₹{abs(difference)}'
            }
            
        except Exception as e:
            return {
                'is_compliant': True,
                'minimum_wage': Decimal('0'),
                'current_wage': monthly_salary,
                'difference': Decimal('0'),
                'message': f'Error validating minimum wage: {str(e)}'
            }
    
    def calculate_overtime(self, employee, overtime_hours, basic_salary, working_days):
        """Calculate overtime amount as per labor laws"""
        if not self.settings.overtime_enabled or overtime_hours <= 0:
            return {
                'overtime_amount': Decimal('0'),
                'overtime_rate': Decimal('0'),
                'overtime_hours': Decimal('0')
            }
        
        # Calculate hourly rate (basic salary / (working days * 8 hours))
        total_working_hours = working_days * 8
        hourly_rate = basic_salary / total_working_hours if total_working_hours > 0 else Decimal('0')
        
        # Overtime rate (double the normal rate as per law)
        overtime_rate = hourly_rate * self.settings.overtime_rate_multiplier
        overtime_amount = (overtime_rate * overtime_hours).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        return {
            'overtime_amount': overtime_amount,
            'overtime_rate': overtime_rate.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            'overtime_hours': Decimal(str(overtime_hours))
        }
    
    def calculate_working_hours_compliance(self, employee, daily_hours, weekly_hours):
        """Check working hours compliance as per Shops & Establishments Act"""
        max_daily_hours = self.settings.working_hours_per_day
        max_weekly_hours = self.settings.working_hours_per_day * self.settings.working_days_per_week
        
        daily_compliant = daily_hours <= max_daily_hours
        weekly_compliant = weekly_hours <= max_weekly_hours
        
        violations = []
        if not daily_compliant:
            violations.append(f'Daily hours ({daily_hours}) exceed limit ({max_daily_hours})')
        if not weekly_compliant:
            violations.append(f'Weekly hours ({weekly_hours}) exceed limit ({max_weekly_hours})')
        
        return {
            'is_compliant': daily_compliant and weekly_compliant,
            'daily_compliant': daily_compliant,
            'weekly_compliant': weekly_compliant,
            'violations': violations,
            'max_daily_hours': max_daily_hours,
            'max_weekly_hours': max_weekly_hours
        }


def calculate_enhanced_payslip(payslip):
    """Calculate payslip with enhanced statutory compliance"""
    calculator = StatutoryCalculator(payslip.employee.company)
    
    # Basic calculations (existing)
    attendance_ratio = Decimal(payslip.present_days) / Decimal(payslip.working_days) if payslip.working_days > 0 else Decimal('1')
    attendance_ratio = min(max(attendance_ratio, Decimal('0')), Decimal('1'))
    regular_basic = Decimal(payslip.employee.base_salary or 0)
    basic_salary = regular_basic * attendance_ratio
    
    # Calculate allowances
    hra = basic_salary * Decimal('0.50')  # 50% of basic
    conveyance = Decimal('1600') * attendance_ratio
    medical = Decimal('1250') * attendance_ratio
    special = basic_salary * Decimal('0.20')  # 20% of basic
    
    # Calculate overtime
    overtime_calc = calculator.calculate_overtime(
        payslip.employee, 
        float(payslip.overtime_hours), 
        regular_basic,
        payslip.working_days
    )
    
    # Gross salary
    gross_salary = (
        basic_salary + hra + conveyance + medical + special + 
        overtime_calc['overtime_amount'] + payslip.bonus + payslip.incentive + payslip.other_earnings
    )
    
    # Enhanced PF calculation
    pf_calc = calculator.calculate_pf(
        payslip.employee, 
        basic_salary, 
        payslip.present_days, 
        payslip.working_days
    )
    
    # Enhanced ESI calculation
    regular_gross = regular_basic + (regular_basic * Decimal('0.50')) + Decimal('1600') + Decimal('1250') + (regular_basic * Decimal('0.20'))
    esi_calc = calculator.calculate_esi(
        payslip.employee, 
        gross_salary, 
        payslip.present_days, 
        payslip.working_days,
        eligibility_wages=regular_gross,
    )
    
    # Enhanced Professional Tax calculation
    pt_calc = calculator.calculate_professional_tax(payslip.employee, gross_salary)
    
    # Enhanced TDS calculation
    annual_gross = regular_gross * 12 + payslip.bonus + payslip.incentive + payslip.other_earnings
    tds_calc = calculator.calculate_tds(payslip.employee, annual_gross)
    
    # Update payslip with enhanced calculations
    payslip.basic_salary = basic_salary.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    payslip.hra = hra.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    payslip.conveyance_allowance = conveyance
    payslip.medical_allowance = medical
    payslip.special_allowance = special.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    payslip.overtime_amount = overtime_calc['overtime_amount']
    payslip.gross_salary = gross_salary.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    # Statutory deductions
    payslip.pf_employee = pf_calc['employee_pf']
    payslip.pf_employer = pf_calc['employer_pf']
    payslip.esi_employee = esi_calc['employee_esi']
    payslip.esi_employer = esi_calc['employer_esi']
    payslip.professional_tax = pt_calc['professional_tax']
    payslip.tds = tds_calc['monthly_tds']
    
    # Total deductions
    payslip.total_deductions = (
        payslip.pf_employee + payslip.esi_employee + payslip.professional_tax + 
        payslip.tds + payslip.loan_deduction + payslip.advance_deduction + payslip.other_deductions
    )
    
    # Net salary and CTC
    payslip.net_salary = payslip.gross_salary - payslip.total_deductions
    payslip.ctc = payslip.gross_salary + payslip.pf_employer + payslip.esi_employer
    
    # Create or update statutory details
    from .statutory_models import PayslipStatutoryDetails
    statutory_details, created = PayslipStatutoryDetails.objects.get_or_create(
        payslip=payslip,
        defaults={
            'pf_wages': pf_calc['pf_wages'],
            'pf_ceiling_applied': pf_calc['ceiling_applied'],
            'eps_contribution': pf_calc['eps_contribution'],
            'esi_wages': esi_calc['esi_wages'],
            'esi_ceiling_applied': esi_calc['ceiling_applied'],
            'esi_days': esi_calc['esi_days'],
            'hra_exemption': tds_calc['hra_exemption'],
            'standard_deduction': tds_calc['standard_deduction'],
            'taxable_income': tds_calc['taxable_income'],
            'tax_slab': tds_calc['tax_slab'],
            'pt_state': pt_calc['state'],
            'pt_slab': pt_calc['pt_slab'],
            'pt_exemption_applied': pt_calc['exemption_applied'],
            'working_days_in_month': payslip.working_days,
            'overtime_hours_calculated': overtime_calc['overtime_hours'],
            'overtime_rate_applied': overtime_calc['overtime_rate']
        }
    )
    
    if not created:
        # Update existing record
        statutory_details.pf_wages = pf_calc['pf_wages']
        statutory_details.pf_ceiling_applied = pf_calc['ceiling_applied']
        statutory_details.eps_contribution = pf_calc['eps_contribution']
        statutory_details.esi_wages = esi_calc['esi_wages']
        statutory_details.esi_ceiling_applied = esi_calc['ceiling_applied']
        statutory_details.esi_days = esi_calc['esi_days']
        statutory_details.hra_exemption = tds_calc['hra_exemption']
        statutory_details.standard_deduction = tds_calc['standard_deduction']
        statutory_details.taxable_income = tds_calc['taxable_income']
        statutory_details.tax_slab = tds_calc['tax_slab']
        statutory_details.pt_state = pt_calc['state']
        statutory_details.pt_slab = pt_calc['pt_slab']
        statutory_details.pt_exemption_applied = pt_calc['exemption_applied']
        statutory_details.working_days_in_month = payslip.working_days
        statutory_details.overtime_hours_calculated = overtime_calc['overtime_hours']
        statutory_details.overtime_rate_applied = overtime_calc['overtime_rate']
        statutory_details.save()
    
    payslip.save()
    return payslip
