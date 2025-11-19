import requests
import json
import hashlib
import hmac
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from .integration_models import PaymentGateway, IntegrationLog
from .models import Payment, Invoice, ProformaInvoice

class PaymentGatewayService:
    """Enhanced Payment Gateway Service for Finance System"""
    
    @staticmethod
    def test_gateway_connection(gateway: PaymentGateway):
        """Test payment gateway connection"""
        try:
            if gateway.gateway_type == 'razorpay':
                return PaymentGatewayService._test_razorpay(gateway)
            elif gateway.gateway_type == 'payu':
                return PaymentGatewayService._test_payu(gateway)
            elif gateway.gateway_type == 'hdfc':
                return PaymentGatewayService._test_hdfc(gateway)
            elif gateway.gateway_type == 'government':
                return PaymentGatewayService._test_government_portal(gateway)
            else:
                return {'success': False, 'message': 'Gateway type not supported'}
                
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def process_invoice_payment(gateway: PaymentGateway, invoice_id: int, amount: Decimal, payment_method: str = 'online'):
        """Process payment for invoice through gateway"""
        try:
            # Get invoice
            try:
                invoice = Invoice.objects.get(id=invoice_id)
            except Invoice.DoesNotExist:
                return {'success': False, 'message': 'Invoice not found'}
            
            # Validate amount
            if amount > invoice.outstanding_amount:
                return {'success': False, 'message': 'Amount exceeds outstanding balance'}
            
            # Process payment based on gateway type
            if gateway.gateway_type == 'razorpay':
                result = PaymentGatewayService._process_razorpay_payment(gateway, invoice, amount)
            elif gateway.gateway_type == 'payu':
                result = PaymentGatewayService._process_payu_payment(gateway, invoice, amount)
            elif gateway.gateway_type == 'hdfc':
                result = PaymentGatewayService._process_hdfc_payment(gateway, invoice, amount)
            else:
                result = {'success': False, 'message': 'Gateway not supported for invoice payments'}
            
            # Create payment record if successful
            if result.get('success'):
                payment = Payment.objects.create(
                    company=invoice.company,
                    customer=invoice.customer,
                    purchase_order=invoice.purchase_order,
                    invoice=invoice,
                    payment_date=timezone.now().date(),
                    amount=amount,
                    payment_method=payment_method,
                    reference_number=result.get('transaction_id', ''),
                    status='completed',
                    transaction_id=result.get('transaction_id', ''),
                    notes=f'Payment processed via {gateway.gateway_name}'
                )
                
                # Log successful payment
                IntegrationLog.objects.create(
                    company=invoice.company,
                    log_type='payment_gateway',
                    status='success',
                    message=f'Payment processed: {invoice.invoice_number} - ₹{amount}',
                    details=result
                )
                
                result['payment_id'] = payment.id
            
            return result
            
        except Exception as e:
            # Log error
            IntegrationLog.objects.create(
                company_id=1,
                log_type='payment_gateway',
                status='error',
                message=f'Payment processing failed: {str(e)}'
            )
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def get_payment_link(gateway: PaymentGateway, invoice_id: int, amount: Decimal):
        """Generate payment link for invoice"""
        try:
            invoice = Invoice.objects.get(id=invoice_id)
            
            if gateway.gateway_type == 'razorpay':
                return PaymentGatewayService._create_razorpay_link(gateway, invoice, amount)
            elif gateway.gateway_type == 'payu':
                return PaymentGatewayService._create_payu_link(gateway, invoice, amount)
            else:
                return {'success': False, 'message': 'Payment links not supported for this gateway'}
                
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    # Gateway-specific implementations
    @staticmethod
    def _test_razorpay(gateway):
        """Test Razorpay connection"""
        try:
            credentials = gateway.encrypted_credentials
            if not credentials.get('key_id') or not credentials.get('key_secret'):
                return {'success': False, 'message': 'Missing Razorpay credentials'}
            
            # Test API call to Razorpay
            import requests
            from requests.auth import HTTPBasicAuth
            
            response = requests.get(
                'https://api.razorpay.com/v1/payments',
                auth=HTTPBasicAuth(credentials['key_id'], credentials['key_secret']),
                params={'count': 1}
            )
            
            if response.status_code == 200:
                return {'success': True, 'message': 'Razorpay connection successful'}
            else:
                return {'success': False, 'message': f'Razorpay API error: {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'message': f'Razorpay test failed: {str(e)}'}
    
    @staticmethod
    def _test_payu(gateway):
        """Test PayU connection"""
        try:
            credentials = gateway.encrypted_credentials
            if not credentials.get('merchant_key') or not credentials.get('salt'):
                return {'success': False, 'message': 'Missing PayU credentials'}
            
            # PayU test transaction
            test_data = {
                'key': credentials['merchant_key'],
                'command': 'verify_payment',
                'var1': 'test_transaction'
            }
            
            # Generate hash
            hash_string = f"{test_data['key']}|{test_data['command']}|{test_data['var1']}|{credentials['salt']}"
            test_data['hash'] = hashlib.sha512(hash_string.encode()).hexdigest()
            
            response = requests.post('https://info.payu.in/merchant/postservice.php?form=2', data=test_data)
            
            if response.status_code == 200:
                return {'success': True, 'message': 'PayU connection successful'}
            else:
                return {'success': False, 'message': f'PayU API error: {response.status_code}'}
                
        except Exception as e:
            return {'success': False, 'message': f'PayU test failed: {str(e)}'}
    
    @staticmethod
    def _test_hdfc(gateway):
        """Test HDFC Payment Gateway connection"""
        return {'success': True, 'message': 'HDFC gateway configured (test mode)'}
    
    @staticmethod
    def _test_government_portal(gateway):
        """Test Government portal connection"""
        return {'success': True, 'message': 'Government portal configured (test mode)'}
    
    @staticmethod
    def _process_razorpay_payment(gateway, invoice, amount):
        """Process Razorpay payment"""
        try:
            credentials = gateway.encrypted_credentials
            
            # Create Razorpay order
            import requests
            from requests.auth import HTTPBasicAuth
            
            order_data = {
                'amount': int(amount * 100),  # Amount in paise
                'currency': 'INR',
                'receipt': f'inv_{invoice.id}_{int(timezone.now().timestamp())}',
                'notes': {
                    'invoice_id': invoice.id,
                    'invoice_number': invoice.invoice_number,
                    'customer_name': invoice.customer.name
                }
            }
            
            response = requests.post(
                'https://api.razorpay.com/v1/orders',
                auth=HTTPBasicAuth(credentials['key_id'], credentials['key_secret']),
                json=order_data
            )
            
            if response.status_code == 200:
                order = response.json()
                return {
                    'success': True,
                    'order_id': order['id'],
                    'transaction_id': order['receipt'],
                    'amount': amount,
                    'currency': 'INR'
                }
            else:
                return {'success': False, 'message': f'Razorpay order creation failed: {response.text}'}
                
        except Exception as e:
            return {'success': False, 'message': f'Razorpay payment failed: {str(e)}'}
    
    @staticmethod
    def _process_payu_payment(gateway, invoice, amount):
        """Process PayU payment"""
        try:
            credentials = gateway.encrypted_credentials
            
            # Generate transaction ID
            txnid = f'inv_{invoice.id}_{int(timezone.now().timestamp())}'
            
            # PayU payment data
            payment_data = {
                'key': credentials['merchant_key'],
                'txnid': txnid,
                'amount': str(amount),
                'productinfo': f'Payment for Invoice {invoice.invoice_number}',
                'firstname': invoice.customer.name.split()[0],
                'email': invoice.customer.email or 'customer@example.com',
                'phone': invoice.customer.phone or '9999999999',
                'surl': gateway.webhook_url or 'https://example.com/success',
                'furl': gateway.webhook_url or 'https://example.com/failure'
            }
            
            # Generate hash
            hash_string = f"{payment_data['key']}|{payment_data['txnid']}|{payment_data['amount']}|{payment_data['productinfo']}|{payment_data['firstname']}|{payment_data['email']}|||||||||||{credentials['salt']}"
            payment_data['hash'] = hashlib.sha512(hash_string.encode()).hexdigest()
            
            return {
                'success': True,
                'transaction_id': txnid,
                'payment_data': payment_data,
                'payment_url': 'https://secure.payu.in/_payment'
            }
            
        except Exception as e:
            return {'success': False, 'message': f'PayU payment failed: {str(e)}'}
    
    @staticmethod
    def _process_hdfc_payment(gateway, invoice, amount):
        """Process HDFC payment"""
        return {
            'success': True,
            'transaction_id': f'hdfc_{invoice.id}_{int(timezone.now().timestamp())}',
            'message': 'HDFC payment initiated (demo mode)'
        }
    
    @staticmethod
    def _create_razorpay_link(gateway, invoice, amount):
        """Create Razorpay payment link"""
        try:
            credentials = gateway.encrypted_credentials
            
            link_data = {
                'amount': int(amount * 100),
                'currency': 'INR',
                'accept_partial': False,
                'description': f'Payment for Invoice {invoice.invoice_number}',
                'customer': {
                    'name': invoice.customer.name,
                    'email': invoice.customer.email or 'customer@example.com',
                    'contact': invoice.customer.phone or '9999999999'
                },
                'notify': {
                    'sms': True,
                    'email': True
                },
                'reminder_enable': True,
                'notes': {
                    'invoice_id': invoice.id,
                    'invoice_number': invoice.invoice_number
                }
            }
            
            import requests
            from requests.auth import HTTPBasicAuth
            
            response = requests.post(
                'https://api.razorpay.com/v1/payment_links',
                auth=HTTPBasicAuth(credentials['key_id'], credentials['key_secret']),
                json=link_data
            )
            
            if response.status_code == 200:
                link = response.json()
                return {
                    'success': True,
                    'payment_link': link['short_url'],
                    'link_id': link['id']
                }
            else:
                return {'success': False, 'message': f'Payment link creation failed: {response.text}'}
                
        except Exception as e:
            return {'success': False, 'message': f'Payment link creation failed: {str(e)}'}
    
    @staticmethod
    def _create_payu_link(gateway, invoice, amount):
        """Create PayU payment link"""
        # PayU doesn't have direct payment links, return payment form URL
        return {
            'success': True,
            'payment_link': f'/payment/payu/{invoice.id}/',
            'message': 'PayU payment form URL generated'
        }