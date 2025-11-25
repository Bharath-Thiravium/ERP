import weasyprint
from django.template.loader import render_to_string
from django.conf import settings
import os
from datetime import datetime

def generate_weasyprint_pdf(form, session, entries):
    """Generate PDF using WeasyPrint with dynamic HTML generation"""
    
    # Generate HTML dynamically based on template structure
    html_content = generate_dynamic_html(form, session, entries)
    
    # Generate PDF
    html = weasyprint.HTML(string=html_content)
    pdf_bytes = html.write_pdf()
    
    return pdf_bytes

def generate_dynamic_html(form, session, entries):
    """Generate HTML content dynamically based on form template structure"""
    
    template_structure = form.template.template_structure or {}
    fields = template_structure.get('fields', [])
    form_type = form.template.form_type
    
    if form_type == 'register_of_fines':
        return generate_form_1_html(form, session, entries, fields)
    else:
        return generate_form_xiii_html(form, session, entries, fields)

def generate_form_1_html(form, session, entries, fields):
    """Generate HTML for Form 1 - Register of Fines"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{form.template.template_name}</title>
        <style>
            @page {{ size: A4 landscape; margin: 0.5cm; }}
            body {{ font-family: Arial, sans-serif; font-size: 9px; margin: 0; }}
            .header {{ text-align: center; margin-bottom: 15px; }}
            .form-title {{ font-size: 14px; font-weight: bold; margin-bottom: 3px; }}
            .form-subtitle {{ font-size: 10px; margin-bottom: 8px; }}
            .form-description {{ font-size: 12px; font-weight: bold; margin-bottom: 15px; }}
            .info-section {{ margin-bottom: 15px; font-size: 9px; }}
            .info-item {{ margin-bottom: 8px; }}
            table {{ width: 100%; border-collapse: collapse; font-size: 7px; }}
            th, td {{ border: 1px solid #000; padding: 2px; text-align: center; vertical-align: middle; }}
            th {{ background-color: #f0f0f0; font-weight: bold; font-size: 6px; }}
            .text-left {{ text-align: left; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="form-title">FORM 1</div>
            <div class="form-subtitle">[See Rule 21(4)]</div>
            <div class="form-description">Register of Fines</div>
        </div>
        
        <div class="info-section">
            <div class="info-item">Name and Address of Employer: {session.service_user.company.name}</div>
            <div class="info-item">Name and situation of establishment:</div>
            <div class="info-item">Period: {form.month.strftime('%B %Y')}</div>
        </div>
        
        <table>
            <thead>
                <tr>
    """
    
    # Add table headers
    for field in fields:
        html += f'<th style="width: {field.get("width", "auto")}">{field["name"]}</th>'
    
    html += """
                </tr>
            </thead>
            <tbody>
    """
    
    # Add employee data rows for Form 1
    serial_no = 1
    for entry in entries:
        html += "<tr>"
        for field in fields:
            field_name = field['name'].lower()
            value = ''
            
            if 'serial number' in field_name:
                value = str(serial_no)
            elif 'name of employee' in field_name:
                value = entry.employee.full_name or ''
            elif 'employee id' in field_name or 'token number' in field_name:
                value = entry.employee.employee_id or ''
            elif 'department' in field_name or 'section' in field_name:
                value = entry.employee.department.name if entry.employee.department else ''
            elif 'date of fine imposed' in field_name:
                value = ''
            elif 'nature of act' in field_name or 'omission' in field_name:
                value = ''
            elif 'amount of fine imposed' in field_name:
                value = ''
            elif 'amount realized' in field_name:
                value = ''
            elif 'date of realization' in field_name:
                value = ''
            elif 'purpose for which fine is utilized' in field_name:
                value = ''
            elif 'remarks' in field_name:
                value = ''
            
            html += f'<td class="text-left">{value}</td>'
        
        html += "</tr>"
        serial_no += 1
    
    # Add empty rows
    for i in range(10):
        html += "<tr>"
        for j, field in enumerate(fields):
            if j == 0:  # Serial number column
                html += f'<td>{serial_no + i}</td>'
            else:
                html += '<td>&nbsp;</td>'
        html += "</tr>"
    
    html += """
            </tbody>
        </table>
    </body>
    </html>
    """
    
    return html

def generate_form_xiii_html(form, session, entries, fields):
    """Generate HTML for Form XIII - Register of Workmen"""
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{form.template.template_name}</title>
        <style>
            @page {{ size: A4 landscape; margin: 0.5cm; }}
            body {{ font-family: Arial, sans-serif; font-size: 9px; margin: 0; }}
            .header {{ text-align: center; margin-bottom: 15px; }}
            .form-title {{ font-size: 14px; font-weight: bold; margin-bottom: 3px; }}
            .form-subtitle {{ font-size: 10px; margin-bottom: 8px; }}
            .form-description {{ font-size: 12px; font-weight: bold; margin-bottom: 15px; }}
            .info-section {{ margin-bottom: 15px; font-size: 9px; }}
            .info-item {{ margin-bottom: 8px; }}
            table {{ width: 100%; border-collapse: collapse; font-size: 7px; }}
            th, td {{ border: 1px solid #000; padding: 2px; text-align: center; vertical-align: middle; }}
            th {{ background-color: #f0f0f0; font-weight: bold; font-size: 6px; }}
            .text-left {{ text-align: left; }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="form-title">FORM XIII</div>
            <div class="form-subtitle">[see rule 75]</div>
            <div class="form-description">Register of Workmen Employed by Contractor</div>
        </div>
        
        <div class="info-section">
            <div class="info-item">1. Name and Address of Contractor: {session.service_user.company.name}</div>
            <div class="info-item">2. Name and Address of establishment in/under which contract is carried on:</div>
            <div class="info-item">3. Nature and location of work:</div>
            <div class="info-item">4. Name and address of Principal Employer:</div>
        </div>
        
        <table>
            <thead>
                <tr>
    """
    
    # Add table headers from template structure
    for field in fields:
        html += f'<th style="width: {field.get("width", "auto")}">{field["name"]}</th>'
    
    html += """
                </tr>
            </thead>
            <tbody>
    """
    
    # Add employee data rows
    for entry in entries:
        html += "<tr>"
        for field in fields:
            field_name = field['name'].lower()
            value = ''
            
            if 'employee id' in field_name:
                value = entry.employee.employee_id or ''
            elif 'name and surname' in field_name:
                value = entry.employee.full_name or ''
            elif 'date of birth' in field_name:
                value = entry.employee.date_of_birth.strftime('%m/%d/%Y') if entry.employee.date_of_birth else ''
            elif 'sex' in field_name:
                value = entry.employee.gender or ''
            elif 'father' in field_name or 'husband' in field_name:
                value = getattr(entry.employee, 'father_husband_name', '') or ''
            elif 'nature of employment' in field_name or 'designation' in field_name:
                value = entry.employee.designation.title if entry.employee.designation else ''
            elif 'permanent address' in field_name:
                address_parts = []
                if entry.employee.permanent_address_line1: address_parts.append(entry.employee.permanent_address_line1)
                if entry.employee.permanent_address_line2: address_parts.append(entry.employee.permanent_address_line2)
                if entry.employee.permanent_city: address_parts.append(entry.employee.permanent_city)
                if entry.employee.permanent_state: address_parts.append(entry.employee.permanent_state)
                if entry.employee.permanent_pincode: address_parts.append(str(entry.employee.permanent_pincode))
                value = ', '.join(address_parts)
            elif 'local address' in field_name:
                address_parts = []
                if entry.employee.local_address_line1: address_parts.append(entry.employee.local_address_line1)
                if entry.employee.local_address_line2: address_parts.append(entry.employee.local_address_line2)
                if entry.employee.local_city: address_parts.append(entry.employee.local_city)
                if entry.employee.local_state: address_parts.append(entry.employee.local_state)
                if entry.employee.local_pincode: address_parts.append(str(entry.employee.local_pincode))
                value = ', '.join(address_parts)
            elif 'date of commencement' in field_name:
                value = entry.employee.date_of_joining.strftime('%m/%d/%Y') if entry.employee.date_of_joining else ''
            elif 'signature' in field_name:
                value = ''
            elif 'date of termination' in field_name:
                value = getattr(entry.employee, 'termination_date', None)
                value = value.strftime('%m/%d/%Y') if value else ''
            elif 'reasons for termination' in field_name:
                value = ''
            elif 'remarks' in field_name:
                value = ''
            
            html += f'<td class="text-left">{value}</td>'
        
        html += "</tr>"
    
    # Add empty rows for form completion
    for _ in range(5):
        html += "<tr>"
        for field in fields:
            html += '<td>&nbsp;</td>'
        html += "</tr>"
    
    html += """
            </tbody>
        </table>
    </body>
    </html>
    """
    
    return html

def get_field_value(entry, field_name):
    """Extract field value from employee entry - exact match or empty"""
    field_lower = field_name.lower().strip()
    
    # Check dynamic_data first
    if hasattr(entry, 'dynamic_data') and entry.dynamic_data and field_name in entry.dynamic_data:
        return entry.dynamic_data[field_name]
    
    # Exact field mapping - if field exists in DB, return value, else return empty
    try:
        if 'employee id' in field_lower or field_lower == 'emp id':
            return entry.employee.employee_id or ''
        elif 'employee name' in field_lower or 'name' in field_lower:
            return entry.employee.full_name or ''
        elif 'department' in field_lower:
            return entry.employee.department.name if entry.employee.department else ''
        elif 'designation' in field_lower:
            return entry.employee.designation.title if entry.employee.designation else ''
        elif 'date of birth' in field_lower or 'dob' in field_lower:
            return entry.employee.date_of_birth.strftime('%d/%m/%Y') if entry.employee.date_of_birth else ''
        elif 'gender' in field_lower or 'sex' in field_lower:
            return entry.employee.gender.title() if entry.employee.gender else ''
        elif 'father' in field_lower or 'husband' in field_lower:
            return getattr(entry.employee, 'father_husband_name', '') or ''
        elif 'permanent address' in field_lower:
            address_parts = []
            if entry.employee.permanent_address_line1: address_parts.append(entry.employee.permanent_address_line1)
            if entry.employee.permanent_address_line2: address_parts.append(entry.employee.permanent_address_line2)
            if entry.employee.permanent_city: address_parts.append(entry.employee.permanent_city)
            if entry.employee.permanent_state: address_parts.append(entry.employee.permanent_state)
            if entry.employee.permanent_pincode: address_parts.append(str(entry.employee.permanent_pincode))
            return ', '.join(address_parts)
        elif 'local address' in field_lower or 'present address' in field_lower:
            address_parts = []
            if entry.employee.local_address_line1: address_parts.append(entry.employee.local_address_line1)
            if entry.employee.local_address_line2: address_parts.append(entry.employee.local_address_line2)
            if entry.employee.local_city: address_parts.append(entry.employee.local_city)
            if entry.employee.local_state: address_parts.append(entry.employee.local_state)
            if entry.employee.local_pincode: address_parts.append(str(entry.employee.local_pincode))
            return ', '.join(address_parts)
        elif 'date of joining' in field_lower or 'joining date' in field_lower:
            return entry.employee.date_of_joining.strftime('%d/%m/%Y') if entry.employee.date_of_joining else ''
        elif 'basic salary' in field_lower or 'salary' in field_lower or 'wage' in field_lower:
            return str(entry.employee.base_salary) if entry.employee.base_salary else ''
        elif 'fine amount' in field_lower:
            return str(getattr(entry, 'fine_amount', '')) if getattr(entry, 'fine_amount', None) else ''
        elif 'fine reason' in field_lower or 'reason' in field_lower:
            return getattr(entry, 'fine_reason', '') or ''
        elif 'remarks' in field_lower:
            return getattr(entry, 'remarks', '') or ''
        else:
            # Field not found in database - return empty
            return ''
    except:
        return ''