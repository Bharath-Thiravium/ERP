"""
Financial Reports Generator - P&L, Balance Sheet, Cash Flow
"""
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from .models import Invoice, Payment, Customer, Product

class FinancialReportsGenerator:
    """Generate comprehensive financial reports"""
    
    def __init__(self, company):
        self.company = company
    
    def generate_profit_loss_report(self, start_date, end_date):
        """Generate Profit & Loss Statement"""
        invoices = Invoice.objects.filter(
            company=self.company,
            invoice_date__range=[start_date, end_date]
        )
        
        payments = Payment.objects.filter(
            company=self.company,
            payment_date__range=[start_date, end_date]
        )
        
        # Revenue
        total_revenue = invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        service_revenue = invoices.filter(
            invoice_items__product__product_type='service'
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        product_revenue = total_revenue - service_revenue
        
        # Cost of Goods Sold (simplified)
        cogs = invoices.aggregate(Sum('subtotal'))['subtotal__sum'] or 0
        cogs = cogs * Decimal('0.6')  # Assume 60% COGS
        
        gross_profit = total_revenue - cogs
        
        # Operating Expenses (estimated)
        operating_expenses = total_revenue * Decimal('0.25')  # 25% of revenue
        
        # Tax expenses
        tax_expenses = invoices.aggregate(Sum('total_tax'))['total_tax__sum'] or 0
        
        # TDS recovered
        tds_recovered = payments.aggregate(Sum('tds_amount'))['tds_amount__sum'] or 0
        
        # Net Income
        ebitda = gross_profit - operating_expenses
        net_income = ebitda - tax_expenses + tds_recovered
        
        return {
            'period': {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d')
            },
            'revenue': {
                'product_revenue': float(product_revenue),
                'service_revenue': float(service_revenue),
                'total_revenue': float(total_revenue)
            },
            'costs': {
                'cost_of_goods_sold': float(cogs),
                'gross_profit': float(gross_profit),
                'gross_margin_percentage': float((gross_profit / total_revenue) * 100) if total_revenue > 0 else 0
            },
            'expenses': {
                'operating_expenses': float(operating_expenses),
                'tax_expenses': float(tax_expenses),
                'total_expenses': float(operating_expenses + tax_expenses)
            },
            'profitability': {
                'ebitda': float(ebitda),
                'ebitda_margin': float((ebitda / total_revenue) * 100) if total_revenue > 0 else 0,
                'tds_recovered': float(tds_recovered),
                'net_income': float(net_income),
                'net_margin': float((net_income / total_revenue) * 100) if total_revenue > 0 else 0
            },
            'generated_at': timezone.now().isoformat()
        }
    
    def generate_balance_sheet(self, as_of_date):
        """Generate Balance Sheet"""
        # Assets
        invoices = Invoice.objects.filter(
            company=self.company,
            invoice_date__lte=as_of_date
        )
        
        payments = Payment.objects.filter(
            company=self.company,
            payment_date__lte=as_of_date
        )
        
        # Current Assets
        accounts_receivable = invoices.aggregate(Sum('outstanding_amount'))['outstanding_amount__sum'] or 0
        cash_and_equivalents = payments.aggregate(Sum('amount'))['amount__sum'] or 0
        
        # Estimate inventory (for product companies)
        products = Product.objects.filter(
            company=self.company,
            product_type='product'
        )
        inventory_value = sum(
            float(p.current_stock * p.purchase_price) for p in products
        )
        
        total_current_assets = accounts_receivable + cash_and_equivalents + inventory_value
        
        # Fixed Assets (estimated)
        fixed_assets = total_current_assets * Decimal('0.3')  # 30% of current assets
        
        total_assets = total_current_assets + fixed_assets
        
        # Liabilities
        # Current Liabilities (estimated)
        accounts_payable = total_current_assets * Decimal('0.2')  # 20% of current assets
        tax_payable = invoices.aggregate(Sum('total_tax'))['total_tax__sum'] or 0
        tax_payable = tax_payable * Decimal('0.1')  # 10% pending
        
        total_current_liabilities = accounts_payable + tax_payable
        
        # Long-term Liabilities (estimated)
        long_term_debt = total_assets * Decimal('0.15')  # 15% of assets
        
        total_liabilities = total_current_liabilities + long_term_debt
        
        # Equity
        total_equity = total_assets - total_liabilities
        
        return {
            'as_of_date': as_of_date.strftime('%Y-%m-%d'),
            'assets': {
                'current_assets': {
                    'cash_and_equivalents': float(cash_and_equivalents),
                    'accounts_receivable': float(accounts_receivable),
                    'inventory': float(inventory_value),
                    'total_current_assets': float(total_current_assets)
                },
                'fixed_assets': {
                    'property_plant_equipment': float(fixed_assets),
                    'total_fixed_assets': float(fixed_assets)
                },
                'total_assets': float(total_assets)
            },
            'liabilities': {
                'current_liabilities': {
                    'accounts_payable': float(accounts_payable),
                    'tax_payable': float(tax_payable),
                    'total_current_liabilities': float(total_current_liabilities)
                },
                'long_term_liabilities': {
                    'long_term_debt': float(long_term_debt),
                    'total_long_term_liabilities': float(long_term_debt)
                },
                'total_liabilities': float(total_liabilities)
            },
            'equity': {
                'retained_earnings': float(total_equity),
                'total_equity': float(total_equity)
            },
            'generated_at': timezone.now().isoformat()
        }
    
    def generate_cash_flow_statement(self, start_date, end_date):
        """Generate Cash Flow Statement"""
        invoices = Invoice.objects.filter(
            company=self.company,
            invoice_date__range=[start_date, end_date]
        )
        
        payments = Payment.objects.filter(
            company=self.company,
            payment_date__range=[start_date, end_date]
        )
        
        # Operating Activities
        cash_from_customers = payments.aggregate(Sum('amount'))['amount__sum'] or 0
        cash_to_suppliers = cash_from_customers * Decimal('0.6')  # Estimated
        cash_for_expenses = cash_from_customers * Decimal('0.25')  # Estimated
        tax_payments = payments.aggregate(Sum('tds_amount'))['tds_amount__sum'] or 0
        
        net_cash_from_operations = cash_from_customers - cash_to_suppliers - cash_for_expenses - tax_payments
        
        # Investing Activities (estimated)
        capital_expenditure = net_cash_from_operations * Decimal('0.1')  # 10% reinvestment
        net_cash_from_investing = -capital_expenditure
        
        # Financing Activities (estimated)
        debt_proceeds = 0
        debt_payments = net_cash_from_operations * Decimal('0.05')  # 5% debt service
        net_cash_from_financing = debt_proceeds - debt_payments
        
        # Net Change in Cash
        net_change_in_cash = net_cash_from_operations + net_cash_from_investing + net_cash_from_financing
        
        return {
            'period': {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d')
            },
            'operating_activities': {
                'cash_received_from_customers': float(cash_from_customers),
                'cash_paid_to_suppliers': float(-cash_to_suppliers),
                'cash_paid_for_expenses': float(-cash_for_expenses),
                'tax_payments': float(-tax_payments),
                'net_cash_from_operations': float(net_cash_from_operations)
            },
            'investing_activities': {
                'capital_expenditure': float(-capital_expenditure),
                'net_cash_from_investing': float(net_cash_from_investing)
            },
            'financing_activities': {
                'debt_proceeds': float(debt_proceeds),
                'debt_payments': float(-debt_payments),
                'net_cash_from_financing': float(net_cash_from_financing)
            },
            'summary': {
                'net_change_in_cash': float(net_change_in_cash),
                'beginning_cash_balance': float(cash_from_customers * Decimal('0.1')),  # Estimated
                'ending_cash_balance': float(cash_from_customers * Decimal('0.1') + net_change_in_cash)
            },
            'generated_at': timezone.now().isoformat()
        }