import json
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from .integration_models import ERPIntegration, IntegrationLog
from .models import Customer, Product, Invoice, Payment, HSNCode, SACCode

class ERPConnectorService:
    """Enhanced ERP Connector Service for finance system integration"""
    
    @staticmethod
    def test_connection(erp_integration):
        """Test ERP connection"""
        try:
            if erp_integration.erp_type == 'tally':
                return ERPConnectorService._test_tally_connection(erp_integration)
            elif erp_integration.erp_type == 'sap':
                return ERPConnectorService._test_sap_connection(erp_integration)
            elif erp_integration.erp_type == 'oracle':
                return ERPConnectorService._test_oracle_connection(erp_integration)
            elif erp_integration.erp_type == 'quickbooks':
                return ERPConnectorService._test_quickbooks_connection(erp_integration)
            else:
                return {'success': False, 'message': 'Unsupported ERP type'}
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def sync_data(erp_integration, sync_type='all'):
        """Sync data with ERP system"""
        try:
            sync_results = {
                'customers': {'imported': 0, 'updated': 0, 'errors': 0},
                'products': {'imported': 0, 'updated': 0, 'errors': 0},
                'invoices': {'imported': 0, 'updated': 0, 'errors': 0},
                'payments': {'imported': 0, 'updated': 0, 'errors': 0}
            }
            
            with transaction.atomic():
                if sync_type in ['all', 'customers'] and erp_integration.sync_customers:
                    sync_results['customers'] = ERPConnectorService._sync_customers(erp_integration)
                
                if sync_type in ['all', 'products'] and erp_integration.sync_products:
                    sync_results['products'] = ERPConnectorService._sync_products(erp_integration)
                
                if sync_type in ['all', 'invoices'] and erp_integration.sync_invoices:
                    sync_results['invoices'] = ERPConnectorService._sync_invoices(erp_integration)
                
                if sync_type in ['all', 'payments'] and erp_integration.sync_payments:
                    sync_results['payments'] = ERPConnectorService._sync_payments(erp_integration)
            
            # Update sync status
            erp_integration.last_sync_date = timezone.now()
            erp_integration.connection_status = 'connected'
            erp_integration.save()
            
            # Log success
            total_processed = sum(
                result['imported'] + result['updated'] 
                for result in sync_results.values()
            )
            
            IntegrationLog.objects.create(
                company=erp_integration.company,
                log_type='erp_sync',
                status='success',
                message=f'ERP sync completed for {erp_integration.erp_name}',
                details=sync_results,
                records_processed=total_processed,
                records_success=total_processed
            )
            
            return sync_results
            
        except Exception as e:
            erp_integration.connection_status = 'error'
            erp_integration.save()
            
            IntegrationLog.objects.create(
                company=erp_integration.company,
                log_type='erp_sync',
                status='error',
                message=f'ERP sync failed: {str(e)}',
                details={'error': str(e)}
            )
            raise e
    
    @staticmethod
    def _sync_customers(erp_integration):
        """Sync customers from ERP"""
        result = {'imported': 0, 'updated': 0, 'errors': 0}
        
        try:
            if erp_integration.erp_type == 'tally':
                customers_data = ERPConnectorService._get_tally_customers(erp_integration)
            elif erp_integration.erp_type == 'sap':
                customers_data = ERPConnectorService._get_sap_customers(erp_integration)
            elif erp_integration.erp_type == 'quickbooks':
                customers_data = ERPConnectorService._get_quickbooks_customers(erp_integration)
            else:
                return result
            
            for customer_data in customers_data:
                try:
                    customer, created = Customer.objects.update_or_create(
                        company=erp_integration.company,
                        customer_code=customer_data.get('code', ''),
                        defaults={
                            'name': customer_data.get('name', ''),
                            'email': customer_data.get('email', ''),
                            'phone': customer_data.get('phone', ''),
                            'gstin': customer_data.get('gstin', ''),
                            'pan_number': customer_data.get('pan', ''),
                            'full_billing_address': customer_data.get('address', ''),
                            'credit_limit': Decimal(customer_data.get('credit_limit', 0)),
                            'payment_terms': customer_data.get('payment_terms', ''),
                            'is_active': customer_data.get('is_active', True)
                        }
                    )
                    
                    if created:
                        result['imported'] += 1
                    else:
                        result['updated'] += 1
                        
                except Exception as e:
                    result['errors'] += 1
                    
        except Exception as e:
            result['errors'] += 1
            
        return result
    
    @staticmethod
    def _sync_products(erp_integration):
        """Sync products from ERP"""
        result = {'imported': 0, 'updated': 0, 'errors': 0}
        
        try:
            if erp_integration.erp_type == 'tally':
                products_data = ERPConnectorService._get_tally_products(erp_integration)
            elif erp_integration.erp_type == 'sap':
                products_data = ERPConnectorService._get_sap_products(erp_integration)
            elif erp_integration.erp_type == 'quickbooks':
                products_data = ERPConnectorService._get_quickbooks_products(erp_integration)
            else:
                return result
            
            for product_data in products_data:
                try:
                    # Get or create HSN/SAC code
                    hsn_code = None
                    sac_code = None
                    
                    if product_data.get('hsn_code'):
                        hsn_code, _ = HSNCode.objects.get_or_create(
                            code=product_data['hsn_code'],
                            defaults={'description': product_data.get('hsn_description', '')}
                        )
                    
                    if product_data.get('sac_code'):
                        sac_code, _ = SACCode.objects.get_or_create(
                            code=product_data['sac_code'],
                            defaults={'service_name': product_data.get('sac_description', '')}
                        )
                    
                    product, created = Product.objects.update_or_create(
                        company=erp_integration.company,
                        product_code=product_data.get('code', ''),
                        defaults={
                            'name': product_data.get('name', ''),
                            'description': product_data.get('description', ''),
                            'product_type': product_data.get('type', 'product'),
                            'unit': product_data.get('unit', 'Nos'),
                            'selling_price': Decimal(product_data.get('selling_price', 0)),
                            'purchase_price': Decimal(product_data.get('purchase_price', 0)),
                            'gst_rate': Decimal(product_data.get('gst_rate', 0)),
                            'hsn_code': hsn_code,
                            'sac_code': sac_code,
                            'is_active': product_data.get('is_active', True)
                        }
                    )
                    
                    if created:
                        result['imported'] += 1
                    else:
                        result['updated'] += 1
                        
                except Exception as e:
                    result['errors'] += 1
                    
        except Exception as e:
            result['errors'] += 1
            
        return result
    
    @staticmethod
    def _sync_invoices(erp_integration):
        """Sync invoices from ERP"""
        result = {'imported': 0, 'updated': 0, 'errors': 0}
        
        try:
            if erp_integration.erp_type == 'tally':
                invoices_data = ERPConnectorService._get_tally_invoices(erp_integration)
            elif erp_integration.erp_type == 'sap':
                invoices_data = ERPConnectorService._get_sap_invoices(erp_integration)
            elif erp_integration.erp_type == 'quickbooks':
                invoices_data = ERPConnectorService._get_quickbooks_invoices(erp_integration)
            else:
                return result
            
            for invoice_data in invoices_data:
                try:
                    # Find customer
                    customer = Customer.objects.filter(
                        company=erp_integration.company,
                        customer_code=invoice_data.get('customer_code')
                    ).first()
                    
                    if not customer:
                        result['errors'] += 1
                        continue
                    
                    invoice, created = Invoice.objects.update_or_create(
                        company=erp_integration.company,
                        invoice_number=invoice_data.get('invoice_number', ''),
                        defaults={
                            'customer': customer,
                            'invoice_date': datetime.strptime(invoice_data.get('date'), '%Y-%m-%d').date(),
                            'due_date': datetime.strptime(invoice_data.get('due_date'), '%Y-%m-%d').date(),
                            'subtotal': Decimal(invoice_data.get('subtotal', 0)),
                            'total_tax': Decimal(invoice_data.get('total_tax', 0)),
                            'total_amount': Decimal(invoice_data.get('total_amount', 0)),
                            'status': invoice_data.get('status', 'draft'),
                            'payment_status': invoice_data.get('payment_status', 'unpaid')
                        }
                    )
                    
                    if created:
                        result['imported'] += 1
                    else:
                        result['updated'] += 1
                        
                except Exception as e:
                    result['errors'] += 1
                    
        except Exception as e:
            result['errors'] += 1
            
        return result
    
    @staticmethod
    def _sync_payments(erp_integration):
        """Sync payments from ERP"""
        result = {'imported': 0, 'updated': 0, 'errors': 0}
        
        try:
            if erp_integration.erp_type == 'tally':
                payments_data = ERPConnectorService._get_tally_payments(erp_integration)
            elif erp_integration.erp_type == 'sap':
                payments_data = ERPConnectorService._get_sap_payments(erp_integration)
            elif erp_integration.erp_type == 'quickbooks':
                payments_data = ERPConnectorService._get_quickbooks_payments(erp_integration)
            else:
                return result
            
            for payment_data in payments_data:
                try:
                    # Find customer and invoice
                    customer = Customer.objects.filter(
                        company=erp_integration.company,
                        customer_code=payment_data.get('customer_code')
                    ).first()
                    
                    invoice = None
                    if payment_data.get('invoice_number'):
                        invoice = Invoice.objects.filter(
                            company=erp_integration.company,
                            invoice_number=payment_data.get('invoice_number')
                        ).first()
                    
                    if not customer:
                        result['errors'] += 1
                        continue
                    
                    payment, created = Payment.objects.update_or_create(
                        company=erp_integration.company,
                        payment_number=payment_data.get('payment_number', ''),
                        defaults={
                            'customer': customer,
                            'invoice': invoice,
                            'payment_date': datetime.strptime(payment_data.get('date'), '%Y-%m-%d').date(),
                            'amount': Decimal(payment_data.get('amount', 0)),
                            'payment_method': payment_data.get('payment_method', 'bank_transfer'),
                            'reference_number': payment_data.get('reference', ''),
                            'status': payment_data.get('status', 'completed')
                        }
                    )
                    
                    if created:
                        result['imported'] += 1
                    else:
                        result['updated'] += 1
                        
                except Exception as e:
                    result['errors'] += 1
                    
        except Exception as e:
            result['errors'] += 1
            
        return result
    
    # ERP-specific connection and data retrieval methods
    @staticmethod
    def _test_tally_connection(erp_integration):
        """Test Tally connection"""
        try:
            # Tally XML API test request
            xml_request = """<?xml version="1.0" encoding="UTF-8"?>
            <ENVELOPE>
                <HEADER>
                    <TALLYREQUEST>Export Data</TALLYREQUEST>
                </HEADER>
                <BODY>
                    <EXPORTDATA>
                        <REQUESTDESC>
                            <REPORTNAME>List of Companies</REPORTNAME>
                        </REQUESTDESC>
                    </EXPORTDATA>
                </BODY>
            </ENVELOPE>"""
            
            response = requests.post(
                f"{erp_integration.server_url}:9000",
                data=xml_request,
                headers={'Content-Type': 'application/xml'},
                timeout=10
            )
            
            if response.status_code == 200:
                return {'success': True, 'message': 'Tally connection successful'}
            else:
                return {'success': False, 'message': f'Connection failed: {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def _test_sap_connection(erp_integration):
        """Test SAP connection"""
        try:
            # SAP REST API test
            response = requests.get(
                f"{erp_integration.server_url}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner",
                auth=(erp_integration.username, erp_integration.encrypted_credentials.get('password', '')),
                params={'$top': 1},
                timeout=10
            )
            
            if response.status_code == 200:
                return {'success': True, 'message': 'SAP connection successful'}
            else:
                return {'success': False, 'message': f'Connection failed: {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def _test_oracle_connection(erp_integration):
        """Test Oracle connection"""
        try:
            # Oracle REST API test
            response = requests.get(
                f"{erp_integration.server_url}/fscmRestApi/resources/11.13.18.05/customers",
                auth=(erp_integration.username, erp_integration.encrypted_credentials.get('password', '')),
                params={'limit': 1},
                timeout=10
            )
            
            if response.status_code == 200:
                return {'success': True, 'message': 'Oracle connection successful'}
            else:
                return {'success': False, 'message': f'Connection failed: {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def _test_quickbooks_connection(erp_integration):
        """Test QuickBooks connection"""
        try:
            # QuickBooks API test
            response = requests.get(
                f"{erp_integration.server_url}/v3/company/{erp_integration.database_name}/companyinfo/{erp_integration.database_name}",
                headers={
                    'Authorization': f"Bearer {erp_integration.encrypted_credentials.get('access_token', '')}",
                    'Accept': 'application/json'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                return {'success': True, 'message': 'QuickBooks connection successful'}
            else:
                return {'success': False, 'message': f'Connection failed: {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    # Data retrieval methods (simplified examples)
    @staticmethod
    def _get_tally_customers(erp_integration):
        """Get customers from Tally"""
        # Simplified example - actual implementation would parse Tally XML
        return [
            {
                'code': 'CUST001',
                'name': 'Sample Customer',
                'email': 'customer@example.com',
                'phone': '9876543210',
                'address': 'Sample Address',
                'credit_limit': 100000,
                'is_active': True
            }
        ]
    
    @staticmethod
    def _get_sap_customers(erp_integration):
        """Get customers from SAP"""
        # Simplified example - actual implementation would call SAP APIs
        return []
    
    @staticmethod
    def _get_quickbooks_customers(erp_integration):
        """Get customers from QuickBooks"""
        # Simplified example - actual implementation would call QuickBooks APIs
        return []
    
    @staticmethod
    def _get_tally_products(erp_integration):
        """Get products from Tally"""
        return []
    
    @staticmethod
    def _get_sap_products(erp_integration):
        """Get products from SAP"""
        return []
    
    @staticmethod
    def _get_quickbooks_products(erp_integration):
        """Get products from QuickBooks"""
        return []
    
    @staticmethod
    def _get_tally_invoices(erp_integration):
        """Get invoices from Tally"""
        return []
    
    @staticmethod
    def _get_sap_invoices(erp_integration):
        """Get invoices from SAP"""
        return []
    
    @staticmethod
    def _get_quickbooks_invoices(erp_integration):
        """Get invoices from QuickBooks"""
        return []
    
    @staticmethod
    def _get_tally_payments(erp_integration):
        """Get payments from Tally"""
        return []
    
    @staticmethod
    def _get_sap_payments(erp_integration):
        """Get payments from SAP"""
        return []
    
    @staticmethod
    def _get_quickbooks_payments(erp_integration):
        """Get payments from QuickBooks"""
        return []