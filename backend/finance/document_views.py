"""
Document Management Views
"""
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from django.core.files.base import ContentFile
from django.utils import timezone
from authentication.models import ServiceUserSession
from .document_models import Document, DocumentTemplate, BulkOperation
from .models import Invoice, ProformaInvoice, Quotation, Payment
from .einvoice_service import EInvoiceService
from .template_engine import TemplateEngine
import json
import uuid

def get_session_key(request):
    """Get session key from Authorization header or query params"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    return session_key

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_document(request):
    """Generate document from template"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        document_type = request.data.get('document_type')
        object_id = request.data.get('object_id')
        template_id = request.data.get('template_id')
        
        if not all([document_type, object_id]):
            return Response({'error': 'document_type and object_id are required'}, status=400)
        
        # Get template
        if template_id:
            template = DocumentTemplate.objects.get(id=template_id, company=service_user.company)
        else:
            template = DocumentTemplate.objects.filter(
                company=service_user.company,
                template_type=document_type,
                is_default=True
            ).first()
        
        if not template:
            return Response({'error': 'Template not found'}, status=404)
        
        # Get object and context
        template_engine = TemplateEngine(service_user.company)
        
        if document_type == 'invoice':
            obj = Invoice.objects.get(id=object_id, company=service_user.company)
            context = template_engine.get_invoice_context(obj)
            title = f"Invoice {obj.invoice_number}"
        elif document_type == 'quotation':
            obj = Quotation.objects.get(id=object_id, company=service_user.company)
            context = template_engine.get_quotation_context(obj)
            title = f"Quotation {obj.quotation_number}"
        else:
            return Response({'error': 'Unsupported document type'}, status=400)
        
        # Render document
        render_result = template_engine.render_document(template, context)
        if not render_result['success']:
            return Response({'error': render_result['error']}, status=500)
        
        # Generate PDF
        pdf_result = template_engine.generate_pdf(
            render_result['html_content'],
            render_result['css_content']
        )
        if not pdf_result['success']:
            return Response({'error': pdf_result['error']}, status=500)
        
        # Save document
        document = Document.objects.create(
            company=service_user.company,
            document_type=document_type,
            title=title,
            file_size=len(pdf_result['pdf_bytes']),
            mime_type='application/pdf',
            status='generated',
            created_by=service_user
        )
        
        # Save file
        filename = f"{document_type}_{object_id}_{uuid.uuid4().hex[:8]}.pdf"
        document.file_path.save(filename, ContentFile(pdf_result['pdf_bytes']))
        
        # Link to object
        if document_type == 'invoice':
            document.invoice = obj
        elif document_type == 'quotation':
            document.quotation = obj
        document.save()
        
        return Response({
            'document_id': str(document.id),
            'title': document.title,
            'file_url': document.file_path.url if document.file_path else None,
            'status': document.status
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def generate_einvoice(request):
    """Generate E-Invoice"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        invoice_id = request.data.get('invoice_id')
        if not invoice_id:
            return Response({'error': 'invoice_id is required'}, status=400)
        
        invoice = Invoice.objects.get(id=invoice_id, company=service_user.company)
        
        # Generate E-Invoice
        einvoice_service = EInvoiceService(service_user.company)
        result = einvoice_service.generate_einvoice(invoice)
        
        if result['success']:
            # Create document record
            document = Document.objects.create(
                company=service_user.company,
                document_type='einvoice',
                title=f"E-Invoice {invoice.invoice_number}",
                invoice=invoice,
                file_size=0,  # Will be updated when file is saved
                mime_type='application/json',
                status='generated',
                einvoice_irn=result['irn'],
                einvoice_ack_no=result['ack_no'],
                einvoice_ack_date=timezone.now(),
                qr_code_data=result.get('qr_code_data', ''),
                created_by=service_user
            )
            
            # Save signed invoice as file
            if result.get('signed_invoice'):
                filename = f"einvoice_{invoice_id}_{uuid.uuid4().hex[:8]}.json"
                content = json.dumps(result['signed_invoice'], indent=2)
                document.file_path.save(filename, ContentFile(content.encode()))
                document.file_size = len(content)
                document.save()
            
            return Response({
                'document_id': str(document.id),
                'irn': result['irn'],
                'ack_no': result['ack_no'],
                'ack_date': result['ack_date'],
                'qr_code_data': result.get('qr_code_data')
            })
        else:
            return Response({'error': result['error']}, status=500)
            
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def list_documents(request):
    """List documents"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        documents = Document.objects.filter(company=service_user.company)
        
        # Filter by type
        doc_type = request.query_params.get('type')
        if doc_type:
            documents = documents.filter(document_type=doc_type)
        
        # Filter by status
        doc_status = request.query_params.get('status')
        if doc_status:
            documents = documents.filter(status=doc_status)
        
        documents = documents.order_by('-created_at')[:50]  # Limit to 50 recent documents
        
        result = []
        for doc in documents:
            result.append({
                'id': str(doc.id),
                'title': doc.title,
                'document_type': doc.document_type,
                'status': doc.status,
                'file_size': doc.file_size,
                'mime_type': doc.mime_type,
                'created_at': doc.created_at.isoformat(),
                'file_url': doc.file_path.url if doc.file_path else None,
                'is_digitally_signed': doc.is_digitally_signed,
                'einvoice_irn': doc.einvoice_irn,
            })
        
        return Response({'documents': result})
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def bulk_generate_documents(request):
    """Bulk generate documents"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        operation_type = request.data.get('operation_type')
        object_ids = request.data.get('object_ids', [])
        
        if not all([operation_type, object_ids]):
            return Response({'error': 'operation_type and object_ids are required'}, status=400)
        
        # Create bulk operation record
        bulk_op = BulkOperation.objects.create(
            company=service_user.company,
            operation_type=operation_type,
            total_items=len(object_ids),
            created_by=service_user,
            started_at=timezone.now()
        )
        
        # Process items (in production, this should be done asynchronously)
        success_count = 0
        error_count = 0
        errors = []
        
        for obj_id in object_ids:
            try:
                if operation_type == 'generate_invoices':
                    # Generate invoice document
                    invoice = Invoice.objects.get(id=obj_id, company=service_user.company)
                    # ... document generation logic
                    success_count += 1
                elif operation_type == 'generate_einvoices':
                    # Generate E-Invoice
                    invoice = Invoice.objects.get(id=obj_id, company=service_user.company)
                    einvoice_service = EInvoiceService(service_user.company)
                    result = einvoice_service.generate_einvoice(invoice)
                    if result['success']:
                        success_count += 1
                    else:
                        error_count += 1
                        errors.append(f"Invoice {obj_id}: {result['error']}")
                
                bulk_op.processed_items += 1
                bulk_op.save()
                
            except Exception as e:
                error_count += 1
                errors.append(f"Object {obj_id}: {str(e)}")
                bulk_op.processed_items += 1
                bulk_op.error_count += 1
                bulk_op.save()
        
        # Update bulk operation
        bulk_op.success_count = success_count
        bulk_op.error_count = error_count
        bulk_op.error_details = errors
        bulk_op.status = 'completed'
        bulk_op.completed_at = timezone.now()
        bulk_op.save()
        
        return Response({
            'operation_id': str(bulk_op.id),
            'status': bulk_op.status,
            'total_items': bulk_op.total_items,
            'success_count': success_count,
            'error_count': error_count,
            'errors': errors[:10]  # Return first 10 errors
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def download_document(request, document_id):
    """Download document"""
    session_key = get_session_key(request)
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        document = Document.objects.get(id=document_id, company=service_user.company)
        
        if not document.file_path:
            return Response({'error': 'File not found'}, status=404)
        
        response = HttpResponse(document.file_path.read(), content_type=document.mime_type)
        response['Content-Disposition'] = f'attachment; filename="{document.title}.pdf"'
        return response
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Document.DoesNotExist:
        return Response({'error': 'Document not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)