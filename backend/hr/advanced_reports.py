from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
import io
from .models import Employee, Payslip
from .statutory_models import PayslipStatutoryDetails

class AdvancedReportGenerator:
    """Generate advanced HR and compliance reports"""
    
    def __init__(self, company):
        self.company = company
        self.styles = getSampleStyleSheet()
    
    def generate_compliance_dashboard_data(self):
        """Generate data for compliance dashboard"""
        employees = Employee.objects.filter(company=self.company, status='active')
        
        return {
            'total_employees': employees.count(),
            'pf_enrolled': 0,  # Mock data for now
            'esi_enrolled': 0,  # Mock data for now
            'pt_applicable': 0,  # Mock data for now
            'tds_applicable': 0,  # Mock data for now
            'compliance_score': self._calculate_compliance_score(),
            'pending_returns': self._get_pending_returns(),
            'recent_alerts': self._get_recent_alerts()
        }
    
    def generate_statutory_summary_report(self, month, year):
        """Generate monthly statutory summary report"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        
        # Title
        title_style = ParagraphStyle('CustomTitle', parent=self.styles['Heading1'], 
                                   alignment=1, spaceAfter=30)
        story.append(Paragraph(f"Statutory Summary Report - {month}/{year}", title_style))
        
        # Company Info
        story.append(Paragraph(f"Company: {self.company.name}", self.styles['Normal']))
        story.append(Spacer(1, 12))
        
        # Get payslips for the month
        payslips = Payslip.objects.filter(
            employee__company=self.company,
            pay_period_start__month=month,
            pay_period_start__year=year
        )
        
        # Summary data
        summary_data = self._calculate_statutory_summary(payslips)
        
        # Summary table
        summary_table_data = [
            ['Component', 'Employee Share', 'Employer Share', 'Total'],
            ['PF Contribution', f"₹{summary_data['pf_employee']:,.2f}", 
             f"₹{summary_data['pf_employer']:,.2f}", f"₹{summary_data['pf_total']:,.2f}"],
            ['ESI Contribution', f"₹{summary_data['esi_employee']:,.2f}", 
             f"₹{summary_data['esi_employer']:,.2f}", f"₹{summary_data['esi_total']:,.2f}"],
            ['Professional Tax', f"₹{summary_data['pt_total']:,.2f}", '-', 
             f"₹{summary_data['pt_total']:,.2f}"],
            ['TDS Deducted', f"₹{summary_data['tds_total']:,.2f}", '-', 
             f"₹{summary_data['tds_total']:,.2f}"]
        ]
        
        summary_table = Table(summary_table_data)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        # Employee-wise details
        story.append(Paragraph("Employee-wise Statutory Details", self.styles['Heading2']))
        story.append(Spacer(1, 12))
        
        emp_data = [['Employee', 'PF Employee', 'PF Employer', 'ESI Employee', 'ESI Employer', 'PT', 'TDS']]
        
        for payslip in payslips:
            statutory = PayslipStatutoryDetails.objects.filter(payslip=payslip).first()
            if statutory:
                emp_data.append([
                    f"{payslip.employee.first_name} {payslip.employee.last_name}",
                    f"₹{statutory.pf_employee_contribution:.2f}",
                    f"₹{statutory.pf_employer_contribution:.2f}",
                    f"₹{statutory.esi_employee_contribution:.2f}",
                    f"₹{statutory.esi_employer_contribution:.2f}",
                    f"₹{statutory.professional_tax:.2f}",
                    f"₹{statutory.tds_amount:.2f}"
                ])
        
        emp_table = Table(emp_data)
        emp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(emp_table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_audit_trail_report(self, start_date, end_date):
        """Generate audit trail report for compliance activities"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
        story = []
        
        # Title
        title_style = ParagraphStyle('CustomTitle', parent=self.styles['Heading1'], 
                                   alignment=1, spaceAfter=30)
        story.append(Paragraph("Compliance Audit Trail Report", title_style))
        story.append(Paragraph(f"Period: {start_date} to {end_date}", self.styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Get audit data (mock implementation)
        audit_data = self._get_audit_trail_data(start_date, end_date)
        
        # Audit table
        table_data = [['Date', 'User', 'Action', 'Module', 'Details', 'Status']]
        
        for audit in audit_data:
            table_data.append([
                audit['date'].strftime('%Y-%m-%d %H:%M'),
                audit['user'],
                audit['action'],
                audit['module'],
                audit['details'],
                audit['status']
            ])
        
        audit_table = Table(table_data)
        audit_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(audit_table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_compliance_scorecard(self):
        """Generate compliance scorecard"""
        scorecard = {
            'overall_score': self._calculate_compliance_score(),
            'pf_compliance': self._calculate_pf_compliance_score(),
            'esi_compliance': self._calculate_esi_compliance_score(),
            'pt_compliance': self._calculate_pt_compliance_score(),
            'tds_compliance': self._calculate_tds_compliance_score(),
            'labor_law_compliance': self._calculate_labor_law_compliance_score(),
            'recommendations': self._get_compliance_recommendations()
        }
        
        return scorecard
    
    def _calculate_statutory_summary(self, payslips):
        """Calculate statutory summary from payslips"""
        summary = {
            'pf_employee': 0, 'pf_employer': 0, 'pf_total': 0,
            'esi_employee': 0, 'esi_employer': 0, 'esi_total': 0,
            'pt_total': 0, 'tds_total': 0
        }
        
        for payslip in payslips:
            statutory = PayslipStatutoryDetails.objects.filter(payslip=payslip).first()
            if statutory:
                summary['pf_employee'] += statutory.pf_employee_contribution
                summary['pf_employer'] += statutory.pf_employer_contribution
                summary['esi_employee'] += statutory.esi_employee_contribution
                summary['esi_employer'] += statutory.esi_employer_contribution
                summary['pt_total'] += statutory.professional_tax
                summary['tds_total'] += statutory.tds_amount
        
        summary['pf_total'] = summary['pf_employee'] + summary['pf_employer']
        summary['esi_total'] = summary['esi_employee'] + summary['esi_employer']
        
        return summary
    
    def _calculate_compliance_score(self):
        """Calculate overall compliance score"""
        scores = [
            self._calculate_pf_compliance_score(),
            self._calculate_esi_compliance_score(),
            self._calculate_pt_compliance_score(),
            self._calculate_tds_compliance_score(),
            self._calculate_labor_law_compliance_score()
        ]
        return sum(scores) / len(scores)
    
    def _calculate_pf_compliance_score(self):
        """Calculate PF compliance score"""
        employees = Employee.objects.filter(company=self.company, status='active')
        eligible = employees.filter(base_salary__gte=15000).count()
        enrolled = 0  # Mock data for now
        
        if eligible == 0:
            return 100
        return min(100, (enrolled / eligible) * 100)
    
    def _calculate_esi_compliance_score(self):
        """Calculate ESI compliance score"""
        employees = Employee.objects.filter(company=self.company, status='active')
        eligible = employees.filter(base_salary__lte=21000).count()
        enrolled = 0  # Mock data for now
        
        if eligible == 0:
            return 100
        return min(100, (enrolled / eligible) * 100)
    
    def _calculate_pt_compliance_score(self):
        """Calculate PT compliance score"""
        # Mock implementation
        return 95
    
    def _calculate_tds_compliance_score(self):
        """Calculate TDS compliance score"""
        # Mock implementation
        return 90
    
    def _calculate_labor_law_compliance_score(self):
        """Calculate labor law compliance score"""
        # Mock implementation
        return 88
    
    def _get_pending_returns(self):
        """Get pending statutory returns"""
        return [
            {'type': 'ECR', 'due_date': '2024-01-15', 'status': 'Pending'},
            {'type': 'ESI Return', 'due_date': '2024-01-21', 'status': 'Pending'}
        ]
    
    def _get_recent_alerts(self):
        """Get recent compliance alerts"""
        from .statutory_models import ComplianceAlert
        return ComplianceAlert.objects.filter(
            company=self.company,
            created_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-created_at')[:5]
    
    def _get_audit_trail_data(self, start_date, end_date):
        """Get audit trail data (mock implementation)"""
        return [
            {
                'date': timezone.now() - timedelta(days=1),
                'user': 'HR Admin',
                'action': 'Generated ECR',
                'module': 'PF Compliance',
                'details': 'Monthly ECR generated for December 2023',
                'status': 'Success'
            },
            {
                'date': timezone.now() - timedelta(days=2),
                'user': 'Payroll Manager',
                'action': 'Updated Statutory Settings',
                'module': 'Configuration',
                'details': 'Updated PF ceiling amount',
                'status': 'Success'
            }
        ]
    
    def _get_compliance_recommendations(self):
        """Get compliance recommendations"""
        return [
            "Ensure all eligible employees are enrolled in PF",
            "Update ESI registration for new employees",
            "Review professional tax rates for different states",
            "Implement automated TDS calculations",
            "Set up monthly compliance reminders"
        ]