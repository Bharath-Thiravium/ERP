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
    
    def get_statutory_settings(self):
        """Get company statutory settings with error handling"""
        try:
            return StatutorySettings.objects.get(company=self.company)
        except StatutorySettings.DoesNotExist:
            logger.warning(f"No statutory settings found for company {self.company.id}, using defaults")
            return StatutorySettings(
                company=self.company,
                pf_enabled=True,
                pf_employee_rate=Decimal('12.00'),
                pf_employer_rate=Decimal('12.00'),
                pf_ceiling=Decimal('15000'),
                esi_enabled=True,
                esi_employee_rate=Decimal('0.75'),
                esi_employer_rate=Decimal('3.25'),
                esi_ceiling=Decimal('21000'),
                pt_enabled=True,
                pt_state='Maharashtra',
                tds_enabled=True
            )
        except Exception as e:
            logger.error(f"Error getting statutory settings: {str(e)}")
            raise ComplianceError("Failed to retrieve statutory settings", "SETTINGS_ERROR")
    
    def calculate_pf(self, employee, basic_salary, present_days, working_days):
        """Enhanced PF calculation with ceiling and eligibility checks"""
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
            if not all(isinstance(x, (int, float, Decimal)) for x in [basic_salary, present_days, working_days]):
                raise ComplianceError("Invalid input types for PF calculation", "INVALID_INPUT")
            
            if working_days <= 0:
                raise ComplianceError("Working days must be greater than 0", "INVALID_WORKING_DAYS")
            
            # Calculate PF wages (attendance-based basic salary)
            attendance_ratio = SafeCalculator.safe_divide(Decimal(present_days), Decimal(working_days), Decimal('1'))
            pf_wages = SafeCalculator.safe_multiply(basic_salary, attendance_ratio)
        
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
    
    def calculate_esi(self, employee, gross_salary, present_days, working_days):
        """Enhanced ESI calculation with ceiling and eligibility checks"""
        if not self.settings.esi_enabled:
            return {
                'employee_esi': Decimal('0'),
                'employer_esi': Decimal('0'),
                'esi_wages': Decimal('0'),
                'ceiling_applied': False,
                'eligible': False,
                'esi_days': 0
            }
        
        # Calculate ESI wages (attendance-based gross salary)
        attendance_ratio = Decimal(present_days) / Decimal(working_days) if working_days > 0 else Decimal('1')
        esi_wages = gross_salary * attendance_ratio
        
        # Check ESI eligibility (monthly salary <= ceiling)
        if gross_salary > self.settings.esi_ceiling:
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
            'esi_days': present_days
        }
    
    def calculate_professional_tax(self, employee, gross_salary):
        """Enhanced state-wise professional tax calculation"""
        if not self.settings.pt_enabled:
            return {
                'professional_tax': Decimal('0'),
                'pt_slab': '',
                'exemption_applied': False,
                'state': self.settings.pt_state
            }
        
        state = self.settings.pt_state
        pt_amount = Decimal('0')
        pt_slab = ''
        exemption_applied = False
        
        if state == 'Maharashtra':
            if gross_salary <= 5000:
                pt_amount = Decimal('0')
                pt_slab = 'Exempt'
                exemption_applied = True
            elif gross_salary <= 10000:
                pt_amount = Decimal('175')
                pt_slab = '₹5,001 - ₹10,000'
            else:
                pt_amount = Decimal('200')
                pt_slab = 'Above ₹10,000'
        
        elif state == 'Karnataka':
            if gross_salary <= 15000:
                pt_amount = Decimal('200')
                pt_slab = 'Up to ₹15,000'
            else:
                pt_amount = Decimal('300')
                pt_slab = 'Above ₹15,000'
        
        elif state == 'West Bengal':
            if gross_salary <= 10000:
                pt_amount = Decimal('110')
                pt_slab = 'Up to ₹10,000'
            elif gross_salary <= 15000:
                pt_amount = Decimal('130')
                pt_slab = '₹10,001 - ₹15,000'
            else:
                pt_amount = Decimal('150')
                pt_slab = 'Above ₹15,000'
        
        elif state == 'Assam':
            if gross_salary <= 10000:
                pt_amount = Decimal('150')
                pt_slab = 'Up to ₹10,000'
            else:
                pt_amount = Decimal('200')
                pt_slab = 'Above ₹10,000'
        
        elif state == 'Gujarat':
            if gross_salary <= 6000:
                pt_amount = Decimal('0')
                pt_slab = 'Exempt'
                exemption_applied = True
            elif gross_salary <= 9000:
                pt_amount = Decimal('80')
                pt_slab = '₹6,001 - ₹9,000'
            else:
                pt_amount = Decimal('150')
                pt_slab = 'Above ₹9,000'
        
        elif state == 'Tamil Nadu':
            if gross_salary <= 21000:
                pt_amount = Decimal('200')
                pt_slab = 'Up to ₹21,000'
            else:
                pt_amount = Decimal('300')
                pt_slab = 'Above ₹21,000'
        
        return {
            'professional_tax': pt_amount,
            'pt_slab': pt_slab,
            'exemption_applied': exemption_applied,
            'state': state
        }
    
    def calculate_tds(self, employee, annual_gross, hra_exemption=None, investments=None):
        """Enhanced TDS calculation with exemptions and deductions"""
        if not self.settings.tds_enabled:
            return {
                'monthly_tds': Decimal('0'),
                'annual_tds': Decimal('0'),
                'taxable_income': Decimal('0'),
                'tax_slab': 'No Tax',
                'hra_exemption': Decimal('0'),
                'standard_deduction': Decimal('0')
            }
        
        # Standard deduction (₹50,000 for FY 2023-24)
        standard_deduction = Decimal('50000')
        
        # HRA exemption calculation
        if hra_exemption is None:
            # Calculate HRA exemption (simplified)
            annual_basic = annual_gross * Decimal('0.5')  # Assuming 50% is basic
            annual_hra = annual_gross * Decimal('0.25')   # Assuming 25% is HRA
            
            # HRA exemption is minimum of:
            # 1. Actual HRA received
            # 2. 50% of basic (metro) or 40% (non-metro) - assuming metro
            # 3. Rent paid - 10% of basic (assuming no rent details)
            
            metro_exemption = annual_basic * Decimal('0.5')
            hra_exemption = min(annual_hra, metro_exemption)
        
        # Calculate taxable income
        taxable_income = annual_gross - standard_deduction - hra_exemption
        
        # Apply investment deductions (80C, etc.) - simplified
        if investments:
            taxable_income -= min(investments, Decimal('150000'))  # Max 80C limit
        
        # Calculate tax as per current slabs (FY 2023-24)
        annual_tax = Decimal('0')
        tax_slab = 'No Tax'
        
        if taxable_income <= 250000:
            annual_tax = Decimal('0')
            tax_slab = 'No Tax'
        elif taxable_income <= 500000:
            annual_tax = (taxable_income - 250000) * Decimal('0.05')
            tax_slab = '5%'
        elif taxable_income <= 750000:
            annual_tax = 12500 + (taxable_income - 500000) * Decimal('0.10')
            tax_slab = '10%'
        elif taxable_income <= 1000000:
            annual_tax = 37500 + (taxable_income - 750000) * Decimal('0.15')
            tax_slab = '15%'
        elif taxable_income <= 1250000:
            annual_tax = 75000 + (taxable_income - 1000000) * Decimal('0.20')
            tax_slab = '20%'
        elif taxable_income <= 1500000:
            annual_tax = 125000 + (taxable_income - 1250000) * Decimal('0.25')
            tax_slab = '25%'
        else:
            annual_tax = 187500 + (taxable_income - 1500000) * Decimal('0.30')
            tax_slab = '30%'
        
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
        if overtime_hours <= 0:
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
    basic_salary = payslip.employee.base_salary * attendance_ratio
    
    # Calculate allowances
    hra = basic_salary * Decimal('0.50')  # 50% of basic
    conveyance = Decimal('1600')
    medical = Decimal('1250')
    special = basic_salary * Decimal('0.20')  # 20% of basic
    
    # Calculate overtime
    overtime_calc = calculator.calculate_overtime(
        payslip.employee, 
        float(payslip.overtime_hours), 
        basic_salary, 
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
    esi_calc = calculator.calculate_esi(
        payslip.employee, 
        gross_salary, 
        payslip.present_days, 
        payslip.working_days
    )
    
    # Enhanced Professional Tax calculation
    pt_calc = calculator.calculate_professional_tax(payslip.employee, gross_salary)
    
    # Enhanced TDS calculation
    annual_gross = gross_salary * 12
    tds_calc = calculator.calculate_tds(payslip.employee, annual_gross, hra * 12)
    
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