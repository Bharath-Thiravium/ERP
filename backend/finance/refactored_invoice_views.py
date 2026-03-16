"""
Refactored Invoice Views Module
Handles all invoice-related API endpoints with proper shipping address management
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db import transaction
from decimal import Decimal
import logging

from .models import Invoice, PurchaseOrder, Quotation, Customer
from .serializers import InvoiceDetailSerializer, InvoiceListSerializer
from .invoice_service import (
    invoice_creation_service, 
    invoice_pdf_service, 
    invoice_query_service
)
from .pdf_generators import generate_invoice_pdf_response
from authentication.models import ServiceUserSession

logger = logging.getLogger(__name__)


class RefactoredInvoiceViewSet(viewsets.ModelViewSet):
    """Refactored Invoice ViewSet with proper shipping address handling"""
    
    serializer_class = InvoiceDetailSerializer
    
    def get_queryset(self):
        """Get invoices for the authenticated company"""
        try:
            session_key = self.request.query_params.get('session_key')
            if not session_key:
                return Invoice.objects.none()
            
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            return invoice_query_service.get_invoices_for_company(service_user.company)
            
        except ServiceUserSession.DoesNotExist:
            return Invoice.objects.none()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return InvoiceListSerializer
        return InvoiceDetailSerializer
    
    def retrieve(self, request, pk=None):
        """Get invoice details with shipping address information"""
        try:
            session_key = request.query_params.get('session_key')
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            invoice = invoice_query_service.get_invoice_with_shipping_details(pk, service_user.company)
            if not invoice:
                return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
            
            serializer = self.get_serializer(invoice)
            return Response(serializer.data)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Error retrieving invoice {pk}: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def create_from_po(self, request):
        """Create invoice from Purchase Order with proper shipping address handling"""
        try:
            session_key = request.data.get('session_key')
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            # Get purchase order
            po_id = request.data.get('purchase_order_id')
            if not po_id:
                return Response({'error': 'Purchase order ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                purchase_order = PurchaseOrder.objects.get(id=po_id, company=service_user.company)
            except PurchaseOrder.DoesNotExist:
                return Response({'error': 'Purchase order not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Prepare invoice data
            invoice_data = {
                'invoice_date': request.data.get('invoice_date'),
                'due_date': request.data.get('due_date'),
                'reference': request.data.get('reference'),
                'shipping_address_id': request.data.get('shipping_address_id'),
                'claim_percentage': Decimal(str(request.data.get('claim_percentage', 100))),
                'discount_percentage': request.data.get('discount_percentage'),
                'discount_amount': request.data.get('discount_amount'),
                'shipping_charges': request.data.get('shipping_charges'),
                'other_charges': request.data.get('other_charges'),
                'notes': request.data.get('notes'),
                'terms_and_conditions': request.data.get('terms_and_conditions')
            }
            
            # Create invoice using service
            invoice = invoice_creation_service.create_invoice_from_po(
                purchase_order=purchase_order,
                invoice_data=invoice_data,
                created_by_user=service_user
            )
            
            # Return created invoice
            serializer = InvoiceDetailSerializer(invoice)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Error creating invoice from PO: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def create_from_quotation(self, request):
        """Create invoice from Quotation with proper shipping address handling"""
        try:
            session_key = request.data.get('session_key')
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            # Get quotation
            quotation_id = request.data.get('quotation_id')
            if not quotation_id:
                return Response({'error': 'Quotation ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                quotation = Quotation.objects.get(id=quotation_id, company=service_user.company)
            except Quotation.DoesNotExist:
                return Response({'error': 'Quotation not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Prepare invoice data
            invoice_data = {
                'invoice_date': request.data.get('invoice_date'),
                'due_date': request.data.get('due_date'),
                'reference': request.data.get('reference'),
                'shipping_address_id': request.data.get('shipping_address_id'),
                'claim_percentage': Decimal(str(request.data.get('claim_percentage', 100))),
                'discount_percentage': request.data.get('discount_percentage'),
                'discount_amount': request.data.get('discount_amount'),
                'shipping_charges': request.data.get('shipping_charges'),
                'other_charges': request.data.get('other_charges'),
                'notes': request.data.get('notes'),
                'terms_and_conditions': request.data.get('terms_and_conditions')
            }
            
            # Create invoice using service
            invoice = invoice_creation_service.create_invoice_from_quotation(
                quotation=quotation,
                invoice_data=invoice_data,
                created_by_user=service_user
            )
            
            # Return created invoice
            serializer = InvoiceDetailSerializer(invoice)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Error creating invoice from quotation: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def create_direct(self, request):
        """Create direct invoice with proper shipping address handling"""
        try:
            session_key = request.data.get('session_key')
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            # Get customer
            customer_id = request.data.get('customer_id')
            if not customer_id:
                return Response({'error': 'Customer ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                customer = Customer.objects.get(id=customer_id, company=service_user.company)
            except Customer.DoesNotExist:
                return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Prepare invoice data
            invoice_data = {
                'invoice_date': request.data.get('invoice_date'),
                'due_date': request.data.get('due_date'),
                'reference': request.data.get('reference'),
                'shipping_address_id': request.data.get('shipping_address_id'),
                'items': request.data.get('items', []),
                'discount_percentage': request.data.get('discount_percentage'),
                'discount_amount': request.data.get('discount_amount'),
                'shipping_charges': request.data.get('shipping_charges'),
                'other_charges': request.data.get('other_charges'),
                'notes': request.data.get('notes'),
                'terms_and_conditions': request.data.get('terms_and_conditions')
            }
            
            # Create invoice using service
            invoice = invoice_creation_service.create_direct_invoice(
                customer=customer,
                invoice_data=invoice_data,
                created_by_user=service_user
            )
            
            # Return created invoice
            serializer = InvoiceDetailSerializer(invoice)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Error creating direct invoice: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for invoice with proper shipping address display"""
        try:
            session_key = request.query_params.get('session_key')
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            # Get invoice
            invoice = invoice_query_service.get_invoice_with_shipping_details(pk, service_user.company)
            if not invoice:
                return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Get template code
            template_code = request.query_params.get('template', 'BKGE')
            
            # Generate PDF using existing service
            return generate_invoice_pdf_response(invoice, service_user.company)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Error generating invoice PDF: {str(e)}")
            return Response({'error': 'Failed to generate PDF'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'])
    def shipping_addresses(self, request, pk=None):
        """Get available shipping addresses for invoice"""
        try:
            session_key = request.query_params.get('session_key')
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            # Get invoice
            invoice = get_object_or_404(Invoice, id=pk, company=service_user.company)
            
            # Get customer shipping addresses
            addresses = []
            
            # Add billing address as option
            addresses.append({
                'id': None,
                'type': 'billing',
                'label': 'Same as Billing Address',
                'address': invoice.customer.full_billing_address,
                'is_default': invoice.shipping_address is None
            })
            
            # Add customer shipping addresses
            for addr in invoice.customer.shipping_addresses.all():
                addresses.append({
                    'id': addr.id,
                    'type': 'shipping',
                    'label': addr.label,
                    'address': addr.full_address,
                    'is_default': addr.is_default and invoice.shipping_address and invoice.shipping_address.id == addr.id
                })
            
            return Response({'addresses': addresses})
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Error getting shipping addresses: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['patch'])
    def update_shipping_address(self, request, pk=None):
        """Update shipping address for invoice"""
        try:
            session_key = request.data.get('session_key')
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            # Get invoice
            invoice = get_object_or_404(Invoice, id=pk, company=service_user.company)
            
            # Get new shipping address ID
            shipping_address_id = request.data.get('shipping_address_id')
            
            if shipping_address_id:
                try:
                    shipping_address = invoice.customer.shipping_addresses.get(id=shipping_address_id)
                    invoice.shipping_address = shipping_address
                except:
                    return Response({'error': 'Shipping address not found'}, status=status.HTTP_404_NOT_FOUND)
            else:
                invoice.shipping_address = None
            
            invoice.save(update_fields=['shipping_address'])
            
            # Return updated invoice
            serializer = InvoiceDetailSerializer(invoice)
            return Response(serializer.data)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Error updating shipping address: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)