from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
import io
from .models import Employee, Payslip, PayrollCycle
from .statutory_models import PayslipStatutoryDetails

class AdvancedReportGenerator:
    """Generate advanced HR and compliance reports"""
    
    def __init__(self, company):
        self.company = company
        self.styles = getSampleStyleSheet()

    def _settings(self):
        from .statutory_models import StatutorySettings
        return StatutorySettings.objects.filter(company=self.company).first()

    def _active_employees(self):
        return Employee.objects.filter(company=self.company, status='active')

    def _latest_finalized_payslips(self):
        cycle = PayrollCycle.objects.filter(
            company=self.company,
            status__in=['approved', 'completed']
        ).order_by('-end_date', '-updated_at').first()
        if not cycle:
            return Payslip.objects.none()
        return Payslip.objects.filter(
            payroll_cycle=cycle,
            status__in=['approved', 'paid']
        )

    def _pf_eligible_employees(self, settings=None):
        settings = settings or self._settings()
        ceiling = settings.pf_ceiling if settings else 15000
        return self._active_employees().filter(
            Q(base_salary__lte=ceiling) |
            Q(uan_number__gt='') |
            Q(pf_number__gt='') |
            Q(statutory_details__uan_number__gt='') |
            Q(statutory_details__pf_account_number__gt='')
        ).distinct()

    def _pf_enrolled_employees(self):
        return self._active_employees().filter(
            Q(uan_number__gt='') |
            Q(pf_number__gt='') |
            Q(statutory_details__uan_number__gt='') |
            Q(statutory_details__pf_account_number__gt='')
        ).distinct()

    def _esi_enrolled_employees(self):
        return self._active_employees().filter(
            Q(esi_number__gt='') |
            Q(statutory_details__esi_ip_number__gt='')
        ).distinct()
    
    def generate_compliance_dashboard_data(self):
        """Generate data for compliance dashboard"""
        from .statutory_models import StatutorySettings, GovernmentReturn
        
        employees = self._active_employees()
        payslips = self._latest_finalized_payslips()
        
        return {
            'total_employees': employees.count(),
            'pf_enrolled': self._pf_enrolled_employees().count(),
            'esi_enrolled': self._esi_enrolled_employees().count(),
            'pt_applicable': payslips.filter(professional_tax__gt=0).count(),
            'tds_applicable': payslips.filter(tds__gt=0).count(),
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
            payroll_cycle__start_date__month=month,
            payroll_cycle__start_date__year=year,
            status__in=['approved', 'paid']
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
            emp_data.append([
                payslip.emp_name,
                f"₹{payslip.pf_employee:.2f}",
                f"₹{payslip.pf_employer:.2f}",
                f"₹{payslip.esi_employee:.2f}",
                f"₹{payslip.esi_employer:.2f}",
                f"₹{payslip.professional_tax:.2f}",
                f"₹{payslip.tds:.2f}"
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
            # Use payslip fields directly since PayslipStatutoryDetails has different structure
            summary['pf_employee'] += payslip.pf_employee
            summary['pf_employer'] += payslip.pf_employer
            summary['esi_employee'] += payslip.esi_employee
            summary['esi_employer'] += payslip.esi_employer
            summary['pt_total'] += payslip.professional_tax
            summary['tds_total'] += payslip.tds
        
        summary['pf_total'] = summary['pf_employee'] + summary['pf_employer']
        summary['esi_total'] = summary['esi_employee'] + summary['esi_employer']
        
        return summary
    
    def _calculate_compliance_score(self):
        """Calculate overall compliance score"""
        from .statutory_models import GovernmentReturn

        settings = self._settings()
        if not settings:
            return 0

        scores = []
        for enabled, calculator in [
            (settings.pf_enabled, self._calculate_pf_compliance_score),
            (settings.esi_enabled, self._calculate_esi_compliance_score),
            (settings.pt_enabled, self._calculate_pt_compliance_score),
            (settings.tds_enabled, self._calculate_tds_compliance_score),
        ]:
            if enabled:
                scores.append(calculator())

        if not scores:
            return 0

        scores.append(self._calculate_labor_law_compliance_score())
        score = sum(scores) / len(scores)
        overdue_count = GovernmentReturn.objects.filter(
            company=self.company,
            due_date__lt=timezone.localdate()
        ).exclude(status='filed').count()
        return max(0, score - min(40, overdue_count * 10))
    
    def _calculate_pf_compliance_score(self):
        """Calculate PF compliance score"""
        from .statutory_models import StatutorySettings
        
        statutory_settings = self._settings()
        if not statutory_settings or not statutory_settings.pf_enabled:
            return 0
        if not statutory_settings.pf_establishment_code:
            return 0

        eligible_qs = self._pf_eligible_employees(statutory_settings)
        eligible = eligible_qs.count()
        if eligible == 0:
            return 100
        enrolled = self._pf_enrolled_employees().filter(id__in=eligible_qs.values('id')).count()
        return min(100, enrolled / eligible * 100)
    
    def _calculate_esi_compliance_score(self):
        """Calculate ESI compliance score"""
        from .statutory_models import StatutorySettings
        
        statutory_settings = self._settings()
        if not statutory_settings or not statutory_settings.esi_enabled:
            return 0
        if not statutory_settings.esi_employer_code:
            return 0

        eligible_qs = self._active_employees().filter(base_salary__lte=statutory_settings.esi_ceiling)
        eligible = eligible_qs.count()
        if eligible == 0:
            return 100
        enrolled = self._esi_enrolled_employees().filter(id__in=eligible_qs.values('id')).count()
        return min(100, enrolled / eligible * 100)
    
    def _calculate_pt_compliance_score(self):
        """Calculate PT compliance score"""
        from .statutory_models import StatutorySettings
        
        statutory_settings = self._settings()
        if not statutory_settings or not statutory_settings.pt_enabled:
            return 0
        return 100 if statutory_settings.pt_registration_number and statutory_settings.pt_state else 0
    
    def _calculate_tds_compliance_score(self):
        """Calculate TDS compliance score"""
        from .statutory_models import StatutorySettings
        
        statutory_settings = self._settings()
        if not statutory_settings or not statutory_settings.tds_enabled:
            return 0
        return 100 if statutory_settings.tan_number else 0
    
    def _calculate_labor_law_compliance_score(self):
        """Calculate labor law compliance score"""
        from .statutory_models import ComplianceAlert
        
        # Base score on recent compliance alerts
        recent_alerts = ComplianceAlert.objects.filter(
            company=self.company,
            created_at__gte=timezone.now() - timedelta(days=30),
            is_resolved=False
        ).count()
        
        score = max(0, 100 - (recent_alerts * 10))
        return score
    
    def _get_pending_returns(self):
        """Get pending statutory returns"""
        from .statutory_models import GovernmentReturn
        from datetime import datetime
        
        # Get actual pending returns from database
        pending_returns = GovernmentReturn.objects.filter(
            company=self.company,
            status__in=['pending', 'generated', 'overdue']
        ).order_by('due_date')[:5]
        
        returns_data = []
        for return_obj in pending_returns:
            returns_data.append({
                'type': return_obj.get_return_type_display(),
                'due_date': return_obj.due_date.strftime('%Y-%m-%d') if return_obj.due_date else None,
                'status': return_obj.status.title()
            })
        
        return returns_data
    
    def _get_recent_alerts(self):
        """Get recent compliance alerts"""
        from .statutory_models import ComplianceAlert
        alerts = ComplianceAlert.objects.filter(
            company=self.company,
            created_at__gte=timezone.now() - timedelta(days=7)
        ).order_by('-created_at')[:5]
        
        # Convert to serializable format
        alerts_data = []
        for alert in alerts:
            alerts_data.append({
                'id': alert.id,
                'title': alert.title,
                'message': alert.message,
                'priority': alert.priority,
                'alert_type': alert.alert_type,
                'due_date': alert.due_date.isoformat() if alert.due_date else None,
                'created_at': alert.created_at.isoformat(),
                'is_resolved': alert.is_resolved
            })
        
        return alerts_data
    
    def _get_audit_trail_data(self, start_date, end_date):
        """Get audit trail data from database"""
        from .statutory_models import GovernmentReturn, ComplianceAlert
        from datetime import datetime
        
        audit_data = []
        
        # Get government returns in date range
        returns = GovernmentReturn.objects.filter(
            company=self.company,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).order_by('-created_at')
        
        for return_obj in returns:
            audit_data.append({
                'date': return_obj.created_at,
                'user': 'System',
                'action': f'Generated {return_obj.get_return_type_display()}',
                'module': 'Statutory Returns',
                'details': f'{return_obj.get_return_type_display()} for {return_obj.period_month}/{return_obj.period_year}',
                'status': return_obj.status.title()
            })
        
        # Get compliance alerts in date range
        alerts = ComplianceAlert.objects.filter(
            company=self.company,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).order_by('-created_at')
        
        for alert in alerts:
            audit_data.append({
                'date': alert.created_at,
                'user': 'Compliance Engine',
                'action': 'Generated Alert',
                'module': 'Compliance Monitoring',
                'details': alert.title,
                'status': 'Resolved' if alert.is_resolved else 'Active'
            })
        
        # Sort by date descending
        audit_data.sort(key=lambda x: x['date'], reverse=True)
        
        return audit_data
    
    def _get_compliance_recommendations(self):
        """Get compliance recommendations based on current status"""
        from .statutory_models import StatutorySettings, ComplianceAlert
        
        recommendations = []
        statutory_settings = self._settings()
        
        # Check PF setup
        pf_eligible = self._pf_eligible_employees(statutory_settings).count()
        if statutory_settings and statutory_settings.pf_enabled and pf_eligible > 0 and not statutory_settings.pf_establishment_code:
            recommendations.append("Configure PF establishment code for eligible employees")
        if statutory_settings and statutory_settings.pf_enabled and self._calculate_pf_compliance_score() < 100:
            recommendations.append("Complete UAN/PF enrollment for all PF-eligible employees")
        
        # Check ESI setup
        esi_ceiling = statutory_settings.esi_ceiling if statutory_settings else 21000
        esi_eligible = self._active_employees().filter(base_salary__lte=esi_ceiling).count()
        if statutory_settings and statutory_settings.esi_enabled and esi_eligible > 0 and not statutory_settings.esi_employer_code:
            recommendations.append("Configure ESI employer code for eligible employees")
        if statutory_settings and statutory_settings.esi_enabled and self._calculate_esi_compliance_score() < 100:
            recommendations.append("Complete ESI IP enrollment for all ESI-eligible employees")
        
        # Check PT setup
        if statutory_settings and statutory_settings.pt_enabled and not statutory_settings.pt_registration_number:
            recommendations.append("Set up Professional Tax registration")
        
        # Check TDS setup
        if statutory_settings and statutory_settings.tds_enabled and not statutory_settings.tan_number:
            recommendations.append("Configure TAN number for TDS compliance")
        
        # Check for unresolved alerts
        unresolved_alerts = ComplianceAlert.objects.filter(
            company=self.company,
            is_resolved=False
        ).count()
        if unresolved_alerts > 0:
            recommendations.append(f"Resolve {unresolved_alerts} pending compliance alerts")
        
        if not statutory_settings or not any([
            statutory_settings.pf_enabled,
            statutory_settings.esi_enabled,
            statutory_settings.pt_enabled,
            statutory_settings.tds_enabled,
        ]):
            recommendations.append("Enable and configure only the statutory schemes applicable to this company")
        elif not recommendations:
            recommendations = [
                "Configured statutory schemes have no current system-detected issues",
                "Continue monitoring monthly compliance requirements",
                "Review employee salary changes for compliance impact"
            ]
        
        return recommendations
    
    def generate_compliance_scorecard_pdf(self):
        """Generate compliance scorecard PDF report"""
        buffer = io.BytesIO()
        try:
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            story = []
        
            title_style = ParagraphStyle('CustomTitle', parent=self.styles['Heading1'], alignment=1, spaceAfter=30)
            story.append(Paragraph("Compliance Scorecard Report", title_style))
            story.append(Paragraph(f"Company: {self.company.name}", self.styles['Normal']))
            story.append(Spacer(1, 20))
            
            scorecard = self.generate_compliance_scorecard()
            
            # Scorecard table
            scorecard_data = [
                ['Compliance Area', 'Score', 'Status'],
                ['Overall Compliance', f"{scorecard['overall_score']:.1f}%", 'Good' if scorecard['overall_score'] >= 80 else 'Needs Improvement'],
                ['PF Compliance', f"{scorecard['pf_compliance']:.1f}%", 'Good' if scorecard['pf_compliance'] >= 80 else 'Needs Improvement'],
                ['ESI Compliance', f"{scorecard['esi_compliance']:.1f}%", 'Good' if scorecard['esi_compliance'] >= 80 else 'Needs Improvement'],
                ['PT Compliance', f"{scorecard['pt_compliance']:.1f}%", 'Good' if scorecard['pt_compliance'] >= 80 else 'Needs Improvement'],
                ['TDS Compliance', f"{scorecard['tds_compliance']:.1f}%", 'Good' if scorecard['tds_compliance'] >= 80 else 'Needs Improvement']
            ]
            
            scorecard_table = Table(scorecard_data)
            scorecard_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
        
            story.append(scorecard_table)
            story.append(Spacer(1, 20))
            
            # Recommendations
            story.append(Paragraph("Recommendations", self.styles['Heading2']))
            for i, rec in enumerate(scorecard['recommendations'], 1):
                story.append(Paragraph(f"{i}. {rec}", self.styles['Normal']))
            
            doc.build(story)
            buffer.seek(0)
            return buffer
        except Exception as e:
            buffer.close()
            raise e
    
    def generate_returns_summary_pdf(self):
        """Generate government returns summary PDF report"""
        buffer = io.BytesIO()
        try:
            doc = SimpleDocTemplate(buffer, pagesize=A4)
            story = []
        
            title_style = ParagraphStyle('CustomTitle', parent=self.styles['Heading1'], alignment=1, spaceAfter=30)
            story.append(Paragraph("Government Returns Summary", title_style))
            story.append(Paragraph(f"Company: {self.company.name}", self.styles['Normal']))
            story.append(Spacer(1, 20))
            
            from .statutory_models import GovernmentReturn
            returns = GovernmentReturn.objects.filter(company=self.company).order_by('-created_at')[:10]
            
            # Returns table
            returns_data = [['Return Type', 'Period', 'Status', 'Due Date', 'Filed Date', 'Employees', 'Contribution']]
            
            for return_obj in returns:
                returns_data.append([
                    return_obj.get_return_type_display(),
                    f"{return_obj.period_month:02d}/{return_obj.period_year}",
                    return_obj.status.title(),
                    return_obj.due_date.strftime('%Y-%m-%d') if return_obj.due_date else '-',
                    return_obj.filed_date.strftime('%Y-%m-%d') if return_obj.filed_date else '-',
                    str(return_obj.total_employees),
                    f"₹{return_obj.total_contribution:,.2f}"
                ])
            
            returns_table = Table(returns_data)
            returns_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
        
            story.append(returns_table)
            
            doc.build(story)
            buffer.seek(0)
            return buffer
        except Exception as e:
            buffer.close()
            raise e
