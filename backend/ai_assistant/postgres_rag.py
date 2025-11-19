from django.db import connection
import re
import json
from typing import List, Dict, Any
from datetime import datetime

class PostgresRAG:
    def __init__(self):
        # Comprehensive table mapping with all available tables
        self.table_keywords = {
            # HR Module
            'employee': 'hr_employee', 'employees': 'hr_employee', 'staff': 'hr_employee',
            'department': 'hr_department', 'departments': 'hr_department', 'dept': 'hr_department',
            'attendance': 'hr_attendance', 'present': 'hr_attendance', 'absent': 'hr_attendance',
            'leave': 'hr_leaveapplication', 'leaves': 'hr_leaveapplication', 'vacation': 'hr_leaveapplication',
            'payroll': 'hr_payrollcycle', 'salary': 'hr_employee', 'salaries': 'hr_employee',
            'holiday': 'hr_holiday', 'holidays': 'hr_holiday',
            'designation': 'hr_designation', 'position': 'hr_designation', 'role': 'hr_designation',
            'interview': 'hr_interview', 'interviews': 'hr_interview',
            'job': 'hr_jobposting', 'jobs': 'hr_jobposting', 'posting': 'hr_jobposting',
            'application': 'hr_jobapplication', 'applications': 'hr_jobapplication',
            'performance': 'hr_performancereview', 'review': 'hr_performancereview',
            
            # Finance Module
            'customer': 'finance_customer', 'customers': 'finance_customer', 'client': 'finance_customer',
            'invoice': 'finance_invoices', 'invoices': 'finance_invoices', 'bill': 'finance_invoices',
            'payment': 'finance_payments', 'payments': 'finance_payments', 'transaction': 'finance_payments',
            'quotation': 'finance_quotations', 'quotations': 'finance_quotations', 'quote': 'finance_quotations',
            'purchase': 'finance_purchase_orders', 'po': 'finance_purchase_orders', 'order': 'finance_purchase_orders',
            'vendor': 'finance_vendors', 'vendors': 'finance_vendors', 'supplier': 'finance_vendors',
            'bank': 'finance_bankaccount', 'account': 'finance_bankaccount',
            'product': 'finance_products', 'products': 'finance_products', 'item': 'finance_products',
            
            # Inventory Module
            'inventory': 'inventory_product', 'stock': 'inventory_stocklevel', 'warehouse': 'inventory_warehouse',
            'category': 'inventory_category', 'categories': 'inventory_category',
            'movement': 'inventory_stockmovement', 'audit': 'inventory_inventoryaudit',
            'bundle': 'inventory_productbundle', 'variant': 'inventory_productvariant',
            'alert': 'inventory_stockalert', 'alerts': 'inventory_stockalert',
            
            # CRM Module
            'lead': 'crm_lead', 'leads': 'crm_lead', 'prospect': 'crm_lead',
            'contact': 'crm_contact', 'contacts': 'crm_contact',
            'deal': 'crm_deal', 'deals': 'crm_deal', 'opportunity': 'crm_opportunity',
            'campaign': 'crm_campaign', 'campaigns': 'crm_campaign', 'marketing': 'crm_campaign',
            'account': 'crm_account', 'accounts': 'crm_account',
            'activity': 'crm_activity', 'activities': 'crm_activity',
            'ticket': 'crm_ticket', 'tickets': 'crm_ticket', 'support': 'crm_ticket',
            
            # Authentication & Company
            'company': 'authentication_company', 'companies': 'authentication_company',
            'service': 'authentication_service', 'services': 'authentication_service',
            'user': 'authentication_companyuser', 'users': 'authentication_companyuser',
            'admin': 'authentication_masteradmin', 'security': 'company_security_logs',
            
            # Analytics & System
            'analytics': 'analytics_systemmetrics', 'metrics': 'analytics_systemmetrics',
            'alert': 'analytics_systemalert', 'notification': 'notifications_notification'
        }

class NLQueryProcessor:
    def __init__(self):
        self.rag = PostgresRAG()
        
    def process_query(self, user_question: str) -> Dict[str, Any]:
        try:
            # Clean and analyze question
            question_lower = user_question.lower().strip()
            
            # Find relevant table
            table_name = self.find_relevant_table(question_lower)
            
            if not table_name:
                return self.get_help_response()
            
            # Generate and execute SQL
            sql_query = self.generate_sql(question_lower, table_name)
            results = self.execute_query(sql_query)
            
            # Generate natural language response
            response = self.generate_natural_response(question_lower, results, table_name)
            
            return {
                'type': 'success',
                'message': response,
                'data': results[:10] if len(results) > 10 else results,
                'total_count': len(results),
                'sql': sql_query,
                'table': table_name
            }
            
        except Exception as e:
            error_msg = str(e)
            print(f"Query processing error: {error_msg}")
            
            if 'does not exist' in error_msg or 'relation' in error_msg:
                return {
                    'type': 'error',
                    'message': 'The requested data table was not found in the database.',
                    'suggestion': 'Try asking about: employees, departments, customers, invoices, products, leads, or campaigns',
                    'examples': [
                        'Show me all employees',
                        'List departments', 
                        'Count customers',
                        'Recent invoices',
                        'Top products'
                    ]
                }
            else:
                return {
                    'type': 'error',
                    'message': 'Unable to process your query at the moment.',
                    'suggestion': 'Please try a simpler question or contact support if the issue persists.',
                    'error_details': error_msg
                }
    
    def find_relevant_table(self, question: str) -> str:
        """Find the most relevant table based on keywords"""
        # Check each keyword in the question
        for keyword, table in self.rag.table_keywords.items():
            if keyword in question:
                return table
        
        # Default fallback
        return 'hr_department'
    
    def get_help_response(self) -> Dict[str, Any]:
        """Return help response when no table is found"""
        return {
            'type': 'help',
            'message': 'I can help you query your business data. Here are some examples:',
            'examples': {
                'HR': ['Show me all employees', 'List departments', 'Count attendance today'],
                'Finance': ['Show recent invoices', 'List customers', 'Count payments this month'],
                'Inventory': ['Show all products', 'Check stock levels', 'List suppliers'],
                'CRM': ['Show leads', 'List contacts', 'Recent deals']
            },
            'suggestion': 'Try asking about employees, customers, products, or any business data you need.'
        }
    
    def generate_sql(self, question: str, table_name: str) -> str:
        """Generate SQL from natural language"""
        # Extract numbers for LIMIT
        numbers = re.findall(r'\d+', question)
        limit = numbers[0] if numbers else '10'
        
        # Intent detection
        if any(word in question for word in ['count', 'how many', 'total', 'number']):
            return f"SELECT COUNT(*) as total_count FROM {table_name}"
        
        elif any(word in question for word in ['top', 'best', 'highest', 'maximum']):
            # Try to find appropriate ordering column
            if 'salary' in question:
                return f"SELECT * FROM {table_name} ORDER BY base_salary DESC LIMIT {limit}"
            elif 'price' in question or 'amount' in question:
                return f"SELECT * FROM {table_name} ORDER BY amount DESC LIMIT {limit}"
            elif 'recent' in question or 'latest' in question:
                return f"SELECT * FROM {table_name} ORDER BY created_at DESC LIMIT {limit}"
            else:
                return f"SELECT * FROM {table_name} ORDER BY id DESC LIMIT {limit}"
        
        elif any(word in question for word in ['recent', 'latest', 'new', 'last']):
            return f"SELECT * FROM {table_name} ORDER BY created_at DESC LIMIT {limit}"
        
        elif 'today' in question:
            return f"SELECT * FROM {table_name} WHERE DATE(created_at) = CURRENT_DATE LIMIT {limit}"
        
        elif 'this month' in question:
            return f"SELECT * FROM {table_name} WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) LIMIT {limit}"
        
        else:
            # Default select with reasonable limit
            return f"SELECT * FROM {table_name} LIMIT {limit}"
    
    def generate_natural_response(self, question: str, results: List[Dict], table_name: str) -> str:
        """Generate natural language response from query results"""
        if not results:
            return f"No data found in the {table_name.replace('_', ' ')} table. The table appears to be empty."
        
        count = len(results)
        table_display = table_name.replace('_', ' ').title()
        
        # Count queries
        if 'count' in question or 'how many' in question or 'total' in question:
            if 'total_count' in results[0]:
                total = results[0]['total_count']
                if total == 0:
                    return f"There are currently no records in the {table_display} table."
                else:
                    return f"Found {total} records in the {table_display} table."
        
        # Regular data queries
        if count == 1:
            response = f"Found 1 record in {table_display}:"
        else:
            response = f"Found {count} records in {table_display}:"
        
        # Add context based on question intent
        if 'recent' in question or 'latest' in question:
            response += f" Here are the most recent entries:"
        elif 'top' in question or 'best' in question:
            response += f" Here are the top results:"
        elif 'today' in question:
            response += f" Here are today's entries:"
        elif 'this month' in question:
            response += f" Here are this month's entries:"
        
        return response
    
    def execute_query(self, sql: str) -> List[Dict]:
        """Execute SQL and return results"""
        try:
            with connection.cursor() as cursor:
                cursor.execute(sql)
                columns = [col[0] for col in cursor.description]
                results = []
                
                for row in cursor.fetchall():
                    # Convert datetime objects to strings for JSON serialization
                    row_dict = {}
                    for i, value in enumerate(row):
                        if hasattr(value, 'isoformat'):  # datetime objects
                            row_dict[columns[i]] = value.isoformat()
                        else:
                            row_dict[columns[i]] = value
                    results.append(row_dict)
                
                return results
        except Exception as e:
            print(f"SQL execution error: {e}")
            raise e
