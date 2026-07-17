"""
Comprehensive test suite for HR compliance system
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date, datetime

from authentication.models import Company, CompanyServiceUser
from .models import Department, Designation, Employee
from .statutory_models import StatutorySettings, EmployeeStatutoryDetails
from .statutory_calculations import StatutoryCalculator
from .compliance_validators import ComplianceValidators, DataIntegrityValidator
from .error_handlers import ComplianceError, SafeCalculator


class ComplianceValidatorTests(TestCase):
    """Test compliance validators"""
    
    def test_uan_validation(self):
        """Test UAN number validation"""
        # Valid UAN
        self.assertTrue(ComplianceValidators.validate_uan_number("123456789012"))
        
        # Invalid UAN - wrong length
        with self.assertRaises(ValidationError):
            ComplianceValidators.validate_uan_number("12345")
        
        # Invalid UAN - non-numeric
        with self.assertRaises(ValidationError):
            ComplianceValidators.validate_uan_number("12345678901A")
    
    def test_pan_validation(self):
        """Test PAN number validation"""
        # Valid PAN
        self.assertTrue(ComplianceValidators.validate_pan_number("ABCDE1234F"))
        
        # Invalid PAN format
        with self.assertRaises(ValidationError):
            ComplianceValidators.validate_pan_number("INVALID123")
    
    def test_salary_validation(self):
        """Test salary amount validation"""
        # Valid salary
        self.assertTrue(ComplianceValidators.validate_salary_amount(50000))
        
        # Negative salary
        with self.assertRaises(ValidationError):
            ComplianceValidators.validate_salary_amount(-1000)
        
        # Too high salary
        with self.assertRaises(ValidationError):
            ComplianceValidators.validate_salary_amount(20000000)


class SafeCalculatorTests(TestCase):
    """Test safe calculation utilities"""
    
    def test_safe_divide(self):
        """Test safe division"""
        # Normal division
        self.assertEqual(SafeCalculator.safe_divide(10, 2), 5)
        
        # Division by zero
        self.assertEqual(SafeCalculator.safe_divide(10, 0), 0)
        
        # Invalid types
        self.assertEqual(SafeCalculator.safe_divide("invalid", 2), 0)
    
    def test_safe_percentage(self):
        """Test safe percentage calculation"""
        # Normal percentage
        self.assertEqual(SafeCalculator.safe_percentage(1000, 12), 120)
        
        # Invalid types
        self.assertEqual(SafeCalculator.safe_percentage("invalid", 12), 0)


class StatutoryCalculatorTests(TestCase):
    """Test statutory calculations"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username="statutory-test-admin",
            email="statutory-admin@test.com",
        )
        self.company = Company.objects.create(
            name="Test Company",
            company_prefix="STATTEST",
            email="test@company.com",
            created_by=self.user,
        )
        self.department = Department.objects.create(
            company=self.company,
            name="Compliance",
            code="COMP",
        )
        self.designation = Designation.objects.create(
            company=self.company,
            department=self.department,
            title="Compliance Executive",
            code="COMP-EXEC",
        )
        
        self.statutory_settings = StatutorySettings.objects.create(
            company=self.company,
            pf_enabled=True,
            pf_establishment_code="TESTPF001",
            pf_employee_rate=Decimal('12.00'),
            pf_employer_rate=Decimal('12.00'),
            pf_ceiling=Decimal('15000'),
            esi_enabled=True,
            esi_employer_code="TESTESI001",
            esi_employee_rate=Decimal('0.75'),
            esi_employer_rate=Decimal('3.25'),
            esi_ceiling=Decimal('21000'),
            pt_enabled=True,
            pt_registration_number="TESTPT001",
            pt_state="Tamil Nadu",
            pt_slabs=[
                {'min_salary': 0, 'max_salary': 10000, 'amount': 0},
                {'min_salary': 10000.01, 'max_salary': None, 'amount': 200},
            ],
        )
        
        self.employee = Employee.objects.create(
            company=self.company,
            employee_id="EMP001",
            first_name="John",
            last_name="Doe",
            email="john@test.com",
            department=self.department,
            designation=self.designation,
            date_of_joining=date.today(),
            base_salary=Decimal('25000')
        )
        EmployeeStatutoryDetails.objects.create(
            employee=self.employee,
            uan_number="123456789012",
        )
        
        self.calculator = StatutoryCalculator(self.company)
    
    def test_pf_calculation(self):
        """Test PF calculation"""
        result = self.calculator.calculate_pf(
            self.employee,
            Decimal('20000'),  # basic_salary
            26,  # present_days
            30   # working_days
        )
        
        self.assertTrue(result['eligible'])
        self.assertGreater(result['employee_pf'], 0)
        self.assertGreater(result['employer_pf'], 0)
        self.assertTrue(result['ceiling_applied'])  # 20000 > 15000 ceiling
    
    def test_esi_calculation(self):
        """Test ESI calculation"""
        result = self.calculator.calculate_esi(
            self.employee,
            Decimal('18000'),  # gross_salary (below ESI ceiling)
            26,  # present_days
            30   # working_days
        )
        
        self.assertTrue(result['eligible'])
        self.assertGreater(result['employee_esi'], 0)
        self.assertGreater(result['employer_esi'], 0)
        self.assertFalse(result['ceiling_applied'])
    
    def test_professional_tax_calculation(self):
        """Test Professional Tax calculation"""
        result = self.calculator.calculate_professional_tax(
            self.employee,
            Decimal('25000')  # gross_salary
        )
        
        self.assertEqual(result['professional_tax'], Decimal('200.00'))
        self.assertEqual(result['state'], 'Tamil Nadu')
        self.assertIn('and above', result['pt_slab'])

    def test_new_high_salary_employee_is_not_auto_enrolled_in_pf(self):
        employee = Employee.objects.create(
            company=self.company,
            employee_id="EMP002",
            first_name="High",
            last_name="Salary",
            email="high.salary@test.com",
            department=self.department,
            designation=self.designation,
            date_of_joining=date.today(),
            base_salary=Decimal('50000'),
        )

        result = self.calculator.calculate_pf(employee, Decimal('30000'), 30, 30)

        self.assertFalse(result['eligible'])
        self.assertEqual(result['employee_pf'], Decimal('0'))
    
    def test_invalid_input_handling(self):
        """Test handling of invalid inputs"""
        with self.assertRaises(ComplianceError):
            self.calculator.calculate_pf(
                self.employee,
                "invalid_salary",  # Invalid type
                26,
                30
            )


class ComplianceIntegrationTests(TestCase):
    """Integration tests for compliance system"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username="compliance-integration-admin",
            email="compliance-admin@test.com",
        )
        self.company = Company.objects.create(
            name="Integration Test Company",
            company_prefix="COMPTEST",
            email="integration@test.com",
            created_by=self.user,
        )
        self.department = Department.objects.create(
            company=self.company,
            name="Compliance",
            code="COMP",
        )
        self.designation = Designation.objects.create(
            company=self.company,
            department=self.department,
            title="Compliance Executive",
            code="COMP-EXEC",
        )
        
        # Create statutory settings
        StatutorySettings.objects.create(
            company=self.company,
            pf_enabled=True,
            pf_establishment_code="TESTPF002",
            esi_enabled=True,
            esi_employer_code="TESTESI002",
            pt_enabled=True,
            pt_registration_number="TESTPT002",
            pt_state="Tamil Nadu",
            pt_slabs=[
                {'min_salary': 0, 'max_salary': 10000, 'amount': 0},
                {'min_salary': 10000.01, 'max_salary': None, 'amount': 200},
            ],
            tds_enabled=True,
            tan_number="ABCD12345E",
        )
    
    def test_end_to_end_compliance_flow(self):
        """Test complete compliance flow"""
        # Create employee
        employee = Employee.objects.create(
            company=self.company,
            employee_id="EMP_INT_001",
            first_name="Integration",
            last_name="Test",
            email="integration@employee.com",
            department=self.department,
            designation=self.designation,
            date_of_joining=date.today(),
            base_salary=Decimal('30000')
        )
        
        # Create statutory details
        EmployeeStatutoryDetails.objects.create(
            employee=employee,
            uan_number="123456789012",
            esi_ip_number="12345678901234567"
        )
        
        # Test calculations
        calculator = StatutoryCalculator(self.company)
        
        pf_result = calculator.calculate_pf(employee, Decimal('30000'), 30, 30)
        esi_result = calculator.calculate_esi(employee, Decimal('35000'), 30, 30)
        pt_result = calculator.calculate_professional_tax(employee, Decimal('35000'))
        
        # Verify results
        self.assertTrue(pf_result['eligible'])
        self.assertFalse(esi_result['eligible'])  # Above ESI ceiling
        self.assertEqual(pt_result['professional_tax'], Decimal('200.00'))


class SecurityTests(TestCase):
    """Test security features"""
    
    def test_input_sanitization(self):
        """Test input sanitization"""
        from .security_utils import SecurityValidator
        
        # Test XSS prevention
        malicious_input = "<script>alert('xss')</script>"
        sanitized = SecurityValidator.sanitize_input(malicious_input)
        self.assertNotIn("<script>", sanitized)
        
        # Test path traversal prevention
        malicious_path = "../../../etc/passwd"
        with self.assertRaises(ValidationError):
            SecurityValidator.validate_file_path(malicious_path)
    
    def test_session_validation(self):
        """Test session key validation"""
        from .security_utils import SecurityValidator
        
        # Valid session key
        valid_key = "abc123def456"
        self.assertEqual(SecurityValidator.validate_session_key(valid_key), valid_key)
        
        # Invalid session key
        with self.assertRaises(ValidationError):
            SecurityValidator.validate_session_key("../invalid")


if __name__ == '__main__':
    import django
    django.setup()
    
    from django.test.utils import get_runner
    from django.conf import settings
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(["hr.tests_compliance"])
