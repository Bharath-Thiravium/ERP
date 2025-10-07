import csv
import json
import requests
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from .models import Customer, Payment
from .integration_models import CustomerBankStatement

class BankValidationService:
    """Service for validating customer bank details"""
    
    @staticmethod
    def validate_ifsc(ifsc_code):
        """Validate IFSC code against RBI database"""
        try:
            # Mock validation - in production, use actual RBI API
            if len(ifsc_code) == 11 and ifsc_code[:4].isalpha() and ifsc_code[4] == '0':
                return {
                    'valid': True,
                    'bank_name': 'HDFC Bank',  # Mock data
                    'branch': 'Main Branch',
                    'address': 'Mumbai, Maharashtra'
                }
            return {'valid': False, 'error': 'Invalid IFSC format'}
        except Exception as e:
            return {'valid': False, 'error': str(e)}
    
    @staticmethod
    def validate_account_number(account_number, ifsc_code):
        """Validate account number format"""
        try:
            if len(account_number) >= 9 and len(account_number) <= 18 and account_number.isdigit():
                return {'valid': True}
            return {'valid': False, 'error': 'Invalid account number format'}
        except Exception as e:
            return {'valid': False, 'error': str(e)}
    
    @staticmethod
    def verify_customer_bank_details(customer):
        """Complete bank detail verification for customer"""
        try:
            results = {}
            
            # Validate IFSC
            if customer.bank_ifsc_code:
                ifsc_result = BankValidationService.validate_ifsc(customer.bank_ifsc_code)
                results['ifsc'] = ifsc_result
                
                # Validate account number
                if customer.bank_account_number:
                    account_result = BankValidationService.validate_account_number(
                        customer.bank_account_number, 
                        customer.bank_ifsc_code
                    )
                    results['account'] = account_result
                    
                    # Overall verification status
                    if ifsc_result.get('valid') and account_result.get('valid'):
                        customer.bank_verification_status = 'verified'
                        customer.bank_verified_date = timezone.now()
                        results['overall'] = {'status': 'verified', 'message': 'Bank details verified successfully'}
                    else:
                        customer.bank_verification_status = 'failed'
                        results['overall'] = {'status': 'failed', 'message': 'Bank details verification failed'}
                else:
                    customer.bank_verification_status = 'failed'
                    results['overall'] = {'status': 'failed', 'message': 'Account number missing'}
            else:
                customer.bank_verification_status = 'failed'
                results['overall'] = {'status': 'failed', 'message': 'IFSC code missing'}
            
            customer.save(update_fields=['bank_verification_status', 'bank_verified_date'])
            return results
            
        except Exception as e:
            return {'overall': {'status': 'error', 'message': str(e)}}

class BankStatementService:
    """Service for importing and processing bank statements"""
    
    @staticmethod
    def import_statement(customer, file_content, file_format='csv'):
        """Import bank statement from uploaded file"""
        try:
            imported_count = 0
            matched_count = 0
            batch_id = f"BATCH_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
            
            if file_format == 'csv':
                # Parse CSV content
                content = file_content.decode('utf-8')
                reader = csv.DictReader(content.splitlines())
                
                with transaction.atomic():
                    for row in reader:
                        # Parse transaction data
                        try:
                            transaction_date = datetime.strptime(row['Date'], '%Y-%m-%d').date()
                            amount = Decimal(str(row['Amount']).replace(',', ''))
                            transaction_type = 'credit' if amount > 0 else 'debit'
                            amount = abs(amount)
                            
                            # Create bank statement entry
                            statement, created = CustomerBankStatement.objects.get_or_create(
                                customer=customer,
                                transaction_date=transaction_date,
                                reference_number=row.get('Reference', ''),
                                defaults={
                                    'transaction_type': transaction_type,
                                    'amount': amount,
                                    'description': row.get('Description', ''),
                                    'import_batch_id': batch_id
                                }
                            )
                            
                            if created:
                                imported_count += 1
                                
                                # Auto-match with payments
                                if BankStatementService.auto_match_payment(statement):
                                    matched_count += 1
                                    
                        except (ValueError, KeyError) as e:
                            continue  # Skip invalid rows
                
                # Update customer's last import date
                customer.last_statement_import = timezone.now()
                customer.save(update_fields=['last_statement_import'])
                
                return {
                    'success': True,
                    'imported': imported_count,
                    'matched': matched_count,
                    'batch_id': batch_id
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'imported': 0,
                'matched': 0
            }
    
    @staticmethod
    def auto_match_payment(bank_statement):
        """Auto-match bank statement with payment records"""
        try:
            # Search for matching payments by amount and date range
            date_range_start = bank_statement.transaction_date - timedelta(days=2)
            date_range_end = bank_statement.transaction_date + timedelta(days=2)
            
            matching_payments = Payment.objects.filter(
                customer=bank_statement.customer,
                amount=bank_statement.amount,
                payment_date__range=[date_range_start, date_range_end],
                status='completed'
            ).exclude(customerbankstatement__isnull=False)
            
            if matching_payments.count() == 1:
                payment = matching_payments.first()
                bank_statement.matched_payment = payment
                bank_statement.is_matched = True
                bank_statement.match_confidence = Decimal('95.00')
                bank_statement.save()
                return True
            
            return False
            
        except Exception:
            return False
    
    @staticmethod
    def get_reconciliation_data(customer):
        """Get reconciliation data for customer"""
        try:
            statements = CustomerBankStatement.objects.filter(customer=customer)
            
            matched_statements = statements.filter(is_matched=True)
            unmatched_statements = statements.filter(is_matched=False)
            
            return {
                'total_statements': statements.count(),
                'matched_count': matched_statements.count(),
                'unmatched_count': unmatched_statements.count(),
                'matched_statements': [
                    {
                        'id': stmt.id,
                        'date': stmt.transaction_date,
                        'amount': stmt.amount,
                        'description': stmt.description,
                        'payment_number': stmt.matched_payment.payment_number if stmt.matched_payment else None,
                        'confidence': stmt.match_confidence
                    }
                    for stmt in matched_statements[:10]  # Latest 10
                ],
                'unmatched_statements': [
                    {
                        'id': stmt.id,
                        'date': stmt.transaction_date,
                        'amount': stmt.amount,
                        'description': stmt.description,
                        'reference': stmt.reference_number
                    }
                    for stmt in unmatched_statements[:10]  # Latest 10
                ]
            }
            
        except Exception as e:
            return {'error': str(e)}