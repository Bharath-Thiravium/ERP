from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from django.http import JsonResponse
from django.db.models import Q
from authentication.models import ServiceUserSession
from .models import Customer
from .integration_models import CustomerBankStatement
from .bank_integration_service import BankValidationService, BankStatementService

class WrappedAPIView(APIView):
    """Base API view with session authentication for bank integration"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth
    
    def get_session_key(self, request):
        """Get session key from Authorization header or query params"""
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.query_params.get('session_key')
        if not session_key and hasattr(request, 'data'):
            session_key = request.data.get('session_key')
        return session_key
    
    def get_service_user_session(self, request):
        """Get service user session from session key"""
        session_key = self.get_session_key(request)
        if not session_key:
            return None, Response({'error': 'Session key required'}, status=401)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return session, None
        except ServiceUserSession.DoesNotExist:
            return None, Response({'error': 'Invalid session'}, status=401)

class BankCustomersView(WrappedAPIView):
    """Get customers with bank details for integration"""
    
    def get(self, request):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        try:
            # Get customers with bank details
            customers = Customer.objects.filter(
                company=session.service_user.company
            ).exclude(
                Q(bank_account_number='') | Q(bank_ifsc_code='')
            ).values(
                'id', 'name', 'bank_name', 'bank_account_number', 
                'bank_ifsc_code', 'bank_branch', 'account_holder_name',
                'bank_verification_status', 'bank_verified_date',
                'statement_import_enabled', 'last_statement_import'
            )
            
            return Response({
                'customers': list(customers)
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

get_customers_for_bank_integration = BankCustomersView.as_view()

class VerifyBankDetailsView(WrappedAPIView):
    """Verify customer bank details"""
    
    def post(self, request):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        customer_id = request.data.get('customer_id')
        if not customer_id:
            return Response({'error': 'Customer ID required'}, status=400)
        
        try:
            customer = Customer.objects.get(
                id=customer_id,
                company=session.service_user.company
            )
            
            # Verify bank details
            verification_result = BankValidationService.verify_customer_bank_details(customer)
            
            return Response({
                'message': 'Bank details verification completed',
                'verification_result': verification_result,
                'customer_status': customer.bank_verification_status
            })
            
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

verify_customer_bank_details = VerifyBankDetailsView.as_view()

class ImportBankStatementView(WrappedAPIView):
    """Import bank statement for customer"""
    
    def post(self, request):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        customer_id = request.data.get('customer_id')
        uploaded_file = request.FILES.get('file')
        
        if not customer_id or not uploaded_file:
            return Response({'error': 'Customer ID and file required'}, status=400)
        
        try:
            customer = Customer.objects.get(
                id=customer_id,
                company=session.service_user.company
            )
            
            # Import bank statement
            result = BankStatementService.import_statement(
                customer=customer,
                file_content=uploaded_file.read(),
                file_format='csv'
            )
            
            if result['success']:
                return Response({
                    'message': 'Bank statement imported successfully',
                    'imported_transactions': result['imported'],
                    'matched_payments': result['matched'],
                    'batch_id': result['batch_id']
                })
            else:
                return Response({
                    'error': result['error']
                }, status=400)
            
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

import_bank_statement = ImportBankStatementView.as_view()

class ReconciliationDataView(WrappedAPIView):
    """Get reconciliation data for customer"""
    
    def get(self, request):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        customer_id = request.query_params.get('customer_id')
        if not customer_id:
            return Response({'error': 'Customer ID required'}, status=400)
        
        try:
            customer = Customer.objects.get(
                id=customer_id,
                company=session.service_user.company
            )
            
            # Get reconciliation data
            reconciliation_data = BankStatementService.get_reconciliation_data(customer)
            
            return Response(reconciliation_data)
            
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

get_reconciliation_data = ReconciliationDataView.as_view()

class ManualMatchPaymentView(WrappedAPIView):
    """Manually match bank statement with payment"""
    
    def post(self, request):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        statement_id = request.data.get('statement_id')
        payment_id = request.data.get('payment_id')
        
        if not statement_id:
            return Response({'error': 'Statement ID required'}, status=400)
        
        try:
            statement = CustomerBankStatement.objects.get(
                id=statement_id,
                customer__company=session.service_user.company
            )
            
            if payment_id:
                # Match with specific payment
                from .models import Payment
                payment = Payment.objects.get(
                    id=payment_id,
                    customer=statement.customer
                )
                statement.matched_payment = payment
                statement.is_matched = True
                statement.match_confidence = 100.00
            else:
                # Unmatch
                statement.matched_payment = None
                statement.is_matched = False
                statement.match_confidence = 0.00
            
            statement.save()
            
            return Response({
                'message': 'Payment matching updated successfully'
            })
            
        except CustomerBankStatement.DoesNotExist:
            return Response({'error': 'Bank statement not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

manual_match_payment = ManualMatchPaymentView.as_view()

class BankIntegrationDashboardView(WrappedAPIView):
    """Bank integration dashboard data"""
    
    def get(self, request):
        session, error_response = self.get_service_user_session(request)
        if error_response:
            return error_response
        
        try:
            company = session.service_user.company
            
            # Get customers with bank details
            customers_with_bank = Customer.objects.filter(
                company=company
            ).exclude(
                Q(bank_account_number='') | Q(bank_ifsc_code='')
            )
            
            # Get verification stats
            verified_customers = customers_with_bank.filter(bank_verification_status='verified')
            pending_customers = customers_with_bank.filter(bank_verification_status='pending')
            failed_customers = customers_with_bank.filter(bank_verification_status='failed')
            
            # Get statement stats
            total_statements = CustomerBankStatement.objects.filter(
                customer__company=company
            ).count()
            
            matched_statements = CustomerBankStatement.objects.filter(
                customer__company=company,
                is_matched=True
            ).count()
            
            return Response({
                'total_customers_with_bank': customers_with_bank.count(),
                'verified_customers': verified_customers.count(),
                'pending_customers': pending_customers.count(),
                'failed_customers': failed_customers.count(),
                'total_statements': total_statements,
                'matched_statements': matched_statements,
                'unmatched_statements': total_statements - matched_statements,
                'match_percentage': (matched_statements / total_statements * 100) if total_statements > 0 else 0
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=500)

bank_integration_dashboard = BankIntegrationDashboardView.as_view()