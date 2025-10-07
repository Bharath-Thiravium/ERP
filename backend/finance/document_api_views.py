"""
Document API Views - Real data integration for document generation
"""
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from django.core.files.base import ContentFile
from django.utils import timezone
from authentication.models import ServiceUserSession
from .models import Invoice, ProformaInvoice, Quotation, Payment, Customer
import json
import uuid
from decimal import Decimal

def get_session_key(request):
    """Get session key from Authorization header or query params"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    if not session_key and hasattr(request, 'data'):
        session_key = request.data.get('session_key')
    return session_key

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def list_real_documents(request):
    """List real documents from database tables"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        documents = []
        
        # Get invoices
        invoices = Invoice.objects.filter(company=service_user.company).select_related('customer')[:20]
        for inv in invoices:
            documents.append({
                'id': f'invoice_{inv.id}',
                'title': f'{inv.invoice_number}.pdf',
                'document_type': 'invoice',
                'status': 'generated' if inv.status == 'sent' else 'draft',
                'file_size': 0,  # Will be calculated when PDF is generated
                'created_at': inv.created_at.isoformat(),
                'customer_name': inv.customer.name,
                'amount': float(inv.total_amount),
                'reference': inv.reference,
                'source_id': inv.id,
                'source_type': 'invoice'
            })
        
        # Get quotations
        quotations = Quotation.objects.filter(company=service_user.company).select_related('customer')[:20]
        for quo in quotations:
            documents.append({
                'id': f'quotation_{quo.id}',
                'title': f'{quo.quotation_number}.pdf',
                'document_type': 'quotation',
                'status': 'generated' if quo.status == 'sent' else 'draft',
                'file_size': 0,
                'created_at': quo.created_at.isoformat(),
                'customer_name': quo.customer.name,
                'amount': float(quo.total_amount),
                'reference': quo.reference,
                'source_id': quo.id,
                'source_type': 'quotation'
            })
        
        # Get proforma invoices
        proformas = ProformaInvoice.objects.filter(company=service_user.company).select_related('customer')[:20]
        for pf in proformas:
            documents.append({
                'id': f'proforma_{pf.id}',
                'title': f'{pf.proforma_number}.pdf',
                'document_type': 'proforma',
                'status': 'generated' if pf.status == 'sent' else 'draft',
                'file_size': 0,
                'created_at': pf.created_at.isoformat(),
                'customer_name': pf.customer.name,
                'amount': float(pf.total_amount),
                'reference': pf.reference,
                'source_id': pf.id,
                'source_type': 'proforma'
            })
        
        # Get payments
        payments = Payment.objects.filter(company=service_user.company).select_related('customer')[:20]
        for pay in payments:
            documents.append({
                'id': f'payment_{pay.id}',
                'title': f'{pay.payment_number}_receipt.pdf',
                'document_type': 'payment_receipt',
                'status': 'generated' if pay.status == 'completed' else 'draft',
                'file_size': 0,
                'created_at': pay.created_at.isoformat(),
                'customer_name': pay.customer.name,
                'amount': float(pay.amount),
                'reference': pay.reference_number,
                'source_id': pay.id,
                'source_type': 'payment'
            })
        
        # Sort by creation date (newest first)
        documents.sort(key=lambda x: x['created_at'], reverse=True)
        
        return Response({'documents': documents})
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def list_source_documents(request):
    """List source documents for generation"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        sources = []
        
        # Get quotations
        quotations = Quotation.objects.filter(company=service_user.company).select_related('customer')
        for q in quotations:
            sources.append({
                'id': q.id,
                'number': q.quotation_number,
                'customer_name': q.customer.name,
                'total_amount': float(q.total_amount),
                'date': q.quotation_date.isoformat(),
                'type': 'quotation'
            })
        
        # Get invoices
        invoices = Invoice.objects.filter(company=service_user.company).select_related('customer')
        for inv in invoices:
            sources.append({
                'id': inv.id,
                'number': inv.invoice_number,
                'customer_name': inv.customer.name,
                'total_amount': float(inv.total_amount),
                'date': inv.invoice_date.isoformat(),
                'type': 'invoice'
            })
        
        # Get proforma invoices
        proformas = ProformaInvoice.objects.filter(company=service_user.company).select_related('customer')
        for pf in proformas:
            sources.append({
                'id': pf.id,
                'number': pf.proforma_number,
                'customer_name': pf.customer.name,
                'total_amount': float(pf.total_amount),
                'date': pf.proforma_date.isoformat(),
                'type': 'proforma'
            })
        
        # Get payments
        payments = Payment.objects.filter(company=service_user.company).select_related('customer')
        for pay in payments:
            sources.append({
                'id': pay.id,
                'number': pay.payment_number,
                'customer_name': pay.customer.name,
                'total_amount': float(pay.amount),
                'date': pay.payment_date.isoformat(),
                'type': 'payment_receipt'
            })
        
        return Response({'sources': sources})
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_real_document(request):
    """Generate document from real data"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        document_type = request.data.get('document_type')
        source_id = request.data.get('source_id')
        template_id = request.data.get('template_id')
        
        if not all([document_type, source_id]):
            return Response({'error': 'document_type and source_id are required'}, status=400)
        
        # Get source object
        source_obj = None
        if document_type == 'invoice':
            source_obj = Invoice.objects.get(id=source_id, company=service_user.company)
            title = f"Invoice {source_obj.invoice_number}"
        elif document_type == 'quotation':
            source_obj = Quotation.objects.get(id=source_id, company=service_user.company)
            title = f"Quotation {source_obj.quotation_number}"
        elif document_type == 'proforma':
            source_obj = ProformaInvoice.objects.get(id=source_id, company=service_user.company)
            title = f"Proforma Invoice {source_obj.proforma_number}"
        elif document_type == 'payment_receipt':
            source_obj = Payment.objects.get(id=source_id, company=service_user.company)
            title = f"Payment Receipt {source_obj.payment_number}"
        else:
            return Response({'error': 'Unsupported document type'}, status=400)
        
        if not source_obj:
            return Response({'error': 'Source document not found'}, status=404)
        
        # For now, return success with mock PDF generation
        # In production, you would integrate with your PDF generation service
        document_id = f"{document_type}_{source_id}_{uuid.uuid4().hex[:8]}"
        
        return Response({
            'document_id': document_id,
            'title': title,
            'status': 'generated',
            'message': f'Document generated successfully for {title}',
            'download_url': f'/api/finance/documents/{document_id}/download/',
            'source_data': {
                'customer_name': source_obj.customer.name,
                'amount': float(getattr(source_obj, 'total_amount', getattr(source_obj, 'amount', 0))),
                'date': getattr(source_obj, 'invoice_date', 
                               getattr(source_obj, 'quotation_date',
                                       getattr(source_obj, 'proforma_date',
                                               getattr(source_obj, 'payment_date', None)))).isoformat()
            }
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except (Invoice.DoesNotExist, Quotation.DoesNotExist, ProformaInvoice.DoesNotExist, Payment.DoesNotExist):
        return Response({'error': 'Source document not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def download_real_document(request, document_id):
    """Download generated document"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        # For now, return a mock PDF response
        # In production, you would retrieve the actual generated PDF
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Generated Document) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n299\n%%EOF"
        
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{document_id}.pdf"'
        return response
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def list_templates(request):
    """List available document templates"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        from authentication.models import ServiceUserSession
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        # Get templates from database
        from .document_models import DocumentTemplate
        db_templates = DocumentTemplate.objects.filter(
            company=service_user.company,
            is_active=True
        ).order_by('-created_at')
        
        templates = []
        
        # Add database templates
        for template in db_templates:
            templates.append({
                'id': template.id,
                'name': template.name,
                'template_type': template.template_type,
                'is_default': template.is_default,
                'created_at': template.created_at.isoformat()
            })
        
        # Add default templates if no custom templates exist
        if not templates:
            templates = [
                {
                    'id': 'default_1',
                    'name': 'Standard Invoice Template',
                    'template_type': 'invoice',
                    'is_default': True,
                    'created_at': '2024-01-01T00:00:00Z'
                },
                {
                    'id': 'default_2',
                    'name': 'Professional Quotation Template',
                    'template_type': 'quotation',
                    'is_default': True,
                    'created_at': '2024-01-01T00:00:00Z'
                },
                {
                    'id': 'default_3',
                    'name': 'Proforma Invoice Template',
                    'template_type': 'proforma',
                    'is_default': True,
                    'created_at': '2024-01-01T00:00:00Z'
                },
                {
                    'id': 'default_4',
                    'name': 'Payment Receipt Template',
                    'template_type': 'payment_receipt',
                    'is_default': True,
                    'created_at': '2024-01-01T00:00:00Z'
                }
            ]
        
        return Response({'templates': templates})
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def create_test_data(request):
    """Create test data for document generation"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        service_user = session.service_user
        
        from decimal import Decimal
        from datetime import date, timedelta
        
        # Create test customers
        customers = []
        customer_data = [
            {'name': 'ABC Corporation', 'email': 'contact@abc.com', 'phone': '9876543210'},
            {'name': 'XYZ Limited', 'email': 'info@xyz.com', 'phone': '9876543211'},
            {'name': 'DEF Industries', 'email': 'sales@def.com', 'phone': '9876543212'},
        ]
        
        for data in customer_data:
            customer, created = Customer.objects.get_or_create(
                company=company,
                name=data['name'],
                defaults={
                    'email': data['email'],
                    'phone': data['phone'],
                    'customer_type': 'business',
                    'billing_city': 'Mumbai',
                    'billing_state': 'Maharashtra',
                    'billing_country': 'India',
                    'created_by': service_user
                }
            )
            customers.append(customer)
        
        return Response({
            'message': 'Test data created successfully!',
            'customers_created': len(customers)
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def create_template(request):
    """Create new document template"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        from authentication.models import ServiceUserSession
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        name = request.data.get('name')
        template_type = request.data.get('template_type')
        description = request.data.get('description', '')
        
        if not all([name, template_type]):
            return Response({'error': 'Name and template type are required'}, status=400)
        
        # Create template using DocumentTemplate model
        from .document_models import DocumentTemplate
        template = DocumentTemplate.objects.create(
            company=service_user.company,
            name=name,
            template_type=template_type,
            html_content=f'<html><body><h1>{name}</h1><p>Template for {template_type}</p></body></html>',
            css_styles='body { font-family: Arial, sans-serif; }',
            is_default=False,
            is_active=True,
            created_by=service_user
        )
        
        template_data = {
            'id': template.id,
            'name': template.name,
            'template_type': template.template_type,
            'description': description,
            'is_default': template.is_default,
            'created_at': template.created_at.isoformat(),
            'created_by': service_user.user.get_full_name() if hasattr(service_user, 'user') else 'System'
        }
        
        return Response({
            'message': 'Template created successfully',
            'template': template_data
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)