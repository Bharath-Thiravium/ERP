"""
Form generation services for statutory compliance
"""
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from io import BytesIO
import os
from datetime import date
from django.conf import settings
from .models import Employee, Payslip
from .statutory_models import StatutorySettings


class Form16Generator:
    """Generate Form 16 (TDS Certificate)"""
    
    def __init__(self, company):
        self.company = company
        self.statutory_settings = self.get_statutory_settings()
    
    def get_statutory_settings(self):
        try:
            return StatutorySettings.objects.get(company=self.company)
        except StatutorySettings.DoesNotExist:
            return None
    
    def generate(self, employee, financial_year):
        """Generate Form 16 PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1  # Center
        )
        story.append(Paragraph("FORM No. 16", title_style))
        story.append(Paragraph("[See rule 31(1)(a)]", styles['Normal']))
        story.append(Paragraph("Certificate under section 203 of the Income-tax Act, 1961", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Part A - Employee and Employer Details
        story.append(Paragraph("PART A", styles['Heading2']))
        
        # Employer details table
        employer_data = [
            ['Name and address of the Employer', self.company.name],
            ['TAN of the Deductor', self.statutory_settings.tan_number if self.statutory_settings else ''],
            ['PAN of the Deductor', getattr(self.company, 'pan_number', '')],
        ]
        
        employer_table = Table(employer_data, colWidths=[3*inch, 3*inch])
        employer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(employer_table)
        story.append(Spacer(1, 20))
        
        # Employee details table
        employee_data = [
            ['Name of the Employee', employee.full_name],
            ['PAN of the Employee', employee.pan_number or ''],
            ['Employee Code', employee.employee_id],
            ['Address of the Employee', f"{employee.address_line1}, {employee.city}, {employee.state}"],
        ]
        
        employee_table = Table(employee_data, colWidths=[3*inch, 3*inch])
        employee_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(employee_table)
        story.append(Spacer(1, 30))
        
        # Part B - Details of Salary and Tax
        story.append(Paragraph("PART B", styles['Heading2']))
        
        # Get salary details for the financial year
        year_parts = financial_year.split('-')
        start_year = int(year_parts[0])
        
        payslips = Payslip.objects.filter(
            employee=employee,
            payroll_cycle__start_date__year__in=[start_year, start_year + 1]
        )
        
        total_gross = sum(p.gross_salary for p in payslips)
        total_tds = sum(p.tds for p in payslips)
        total_hra = sum(p.hra for p in payslips)
        
        # Salary details table
        salary_data = [
            ['Details of Salary Paid and any other income and tax deducted', 'Amount (Rs.)'],
            ['1. Gross Salary', f"{total_gross:,.2f}"],
            ['   (a) Salary as per provisions contained in sec.17(1)', f"{total_gross:,.2f}"],
            ['   (b) Value of perquisites u/s 17(2)', '0.00'],
            ['   (c) Profits in lieu of salary under section 17(3)', '0.00'],
            ['2. Less: Allowance to the extent exempt u/s 10', f"{total_hra * 0.5:,.2f}"],
            ['3. Balance (1-2)', f"{total_gross - (total_hra * 0.5):,.2f}"],
            ['4. Deductions under Chapter VI-A', '0.00'],
            ['5. Total income (3-4)', f"{total_gross - (total_hra * 0.5):,.2f}"],
            ['6. Tax on total income', f"{total_tds:,.2f}"],
            ['7. Education Cess @ 4%', f"{total_tds * 0.04:,.2f}"],
            ['8. Total tax charged (6+7)', f"{total_tds * 1.04:,.2f}"],
            ['9. Tax deducted at source', f"{total_tds:,.2f}"],
        ]
        
        salary_table = Table(salary_data, colWidths=[4*inch, 2*inch])
        salary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(salary_table)
        story.append(Spacer(1, 30))
        
        # Verification
        story.append(Paragraph("VERIFICATION", styles['Heading3']))
        story.append(Paragraph(
            f"I, {self.company.name}, do hereby certify that the above particulars are true and complete.",
            styles['Normal']
        ))
        story.append(Spacer(1, 20))
        story.append(Paragraph(f"Date: {date.today().strftime('%d/%m/%Y')}", styles['Normal']))
        story.append(Paragraph("Signature of the person responsible for deduction of tax", styles['Normal']))
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def save_form16(self, employee, financial_year, file_path):
        """Save Form 16 to file"""
        pdf_buffer = self.generate(employee, financial_year)
        
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'wb') as f:
            f.write(pdf_buffer.getvalue())
        
        return file_path


class PayrollRegisterGenerator:
    """Generate Payroll Register"""
    
    def __init__(self, company):
        self.company = company
    
    def generate(self, payroll_cycle):
        """Generate payroll register PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=14,
            spaceAfter=20,
            alignment=1
        )
        story.append(Paragraph(f"PAYROLL REGISTER - {payroll_cycle.name}", title_style))
        story.append(Paragraph(f"Period: {payroll_cycle.start_date} to {payroll_cycle.end_date}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Get payslips
        payslips = payroll_cycle.payslips.all().order_by('emp_id')
        
        # Payroll data table
        headers = ['Emp ID', 'Name', 'Basic', 'HRA', 'Gross', 'PF', 'ESI', 'PT', 'TDS', 'Net']
        data = [headers]
        
        for payslip in payslips:
            row = [
                payslip.emp_id,
                payslip.emp_name[:15],  # Truncate name
                f"{payslip.basic_salary:,.0f}",
                f"{payslip.hra:,.0f}",
                f"{payslip.gross_salary:,.0f}",
                f"{payslip.pf_employee:,.0f}",
                f"{payslip.esi_employee:,.0f}",
                f"{payslip.professional_tax:,.0f}",
                f"{payslip.tds:,.0f}",
                f"{payslip.net_salary:,.0f}"
            ]
            data.append(row)
        
        # Summary row
        total_gross = sum(p.gross_salary for p in payslips)
        total_net = sum(p.net_salary for p in payslips)
        total_pf = sum(p.pf_employee for p in payslips)
        total_esi = sum(p.esi_employee for p in payslips)
        total_pt = sum(p.professional_tax for p in payslips)
        total_tds = sum(p.tds for p in payslips)
        
        summary_row = [
            'TOTAL', '', '', '',
            f"{total_gross:,.0f}",
            f"{total_pf:,.0f}",
            f"{total_esi:,.0f}",
            f"{total_pt:,.0f}",
            f"{total_tds:,.0f}",
            f"{total_net:,.0f}"
        ]
        data.append(summary_row)
        
        table = Table(data, colWidths=[0.8*inch, 1.2*inch, 0.7*inch, 0.7*inch, 0.8*inch, 0.6*inch, 0.6*inch, 0.6*inch, 0.6*inch, 0.8*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -2), 'LEFT'),  # Employee names left aligned
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer


class BankAdviceGenerator:
    """Generate Bank Advice for salary transfer"""
    
    def __init__(self, company):
        self.company = company
    
    def generate(self, payroll_cycle, payment_date):
        """Generate bank advice PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=14,
            spaceAfter=20,
            alignment=1
        )
        story.append(Paragraph("BANK ADVICE FOR SALARY TRANSFER", title_style))
        story.append(Paragraph(f"Company: {self.company.name}", styles['Normal']))
        story.append(Paragraph(f"Payment Date: {payment_date}", styles['Normal']))
        story.append(Paragraph(f"Payroll Period: {payroll_cycle.start_date} to {payroll_cycle.end_date}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Get payslips with bank details
        payslips = payroll_cycle.payslips.filter(
            employee__bank_account_number__isnull=False
        ).order_by('employee__bank_name', 'emp_id')
        
        # Bank advice data
        headers = ['S.No', 'Emp ID', 'Employee Name', 'Bank Name', 'Account No', 'IFSC', 'Amount']
        data = [headers]
        
        total_amount = 0
        for i, payslip in enumerate(payslips, 1):
            employee = payslip.employee
            row = [
                str(i),
                payslip.emp_id,
                payslip.emp_name,
                employee.bank_name or '',
                employee.bank_account_number or '',
                employee.bank_ifsc_code or '',
                f"{payslip.net_salary:,.2f}"
            ]
            data.append(row)
            total_amount += payslip.net_salary
        
        # Total row
        total_row = ['', '', 'TOTAL', '', '', '', f"{total_amount:,.2f}"]
        data.append(total_row)
        
        table = Table(data, colWidths=[0.5*inch, 0.8*inch, 1.5*inch, 1.2*inch, 1.2*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (2, 1), (2, -2), 'LEFT'),  # Employee names left aligned
            ('ALIGN', (6, 1), (6, -1), 'RIGHT'),  # Amounts right aligned
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(table)
        
        # Summary
        story.append(Spacer(1, 20))
        story.append(Paragraph(f"Total Employees: {len(payslips)}", styles['Normal']))
        story.append(Paragraph(f"Total Amount: ₹{total_amount:,.2f}", styles['Normal']))
        
        doc.build(story)
        buffer.seek(0)
        return buffer


class ChallanGenerator:
    """Generate PF/ESI Challans"""
    
    def __init__(self, company):
        self.company = company
        self.statutory_settings = self.get_statutory_settings()
    
    def get_statutory_settings(self):
        try:
            return StatutorySettings.objects.get(company=self.company)
        except StatutorySettings.DoesNotExist:
            return None
    
    def generate_pf_challan(self, month, year):
        """Generate PF challan"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=14,
            spaceAfter=20,
            alignment=1
        )
        story.append(Paragraph("PROVIDENT FUND CHALLAN", title_style))
        story.append(Paragraph(f"Period: {month:02d}/{year}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Get payslips for the period
        payslips = Payslip.objects.filter(
            employee__company=self.company,
            payroll_cycle__start_date__month=month,
            payroll_cycle__start_date__year=year
        )
        
        total_employee_pf = sum(p.pf_employee or 0 for p in payslips)
        total_employer_pf = sum(p.pf_employer or 0 for p in payslips)
        total_pf = total_employee_pf + total_employer_pf
        
        # Challan details
        challan_data = [
            ['Establishment Code', self.statutory_settings.pf_establishment_code if self.statutory_settings and self.statutory_settings.pf_establishment_code else 'N/A'],
            ['Establishment Name', self.company.name or 'N/A'],
            ['Wage Month', f"{month:02d}/{year}"],
            ['Total Employees', str(len(payslips))],
            ['Employee Contribution', f"₹{total_employee_pf or 0:,.2f}"],
            ['Employer Contribution', f"₹{total_employer_pf or 0:,.2f}"],
            ['Total Amount', f"₹{total_pf or 0:,.2f}"],
        ]
        
        table = Table(challan_data, colWidths=[3*inch, 3*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_esi_challan(self, month, year):
        """Generate ESI challan"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=14,
            spaceAfter=20,
            alignment=1
        )
        story.append(Paragraph("ESI CHALLAN", title_style))
        story.append(Paragraph(f"Period: {month:02d}/{year}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Get eligible payslips
        payslips = Payslip.objects.filter(
            employee__company=self.company,
            payroll_cycle__start_date__month=month,
            payroll_cycle__start_date__year=year,
            esi_employee__gt=0
        )
        
        total_employee_esi = sum(p.esi_employee or 0 for p in payslips)
        total_employer_esi = sum(p.esi_employer or 0 for p in payslips)
        total_esi = total_employee_esi + total_employer_esi
        
        # Challan details
        challan_data = [
            ['Employer Code', self.statutory_settings.esi_employer_code if self.statutory_settings and self.statutory_settings.esi_employer_code else 'N/A'],
            ['Employer Name', self.company.name or 'N/A'],
            ['Contribution Period', f"{month:02d}/{year}"],
            ['Total Employees', str(len(payslips))],
            ['Employee Contribution (0.75%)', f"₹{total_employee_esi or 0:,.2f}"],
            ['Employer Contribution (3.25%)', f"₹{total_employer_esi or 0:,.2f}"],
            ['Total Amount', f"₹{total_esi or 0:,.2f}"],
        ]
        
        table = Table(challan_data, colWidths=[3*inch, 3*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer