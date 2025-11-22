from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
import io

def generate_optimized_pdf(form, session, entries):
    """Generate optimized PDF for Form XIII compliance"""
    
    # Create PDF buffer
    buffer = io.BytesIO()
    
    # Use landscape orientation for Form XIII with minimal margins
    if form.template.form_type == 'register_of_workmen':
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=10, leftMargin=10, topMargin=25, bottomMargin=15)
    else:
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=1  # Center alignment
    )
    
    # Add title and header info
    elements.append(Paragraph(session.service_user.company.name, title_style))
    elements.append(Paragraph(form.template.template_name, title_style))
    elements.append(Spacer(1, 12))
    
    # Add form details
    form_info = f"""<b>Month:</b> {form.month.strftime('%B %Y')}<br/>
                   <b>Generated on:</b> {form.generated_at.strftime('%d/%m/%Y')}<br/>
                   <b>Status:</b> {form.status.title()}<br/>
                   <b>Total Employees:</b> {form.total_employees}"""
    elements.append(Paragraph(form_info, styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Create table data based on template structure
    if hasattr(form.template, 'template_structure') and form.template.template_structure and form.template.template_structure.get('fields'):
        # Dynamic template - use parsed structure
        fields = form.template.template_structure['fields']
        headers = ['S.No.'] + [field['name'] for field in fields]
        table_data = [headers]
        
        for i, entry in enumerate(entries, 1):
            row = [str(i)]
            for field in fields:
                field_name = field['name']
                # Check dynamic_data first, then fallback to legacy fields
                if hasattr(entry, 'dynamic_data') and entry.dynamic_data and field_name in entry.dynamic_data:
                    value = entry.dynamic_data[field_name]
                else:
                    # Fallback to legacy field mapping
                    field_lower = field_name.lower().strip()
                    if 'employee id' in field_lower:
                        value = entry.employee.employee_id
                    elif 'name' in field_lower and 'surname' in field_lower:
                        value = entry.employee.full_name
                    elif field_lower in ['name', 'employee name']:
                        value = entry.employee.full_name
                    elif 'department' in field_lower:
                        value = entry.employee.department.name if entry.employee.department else ''
                    elif 'designation' in field_lower:
                        value = entry.employee.designation.title if entry.employee.designation else ''
                    elif 'date of birth' in field_lower:
                        value = entry.employee.date_of_birth.strftime('%d/%m/%Y') if entry.employee.date_of_birth else ''
                    elif field_lower in ['sex', 'gender']:
                        value = entry.employee.gender.title() if entry.employee.gender else ''
                    elif 'father' in field_lower or 'husband' in field_lower:
                        value = getattr(entry.employee, 'father_husband_name', '') or ''
                    elif 'nature of employment' in field_lower:
                        value = getattr(entry.employee, 'nature_of_employment', '') or (entry.employee.designation.title if entry.employee.designation else '')
                    elif 'permanent address' in field_lower:
                        # Get formatted permanent address
                        address_parts = [
                            getattr(entry.employee, 'permanent_address_line1', None) or entry.employee.address_line1,
                            getattr(entry.employee, 'permanent_address_line2', None) or entry.employee.address_line2,
                            getattr(entry.employee, 'permanent_city', None) or entry.employee.city,
                            getattr(entry.employee, 'permanent_state', None) or entry.employee.state,
                            getattr(entry.employee, 'permanent_pincode', None) or entry.employee.pincode
                        ]
                        value = ", ".join([part for part in address_parts if part])
                    elif 'local address' in field_lower:
                        # Get formatted local address
                        if getattr(entry.employee, 'local_address_line1', None):
                            address_parts = [
                                entry.employee.local_address_line1,
                                getattr(entry.employee, 'local_address_line2', None),
                                getattr(entry.employee, 'local_city', None),
                                getattr(entry.employee, 'local_state', None),
                                getattr(entry.employee, 'local_pincode', None)
                            ]
                            value = ", ".join([part for part in address_parts if part])
                        else:
                            # Use permanent address as fallback
                            address_parts = [
                                getattr(entry.employee, 'permanent_address_line1', None) or entry.employee.address_line1,
                                getattr(entry.employee, 'permanent_address_line2', None) or entry.employee.address_line2,
                                getattr(entry.employee, 'permanent_city', None) or entry.employee.city,
                                getattr(entry.employee, 'permanent_state', None) or entry.employee.state,
                                getattr(entry.employee, 'permanent_pincode', None) or entry.employee.pincode
                            ]
                            value = ", ".join([part for part in address_parts if part])
                    elif 'date of joining' in field_lower or 'date of commencement' in field_lower:
                        value = entry.employee.date_of_joining.strftime('%d/%m/%Y') if entry.employee.date_of_joining else ''
                    elif 'date of termination' in field_lower:
                        value = getattr(entry.employee, 'termination_date', None)
                        value = value.strftime('%d/%m/%Y') if value else ''
                    elif 'basic wage' in field_lower or 'basic salary' in field_lower:
                        value = str(entry.employee.base_salary) if entry.employee.base_salary else '0'
                    elif 'fine amount' in field_lower:
                        value = str(getattr(entry, 'fine_amount', 0) or 0)
                    elif 'advance amount' in field_lower:
                        value = '0'  # Default for advance
                    elif 'purpose' in field_lower:
                        value = getattr(entry, 'purpose', '') or ''
                    elif 'installment' in field_lower:
                        value = getattr(entry, 'installments', '') or ''
                    elif 'monthly deduction' in field_lower:
                        value = getattr(entry, 'monthly_deduction', '') or ''
                    elif 'balance outstanding' in field_lower:
                        value = getattr(entry, 'balance_outstanding', '') or ''
                    elif 'remarks' in field_lower:
                        value = getattr(entry, 'remarks', '') or getattr(entry.employee, 'employee_remarks', '') or ''
                    else:
                        value = '-'
                
                # Truncate long values for PDF display
                if len(str(value)) > 25:
                    value = str(value)[:22] + '...'
                
                row.append(str(value) if value else '-')
            table_data.append(row)
        
        # Dynamic table styling
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
            ('WORDWRAP', (0, 0), (-1, -1), 'LTR'),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4)
        ]))
        
    elif form.template.form_type == 'register_of_fines':
        table_data = [['S.No.', 'Employee Name', 'Employee ID', 'Fine Amount (₹)', 'Reason', 'Date']]
        for i, entry in enumerate(entries, 1):
            table_data.append([
                str(i),
                entry.employee.full_name,
                entry.employee.employee_id,
                f"₹{entry.fine_amount or '0.00'}",
                entry.fine_reason or 'No fine',
                entry.fine_date.strftime('%d/%m/%Y') if entry.fine_date else '-'
            ])
        
        # Standard table for fines
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
    else:
        # Form XIII compliant Register of Workmen - Compact version
        def format_address(address_str):
            """Format address to show only city, state for table display"""
            if not address_str or address_str == '-':
                return '-'
            # Extract city and state from full address
            parts = [part.strip() for part in address_str.split(',') if part.strip()]
            if len(parts) >= 2:
                # Return last 2 parts (typically city, state)
                return f"{parts[-3] if len(parts) > 2 else parts[-2]}, {parts[-2] if len(parts) > 1 else parts[-1]}"
            return address_str[:25] + '...' if len(address_str) > 25 else address_str
        
        # Compact Form XIII with essential fields only
        table_data = [[
            'S.No.', 'Employee\nID', 'Name &\nSurname', 'Date of\nBirth', 'Sex', 
            "Father's/\nHusband's Name", 'Nature of\nEmployment', 'Address', 
            'Date of\nCommencement', 'Date of\nTermination'
        ]]
        
        for i, entry in enumerate(entries, 1):
            # Don't truncate employee ID to show full ID
            emp_id = entry.employee.employee_id or '-'
            name = (entry.employee.full_name or '-')[:18]
            
            dob_str = '-'
            if hasattr(entry.employee, 'date_of_birth') and entry.employee.date_of_birth:
                dob_str = entry.employee.date_of_birth.strftime('%d/%m/%Y')
            
            sex = (entry.employee.gender or '-')[:1].upper()
            father_name = (entry.father_husband_name or '-')[:15]
            nature = (entry.nature_of_employment or entry.designation or '-')[:18]
            address = format_address(entry.permanent_address)[:20]
            
            table_data.append([
                str(i),
                emp_id,
                name,
                dob_str,
                sex,
                father_name,
                nature,
                address,
                entry.joining_date.strftime('%d/%m/%Y') if entry.joining_date else '-',
                entry.termination_date.strftime('%d/%m/%Y') if entry.termination_date else '-'
            ])
        
        # Larger column widths to use full page width
        col_widths = [0.4*inch, 1.5*inch, 1.3*inch, 1.0*inch, 0.5*inch, 1.2*inch, 1.4*inch, 1.6*inch, 1.0*inch, 1.0*inch]
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
            ('WORDWRAP', (0, 0), (-1, -1), 'LTR'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 1), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 5)
        ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    
    # Get PDF data
    pdf_data = buffer.getvalue()
    buffer.close()
    
    return pdf_data