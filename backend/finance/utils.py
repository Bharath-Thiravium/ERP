from django.http import HttpResponse
from .quotation_pdf_service import quotation_pdf_service

def generate_quotation_pdf_response(quotation, inline=False, template=None):
    \"\"\"Unified PDF response - inline/embed for preview or attachment for download\"\"\"
    try:
        # Generate PDF bytes using service
        pdf_bytes = quotation_pdf_service.generate_quotation_pdf(quotation, template=template)
        
        if not pdf_bytes or len(pdf_bytes) == 0:
            return {'error': 'PDF generation failed - empty output'}, 500
        
        # Create response
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        
        filename = f"Quotation_{quotation.quotation_number}.pdf"
        
        if inline:
            # Inline for iframe preview
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            response['Content-Length'] = len(pdf_bytes)
        else:
            # Attachment for download  
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
        
    except Exception as e:
        return {'error': f'PDF generation error: {str(e)}'}, 500

