from django.utils import timezone
from django.db import transaction
from datetime import datetime, timedelta
from .form_automation_models import ComplianceFormTemplate, MonthlyComplianceForm, EmployeeFormEntry
from .models import Employee, Payslip
from authentication.models import Company
import logging

logger = logging.getLogger(__name__)

class FormAutomationService:
    """Service for automated monthly form generation"""
    
    @staticmethod
    def generate_monthly_forms(company_id, month_date=None):
        """Generate monthly forms for all active templates"""
        if month_date is None:
            month_date = timezone.now().date().replace(day=1)
        
        try:
            company = Company.objects.get(id=company_id)
            templates = ComplianceFormTemplate.objects.filter(
                company=company,
                is_active=True,
                is_monthly_auto_generate=True
            )
            
            generated_forms = []
            
            for template in templates:
                form = FormAutomationService._generate_form_for_template(template, month_date)
                if form:
                    generated_forms.append(form)
            
            return generated_forms
            
        except Exception as e:
            logger.error(f"Error generating monthly forms for company {company_id}: {str(e)}")
            raise
    
    @staticmethod
    def generate_form_for_template(template, month_date):
        """Generate form for specific template - public method"""
        return FormAutomationService._generate_form_for_template(template, month_date)
    
    @staticmethod
    def _generate_form_for_template(template, month_date):
        """Generate form for specific template"""
        try:
            with transaction.atomic():
                # Check if form already exists
                existing_form = MonthlyComplianceForm.objects.filter(
                    company=template.company,
                    template=template,
                    month=month_date
                ).first()
                
                if existing_form:
                    logger.info(f"Form already exists: {template.form_type} for {month_date}")
                    return existing_form
                
                # Create monthly form
                monthly_form = MonthlyComplianceForm.objects.create(
                    company=template.company,
                    template=template,
                    month=month_date,
                    status='generated',
                    auto_generated=True
                )
                
                # Generate employee entries
                employees = Employee.objects.filter(
                    company=template.company,
                    status='active'
                )
                
                for employee in employees:
                    FormAutomationService._create_employee_entry(monthly_form, employee, template.form_type)
                
                # Update total employees count
                monthly_form.total_employees = employees.count()
                monthly_form.save()
                
                logger.info(f"Generated form: {template.form_type} for {month_date} with {employees.count()} employees")
                return monthly_form
                
        except Exception as e:
            logger.error(f"Error generating form for template {template.id}: {str(e)}")
            raise
    
    @staticmethod
    def _create_employee_entry(monthly_form, employee, form_type):
        """Create employee entry based on form type"""
        entry_data = {
            'monthly_form': monthly_form,
            'employee': employee,
        }
        
        # Check if template has dynamic structure
        if hasattr(monthly_form.template, 'template_structure') and monthly_form.template.template_structure:
            # Generate dynamic data based on template structure
            dynamic_data = FormAutomationService._generate_dynamic_data(
                employee, 
                monthly_form.template.template_structure
            )
            entry_data['dynamic_data'] = dynamic_data
        else:
            # Use legacy form type logic
            if form_type == 'register_of_fines':
                fine_data = FormAutomationService._get_employee_fine_data(employee, monthly_form.month)
                entry_data.update(fine_data)
            elif form_type == 'register_of_workmen':
                workmen_data = FormAutomationService._get_employee_workmen_data(employee)
                entry_data.update(workmen_data)
        
        return EmployeeFormEntry.objects.create(**entry_data)
    
    @staticmethod
    def _get_employee_fine_data(employee, month_date):
        """Get fine data from payroll deductions"""
        try:
            # Get payslip for the month
            payslip = Payslip.objects.filter(
                employee=employee,
                payroll_cycle__start_date__year=month_date.year,
                payroll_cycle__start_date__month=month_date.month
            ).first()
            
            fine_amount = 0
            fine_reason = ""
            fine_date = None
            
            if payslip:
                # Check for fine-related deductions
                if payslip.other_deductions > 0:
                    fine_amount = payslip.other_deductions
                    fine_reason = "Payroll deduction"
                    fine_date = month_date
            
            return {
                'fine_amount': fine_amount,
                'fine_reason': fine_reason,
                'fine_date': fine_date
            }
            
        except Exception as e:
            logger.error(f"Error getting fine data for employee {employee.id}: {str(e)}")
            return {
                'fine_amount': 0,
                'fine_reason': "",
                'fine_date': None
            }
    
    @staticmethod
    def _get_employee_workmen_data(employee):
        """Get workmen register data from employee master - Form XIII compliant"""
        # Construct permanent address
        permanent_address = ""
        if employee.permanent_address_line1 or employee.address_line1:
            address_parts = [
                employee.permanent_address_line1 or employee.address_line1,
                employee.permanent_address_line2 or employee.address_line2,
                employee.permanent_city or employee.city,
                employee.permanent_state or employee.state,
                employee.permanent_pincode or employee.pincode,
                employee.permanent_country or employee.country
            ]
            permanent_address = ", ".join([part for part in address_parts if part])
        
        # Construct local address
        local_address = ""
        if employee.local_address_line1:
            local_parts = [
                employee.local_address_line1,
                employee.local_address_line2,
                employee.local_city,
                employee.local_state,
                employee.local_pincode,
                employee.local_country
            ]
            local_address = ", ".join([part for part in local_parts if part])
        else:
            # Use permanent address as local if local not provided
            local_address = permanent_address
        
        return {
            'designation': employee.designation.title if employee.designation else "",
            'department': employee.department.name if employee.department else "",
            'joining_date': employee.date_of_joining,
            'basic_wage': employee.base_salary,
            # Additional Form XIII fields
            'father_husband_name': employee.father_husband_name or "",
            'nature_of_employment': employee.nature_of_employment or (employee.designation.title if employee.designation else ""),
            'permanent_address': permanent_address,
            'local_address': local_address,
            'termination_date': getattr(employee, 'termination_date', None) or employee.date_of_leaving,
            'termination_reason': employee.termination_reason or "",
            'remarks': employee.employee_remarks or ""
        }
    
    @staticmethod
    def setup_default_templates(company):
        """Setup default form templates for a company"""
        templates = [
            {
                'form_type': 'register_of_fines',
                'template_name': 'Monthly Register of Fines',
                'generation_day': 1
            },
            {
                'form_type': 'register_of_workmen',
                'template_name': 'Monthly Register of Workmen',
                'generation_day': 1
            }
        ]
        
        created_templates = []
        for template_data in templates:
            template, created = ComplianceFormTemplate.objects.get_or_create(
                company=company,
                form_type=template_data['form_type'],
                defaults={
                    'template_name': template_data['template_name'],
                    'generation_day': template_data['generation_day'],
                    'is_monthly_auto_generate': True,
                    'is_active': True
                }
            )
            if created:
                created_templates.append(template)
        
        return created_templates
    
    @staticmethod
    def _generate_dynamic_data(employee, template_structure):
        """Generate dynamic data based on template structure"""
        dynamic_data = {}
        
        if not template_structure or 'fields' not in template_structure:
            return dynamic_data
        
        # Field mapping from employee model to common field names
        field_mapping = {
            'employee id': employee.employee_id,
            'employee name': employee.full_name,
            'name': employee.full_name,
            'name & surname': employee.full_name,
            'department': employee.department.name if employee.department else '',
            'designation': employee.designation.title if employee.designation else '',
            'date of birth': employee.date_of_birth.strftime('%d/%m/%Y') if employee.date_of_birth else '',
            'sex': employee.gender.title() if employee.gender else '',
            'gender': employee.gender.title() if employee.gender else '',
            'father\'s name': employee.father_husband_name or '',
            'husband\'s name': employee.father_husband_name or '',
            'father\'s/husband\'s name': employee.father_husband_name or '',
            'nature of employment': employee.nature_of_employment or (employee.designation.title if employee.designation else ''),
            'permanent address': FormAutomationService._get_permanent_address(employee),
            'local address': FormAutomationService._get_local_address(employee),
            'date of joining': employee.date_of_joining.strftime('%d/%m/%Y') if employee.date_of_joining else '',
            'date of commencement': employee.date_of_joining.strftime('%d/%m/%Y') if employee.date_of_joining else '',
            'date of termination': employee.termination_date.strftime('%d/%m/%Y') if employee.termination_date else '',
            'basic wage': str(employee.base_salary) if employee.base_salary else '0',
            'basic salary': str(employee.base_salary) if employee.base_salary else '0',
            'remarks': employee.employee_remarks or '',
            # Fine-related fields
            'fine amount': '0',
            # Advance-related fields
            'advance amount': '0',
            'amount of advance': '0',
            'date of advance': '',
            'purpose of advance': '',
            'purpose': '',
            'no. of installments': '',
            'installments': '',
            'amount of installment': '',
            'amount of each installment': '',
            'date of recovery': '',
            'amount recovered': '0',
            'balance outstanding': '0',
            'balance amount outstanding': '0',
            'signature of employee': '',
            'date of repayment': '',
            'recovery details': '',
            'monthly deduction': '0',
        }
        
        # Map template fields to employee data
        for field in template_structure['fields']:
            field_name = field['name'].lower().strip()
            
            # Try exact match first
            if field_name in field_mapping:
                dynamic_data[field['name']] = field_mapping[field_name]
            else:
                # Try partial matches with better logic
                matched = False
                for key, value in field_mapping.items():
                    # More flexible matching
                    if (key in field_name or field_name in key or 
                        any(word in field_name for word in key.split()) or
                        any(word in key for word in field_name.split())):
                        dynamic_data[field['name']] = value
                        matched = True
                        break
                
                # If no match found, set empty value
                if not matched:
                    dynamic_data[field['name']] = ''
        
        return dynamic_data
    
    @staticmethod
    def _get_permanent_address(employee):
        """Get formatted permanent address"""
        address_parts = [
            employee.permanent_address_line1 or employee.address_line1,
            employee.permanent_address_line2 or employee.address_line2,
            employee.permanent_city or employee.city,
            employee.permanent_state or employee.state,
            employee.permanent_pincode or employee.pincode
        ]
        return ", ".join([part for part in address_parts if part])
    
    @staticmethod
    def _get_local_address(employee):
        """Get formatted local address"""
        if employee.local_address_line1:
            address_parts = [
                employee.local_address_line1,
                employee.local_address_line2,
                employee.local_city,
                employee.local_state,
                employee.local_pincode
            ]
            return ", ".join([part for part in address_parts if part])
        else:
            return FormAutomationService._get_permanent_address(employee)