"""
Comprehensive validation for HR compliance system
"""
from django.core.exceptions import ValidationError
from decimal import Decimal
import re
from datetime import date, datetime


class ComplianceValidators:
    """Validation utilities for compliance data"""
    
    @staticmethod
    def validate_uan_number(uan):
        """Validate UAN number format (12 digits)"""
        if not uan:
            return True  # Optional field
        
        if not re.match(r'^\d{12}$', str(uan)):
            raise ValidationError("UAN must be exactly 12 digits")
        return True
    
    @staticmethod
    def validate_esi_number(esi_number):
        """Validate ESI number format (17 digits)"""
        if not esi_number:
            return True  # Optional field
        
        if not re.match(r'^\d{17}$', str(esi_number)):
            raise ValidationError("ESI number must be exactly 17 digits")
        return True
    
    @staticmethod
    def validate_pan_number(pan):
        """Validate PAN number format"""
        if not pan:
            return True  # Optional field
        
        if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', pan.upper()):
            raise ValidationError("Invalid PAN format. Should be AAAAA9999A")
        return True
    
    @staticmethod
    def validate_tan_number(tan):
        """Validate TAN number format"""
        if not tan:
            return True  # Optional field
        
        if not re.match(r'^[A-Z]{4}[0-9]{5}[A-Z]{1}$', tan.upper()):
            raise ValidationError("Invalid TAN format. Should be AAAA99999A")
        return True
    
    @staticmethod
    def validate_salary_amount(amount):
        """Validate salary amount"""
        if amount is None:
            return True
        
        if not isinstance(amount, (int, float, Decimal)):
            raise ValidationError("Salary must be a number")
        
        if Decimal(str(amount)) < 0:
            raise ValidationError("Salary cannot be negative")
        
        if Decimal(str(amount)) > Decimal('10000000'):  # 1 Crore limit
            raise ValidationError("Salary amount too high")
        
        return True
    
    @staticmethod
    def validate_percentage(percentage):
        """Validate percentage values"""
        if percentage is None:
            return True
        
        if not isinstance(percentage, (int, float, Decimal)):
            raise ValidationError("Percentage must be a number")
        
        if Decimal(str(percentage)) < 0 or Decimal(str(percentage)) > 100:
            raise ValidationError("Percentage must be between 0 and 100")
        
        return True
    
    @staticmethod
    def validate_working_days(days):
        """Validate working days"""
        if days is None:
            return True
        
        if not isinstance(days, int):
            raise ValidationError("Working days must be an integer")
        
        if days < 0 or days > 31:
            raise ValidationError("Working days must be between 0 and 31")
        
        return True
    
    @staticmethod
    def validate_financial_year(fy_string):
        """Validate financial year format (YYYY-YY)"""
        if not fy_string:
            return True
        
        if not re.match(r'^\d{4}-\d{2}$', fy_string):
            raise ValidationError("Financial year format should be YYYY-YY (e.g., 2023-24)")
        
        start_year, end_year_suffix = fy_string.split('-')
        expected_end = str(int(start_year) + 1)[-2:]
        
        if end_year_suffix != expected_end:
            raise ValidationError("Invalid financial year. End year should be next year")
        
        return True
    
    @staticmethod
    def validate_return_period(month, year):
        """Validate return period"""
        if not isinstance(month, int) or not isinstance(year, int):
            raise ValidationError("Month and year must be integers")
        
        if month < 1 or month > 12:
            raise ValidationError("Month must be between 1 and 12")
        
        current_year = date.today().year
        if year < 2020 or year > current_year + 1:
            raise ValidationError(f"Year must be between 2020 and {current_year + 1}")
        
        return True


class DataIntegrityValidator:
    """Validate data integrity for compliance calculations"""
    
    @staticmethod
    def validate_pf_calculation_data(employee, basic_salary, present_days, working_days):
        """Validate PF calculation input data"""
        errors = []
        
        if not employee:
            errors.append("Employee is required")
        
        try:
            ComplianceValidators.validate_salary_amount(basic_salary)
        except ValidationError as e:
            errors.append(f"Basic salary: {str(e)}")
        
        try:
            ComplianceValidators.validate_working_days(present_days)
        except ValidationError as e:
            errors.append(f"Present days: {str(e)}")
        
        try:
            ComplianceValidators.validate_working_days(working_days)
        except ValidationError as e:
            errors.append(f"Working days: {str(e)}")
        
        if present_days and working_days and present_days > working_days:
            errors.append("Present days cannot exceed working days")
        
        if errors:
            raise ValidationError("; ".join(errors))
        
        return True
    
    @staticmethod
    def validate_statutory_settings(settings_data):
        """Validate statutory settings data"""
        errors = []
        
        # Validate PF rates
        if 'pf_employee_rate' in settings_data:
            try:
                ComplianceValidators.validate_percentage(settings_data['pf_employee_rate'])
            except ValidationError as e:
                errors.append(f"PF employee rate: {str(e)}")
        
        if 'pf_employer_rate' in settings_data:
            try:
                ComplianceValidators.validate_percentage(settings_data['pf_employer_rate'])
            except ValidationError as e:
                errors.append(f"PF employer rate: {str(e)}")
        
        # Validate ESI rates
        if 'esi_employee_rate' in settings_data:
            try:
                ComplianceValidators.validate_percentage(settings_data['esi_employee_rate'])
            except ValidationError as e:
                errors.append(f"ESI employee rate: {str(e)}")
        
        if 'esi_employer_rate' in settings_data:
            try:
                ComplianceValidators.validate_percentage(settings_data['esi_employer_rate'])
            except ValidationError as e:
                errors.append(f"ESI employer rate: {str(e)}")
        
        # Validate TAN number
        if 'tan_number' in settings_data:
            try:
                ComplianceValidators.validate_tan_number(settings_data['tan_number'])
            except ValidationError as e:
                errors.append(f"TAN number: {str(e)}")
        
        if errors:
            raise ValidationError("; ".join(errors))
        
        return True