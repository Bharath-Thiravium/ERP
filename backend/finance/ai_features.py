"""
AI-Powered Features for Finance System
"""
import numpy as np
from django.db.models import Sum, Avg, Count
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from .models import Invoice, Payment, Customer
import json

class PaymentPredictionEngine:
    """AI-powered payment prediction and analytics"""
    
    def __init__(self, company):
        self.company = company
    
    def predict_payment_likelihood(self, customer_id, invoice_amount):
        """Predict likelihood of payment based on historical data"""
        try:
            customer = Customer.objects.get(id=customer_id, company=self.company)
            
            # Get historical payment data
            historical_invoices = Invoice.objects.filter(
                customer=customer,
                company=self.company
            ).order_by('-created_at')[:20]  # Last 20 invoices
            
            if not historical_invoices.exists():
                return {
                    'payment_likelihood': 75,  # Default for new customers
                    'predicted_payment_date': (timezone.now() + timedelta(days=30)).date().isoformat(),
                    'risk_level': 'medium',
                    'confidence': 50,
                    'factors': ['New customer - limited history']
                }
            
            # Calculate payment metrics
            total_invoices = historical_invoices.count()
            paid_invoices = historical_invoices.filter(payment_status='paid').count()
            payment_rate = (paid_invoices / total_invoices) * 100 if total_invoices > 0 else 0
            
            # Calculate average payment delay
            paid_invoice_delays = []
            for invoice in historical_invoices.filter(payment_status='paid'):
                if invoice.last_payment_date and invoice.due_date:
                    delay = (invoice.last_payment_date - invoice.due_date).days
                    paid_invoice_delays.append(max(0, delay))
            
            avg_delay = sum(paid_invoice_delays) / len(paid_invoice_delays) if paid_invoice_delays else 15
            
            # Calculate amount-based risk
            avg_invoice_amount = historical_invoices.aggregate(Avg('total_amount'))['total_amount__avg'] or 0
            amount_risk_factor = min(100, (float(invoice_amount) / float(avg_invoice_amount)) * 50) if avg_invoice_amount > 0 else 50
            
            # Calculate recency factor
            last_invoice_date = historical_invoices.first().created_at.date()
            days_since_last = (timezone.now().date() - last_invoice_date).days
            recency_factor = max(0, 100 - (days_since_last * 2))  # Reduce by 2% per day
            
            # Calculate final likelihood
            base_likelihood = payment_rate
            amount_adjustment = -amount_risk_factor * 0.2  # Reduce likelihood for larger amounts
            recency_adjustment = recency_factor * 0.1
            
            final_likelihood = max(10, min(95, base_likelihood + amount_adjustment + recency_adjustment))
            
            # Predict payment date
            predicted_days = avg_delay + (100 - final_likelihood) * 0.5
            predicted_date = timezone.now().date() + timedelta(days=int(predicted_days))
            
            # Determine risk level
            if final_likelihood >= 80:
                risk_level = 'low'
            elif final_likelihood >= 60:
                risk_level = 'medium'
            else:
                risk_level = 'high'
            
            # Generate factors
            factors = []
            if payment_rate >= 90:
                factors.append('Excellent payment history')
            elif payment_rate >= 70:
                factors.append('Good payment history')
            else:
                factors.append('Poor payment history')
            
            if avg_delay <= 5:
                factors.append('Typically pays on time')
            elif avg_delay <= 15:
                factors.append('Moderate payment delays')
            else:
                factors.append('Frequent payment delays')
            
            if float(invoice_amount) > float(avg_invoice_amount) * 1.5:
                factors.append('Invoice amount above average')
            
            if days_since_last <= 30:
                factors.append('Recent customer activity')
            
            return {
                'payment_likelihood': round(final_likelihood, 1),
                'predicted_payment_date': predicted_date.isoformat(),
                'risk_level': risk_level,
                'confidence': min(95, total_invoices * 5),  # Higher confidence with more data
                'factors': factors,
                'historical_metrics': {
                    'payment_rate': round(payment_rate, 1),
                    'average_delay_days': round(avg_delay, 1),
                    'total_invoices': total_invoices,
                    'paid_invoices': paid_invoices
                }
            }
            
        except Customer.DoesNotExist:
            return {
                'payment_likelihood': 50,
                'predicted_payment_date': (timezone.now() + timedelta(days=30)).date().isoformat(),
                'risk_level': 'medium',
                'confidence': 0,
                'factors': ['Customer not found'],
                'error': 'Customer not found'
            }
    
    def generate_payment_insights(self, start_date, end_date):
        """Generate AI-powered payment insights"""
        invoices = Invoice.objects.filter(
            company=self.company,
            created_at__date__range=[start_date, end_date]
        )
        
        payments = Payment.objects.filter(
            company=self.company,
            payment_date__range=[start_date, end_date]
        )
        
        # Payment pattern analysis
        payment_patterns = self._analyze_payment_patterns(payments)
        
        # Customer risk analysis
        customer_risks = self._analyze_customer_risks(invoices)
        
        # Seasonal trends
        seasonal_trends = self._analyze_seasonal_trends(payments)
        
        # Recommendations
        recommendations = self._generate_recommendations(payment_patterns, customer_risks)
        
        return {
            'period': {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d')
            },
            'payment_patterns': payment_patterns,
            'customer_risks': customer_risks,
            'seasonal_trends': seasonal_trends,
            'recommendations': recommendations,
            'generated_at': timezone.now().isoformat()
        }
    
    def _analyze_payment_patterns(self, payments):
        """Analyze payment patterns"""
        if not payments.exists():
            return {'message': 'No payment data available'}
        
        # Payment method analysis
        method_analysis = {}
        for payment in payments:
            method = payment.payment_method
            if method not in method_analysis:
                method_analysis[method] = {
                    'count': 0,
                    'total_amount': 0,
                    'avg_amount': 0
                }
            method_analysis[method]['count'] += 1
            method_analysis[method]['total_amount'] += float(payment.amount)
        
        for method in method_analysis:
            method_analysis[method]['avg_amount'] = method_analysis[method]['total_amount'] / method_analysis[method]['count']
        
        # Day of week analysis
        day_analysis = {}
        for payment in payments:
            day = payment.payment_date.strftime('%A')
            if day not in day_analysis:
                day_analysis[day] = 0
            day_analysis[day] += 1
        
        return {
            'payment_methods': method_analysis,
            'day_of_week_patterns': day_analysis,
            'total_payments': payments.count(),
            'average_payment_amount': float(payments.aggregate(Avg('amount'))['amount__avg'] or 0)
        }
    
    def _analyze_customer_risks(self, invoices):
        """Analyze customer payment risks"""
        customer_risks = []
        
        customers = Customer.objects.filter(
            company=self.company,
            invoice__in=invoices
        ).distinct()
        
        for customer in customers[:10]:  # Top 10 customers
            customer_invoices = invoices.filter(customer=customer)
            total_amount = customer_invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            outstanding = customer_invoices.aggregate(Sum('outstanding_amount'))['outstanding_amount__sum'] or 0
            
            risk_score = (float(outstanding) / float(total_amount)) * 100 if total_amount > 0 else 0
            
            if risk_score > 50:
                risk_level = 'high'
            elif risk_score > 25:
                risk_level = 'medium'
            else:
                risk_level = 'low'
            
            customer_risks.append({
                'customer_name': customer.name,
                'total_amount': float(total_amount),
                'outstanding_amount': float(outstanding),
                'risk_score': round(risk_score, 1),
                'risk_level': risk_level
            })
        
        return sorted(customer_risks, key=lambda x: x['risk_score'], reverse=True)
    
    def _analyze_seasonal_trends(self, payments):
        """Analyze seasonal payment trends"""
        monthly_data = {}
        
        for payment in payments:
            month = payment.payment_date.strftime('%B')
            if month not in monthly_data:
                monthly_data[month] = {
                    'count': 0,
                    'total_amount': 0
                }
            monthly_data[month]['count'] += 1
            monthly_data[month]['total_amount'] += float(payment.amount)
        
        return monthly_data
    
    def _generate_recommendations(self, payment_patterns, customer_risks):
        """Generate AI-powered recommendations"""
        recommendations = []
        
        # Payment method recommendations
        if payment_patterns.get('payment_methods'):
            methods = payment_patterns['payment_methods']
            if 'upi' in methods and methods['upi']['count'] > 0:
                recommendations.append({
                    'type': 'payment_method',
                    'priority': 'medium',
                    'title': 'Promote UPI Payments',
                    'description': 'UPI payments are fast and cost-effective. Consider offering incentives for UPI payments.'
                })
        
        # Customer risk recommendations
        high_risk_customers = [c for c in customer_risks if c['risk_level'] == 'high']
        if high_risk_customers:
            recommendations.append({
                'type': 'risk_management',
                'priority': 'high',
                'title': 'High-Risk Customers Identified',
                'description': f'{len(high_risk_customers)} customers have high payment risk. Consider credit limits or advance payments.'
            })
        
        # General recommendations
        recommendations.append({
            'type': 'automation',
            'priority': 'medium',
            'title': 'Payment Reminder Automation',
            'description': 'Set up automated payment reminders to improve collection efficiency.'
        })
        
        return recommendations

class FraudDetectionEngine:
    """AI-powered fraud detection system"""
    
    def __init__(self, company):
        self.company = company
    
    def detect_anomalies(self, start_date, end_date):
        """Detect potential fraud or anomalies"""
        invoices = Invoice.objects.filter(
            company=self.company,
            created_at__date__range=[start_date, end_date]
        )
        
        payments = Payment.objects.filter(
            company=self.company,
            payment_date__range=[start_date, end_date]
        )
        
        anomalies = []
        
        # Detect unusual invoice amounts
        avg_invoice_amount = invoices.aggregate(Avg('total_amount'))['total_amount__avg'] or 0
        std_threshold = float(avg_invoice_amount) * 3  # 3x average as threshold
        
        unusual_invoices = invoices.filter(total_amount__gt=std_threshold)
        for invoice in unusual_invoices:
            anomalies.append({
                'type': 'unusual_amount',
                'severity': 'medium',
                'description': f'Invoice {invoice.invoice_number} has unusually high amount: ₹{invoice.total_amount}',
                'reference': invoice.invoice_number,
                'amount': float(invoice.total_amount),
                'threshold': std_threshold
            })
        
        # Detect rapid-fire invoicing
        customer_invoice_counts = invoices.values('customer').annotate(
            invoice_count=Count('id')
        ).filter(invoice_count__gt=10)  # More than 10 invoices in period
        
        for item in customer_invoice_counts:
            customer = Customer.objects.get(id=item['customer'])
            anomalies.append({
                'type': 'rapid_invoicing',
                'severity': 'low',
                'description': f'Customer {customer.name} has {item["invoice_count"]} invoices in short period',
                'reference': customer.name,
                'count': item['invoice_count']
            })
        
        # Detect unusual payment patterns
        large_payments = payments.filter(amount__gt=avg_invoice_amount * 2)
        for payment in large_payments:
            anomalies.append({
                'type': 'large_payment',
                'severity': 'low',
                'description': f'Large payment received: ₹{payment.amount}',
                'reference': payment.payment_number,
                'amount': float(payment.amount)
            })
        
        # Detect duplicate customer data
        duplicate_customers = self._detect_duplicate_customers()
        anomalies.extend(duplicate_customers)
        
        return {
            'period': {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d')
            },
            'summary': {
                'total_anomalies': len(anomalies),
                'high_severity': len([a for a in anomalies if a['severity'] == 'high']),
                'medium_severity': len([a for a in anomalies if a['severity'] == 'medium']),
                'low_severity': len([a for a in anomalies if a['severity'] == 'low'])
            },
            'anomalies': anomalies,
            'generated_at': timezone.now().isoformat()
        }
    
    def _detect_duplicate_customers(self):
        """Detect potential duplicate customers"""
        customers = Customer.objects.filter(company=self.company)
        duplicates = []
        
        # Check for duplicate PANs
        pan_duplicates = customers.exclude(pan_number__isnull=True).exclude(pan_number='').values('pan_number').annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        for item in pan_duplicates:
            duplicate_customers = customers.filter(pan_number=item['pan_number'])
            names = [c.name for c in duplicate_customers]
            duplicates.append({
                'type': 'duplicate_pan',
                'severity': 'high',
                'description': f'Duplicate PAN {item["pan_number"]} found for customers: {", ".join(names)}',
                'reference': item['pan_number'],
                'customers': names
            })
        
        # Check for similar names
        customer_names = [(c.id, c.name.lower().strip()) for c in customers]
        for i, (id1, name1) in enumerate(customer_names):
            for id2, name2 in customer_names[i+1:]:
                if self._calculate_similarity(name1, name2) > 0.8:  # 80% similarity
                    duplicates.append({
                        'type': 'similar_names',
                        'severity': 'medium',
                        'description': f'Similar customer names detected: {name1} and {name2}',
                        'reference': f'{id1}-{id2}',
                        'similarity': self._calculate_similarity(name1, name2)
                    })
        
        return duplicates
    
    def _calculate_similarity(self, str1, str2):
        """Calculate string similarity using simple algorithm"""
        if not str1 or not str2:
            return 0
        
        # Simple Jaccard similarity
        set1 = set(str1.split())
        set2 = set(str2.split())
        
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))
        
        return intersection / union if union > 0 else 0