from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from .models import Quotation, Invoice, PurchaseOrder, ProformaInvoice
from authentication.models import ServiceUserSession

@api_view(['POST'])
def import_historical_documents(request):
    """
    Import historical documents with original numbers.
    Useful for companies migrating from other systems.
    
    Request body:
    {
        "session_key": "...",
        "module": "quotation|invoice|purchase_order|proforma_invoice",
        "documents": [
            {
                "number": "QTN-25-0045",
                "date": "2025-01-15",
                "customer_id": 1,
                "total_amount": 50000,
                ...
            }
        ]
    }
    """
    session_key = request.data.get('session_key')
    if not session_key:
        return Response({'error': 'session_key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        service_user = session.service_user
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    
    module = request.data.get('module')
    documents = request.data.get('documents', [])
    
    if not module or not documents:
        return Response({'error': 'module and documents required'}, status=400)
    
    imported = []
    errors = []
    
    with transaction.atomic():
        for doc in documents:
            try:
                # Import based on module type
                if module == 'quotation':
                    obj = Quotation.objects.create(
                        company=company,
                        created_by=service_user,
                        quotation_number=doc['number'],
                        quotation_date=doc['date'],
                        customer_id=doc['customer_id'],
                        # Add other fields...
                    )
                # Add other modules...
                
                imported.append(doc['number'])
            except Exception as e:
                errors.append({'number': doc.get('number'), 'error': str(e)})
    
    return Response({
        'imported': len(imported),
        'errors': len(errors),
        'imported_numbers': imported,
        'error_details': errors
    })
