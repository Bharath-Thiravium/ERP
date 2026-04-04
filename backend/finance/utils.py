from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework import status
from .quotation_pdf_service import quotation_pdf_service

def generate_quotation_pdf_response(quotation, inline=False, template=None):
    """Unified PDF response - inline/embed for preview or attachment for download"""
    try:
        pdf_bytes = quotation_pdf_service.generate_quotation_pdf(quotation, template=template)
        if not pdf_bytes or len(pdf_bytes) == 0:
            return Response({'error': 'PDF generation failed - empty output'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        filename = f"Quotation_{quotation.quotation_number}.pdf"
        if inline:
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            response['Content-Length'] = len(pdf_bytes)
        else:
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except Exception as e:
        return Response({'error': f'PDF generation error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

