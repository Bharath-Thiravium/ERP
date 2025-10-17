import psycopg2
from sentence_transformers import SentenceTransformer
import numpy as np
from django.conf import settings
from django.db import connection
import re
import json
from typing import List, Dict, Any

class PostgresRAG:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
    def embed_schema(self):
        """Embed all table schemas"""
        with connection.cursor() as cursor:
            # Get all tables and columns
            cursor.execute("""
                SELECT t.table_name, c.column_name, c.data_type, c.is_nullable
                FROM information_schema.tables t
                JOIN information_schema.columns c ON t.table_name = c.table_name
                WHERE t.table_schema = 'public' 
                AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_name, c.ordinal_position
            """)
            
            from .models import DocumentEmbedding
            DocumentEmbedding.objects.all().delete()  # Clear existing
            
            for table, column, dtype, nullable in cursor.fetchall():
                # Create description
                desc = f"Table {table} column {column} type {dtype}"
                embedding = self.model.encode(desc).tolist()
                
                DocumentEmbedding.objects.create(
                    table_name=table,
                    column_name=column,
                    content=desc,
                    embedding=embedding,
                    metadata={
                        'type': 'schema',
                        'data_type': dtype,
                        'nullable': nullable
                    }
                )

class NLQueryProcessor:
    def __init__(self):
        self.rag = PostgresRAG()
        
    def process_query(self, user_question: str) -> Dict[str, Any]:
        try:
            # Find relevant tables
            relevant_tables = self.find_relevant_tables(user_question)
            
            if len(relevant_tables) > 5:
                return {
                    'type': 'suggestion',
                    'tables': [t[0] for t in relevant_tables[:5]],
                    'message': 'Multiple tables found. Which data would you like to explore?'
                }
            
            # Generate SQL
            sql_query = self.generate_sql(user_question, relevant_tables)
            
            # Execute query
            results = self.execute_query(sql_query)
            
            return {
                'type': 'result',
                'data': results,
                'sql': sql_query,
                'count': len(results),
                'explanation': f"Found {len(results)} records"
            }
            
        except Exception as e:
            from html import escape
            error_msg = str(e)
            
            # Better error messages with comprehensive suggestions
            if 'does not exist' in error_msg:
                return {
                    'type': 'error',
                    'message': 'Table not found in database',
                    'suggestion': 'Try asking about: departments, employees, products, customers, invoices, suppliers, leads, contacts',
                    'available_queries': [
                        'list all departments',
                        'show me employees', 
                        'count products',
                        'recent customers',
                        'top invoices',
                        'all suppliers'
                    ],
                    'error': escape(error_msg)
                }
            else:
                return {
                    'type': 'error', 
                    'message': 'Query execution failed',
                    'suggestion': 'Try simpler queries like: "list departments", "show employees", "count products"',
                    'available_topics': ['HR', 'Finance', 'Inventory', 'CRM'],
                    'error': escape(error_msg)
                }
    
    def find_relevant_tables(self, question: str) -> List[tuple]:
        """Find relevant tables using similarity search"""
        from .models import DocumentEmbedding
        
        # Check if embeddings exist, if not return default tables
        if not DocumentEmbedding.objects.exists():
            # Return default relevant tables based on keywords
            question_lower = question.lower()
            
            keyword_tables = {
                'department': ('hr_department', 'name'),
                'employee': ('hr_employee', 'full_name'),
                'attendance': ('hr_attendance', 'date'),
                'payroll': ('hr_payrollcycle', 'cycle_name'),
                'salary': ('hr_employee', 'base_salary'),
                'leave': ('hr_leaveapplication', 'leave_type'),
                'product': ('inventory_product', 'name'),
                'category': ('inventory_category', 'name'),
                'supplier': ('inventory_supplier', 'name'),
                'warehouse': ('inventory_warehouse', 'name'),
                'stock': ('inventory_stocklevel', 'quantity_available'),
                'inventory': ('inventory_product', 'name'),
                'customer': ('finance_customer', 'name'),
                'invoice': ('finance_invoices', 'invoice_number'),
                'payment': ('finance_payments', 'amount'),
                'quotation': ('finance_quotations', 'quotation_number'),
                'purchase': ('finance_purchase_orders', 'po_number'),
                'lead': ('crm_lead', 'name'),
                'contact': ('crm_contact', 'name'),
                'deal': ('crm_deal', 'name'),
                'opportunity': ('crm_opportunity', 'name'),
                'campaign': ('crm_campaign', 'name')
            }
            
            for keyword, (table, column) in keyword_tables.items():
                if keyword in question_lower:
                    return [(table, column, 1.0)]
            
            return [('hr_department', 'name', 1.0)]
        
        question_embedding = self.rag.model.encode(question).tolist()
        
        # Simple similarity calculation (in production, use pgvector)
        embeddings = DocumentEmbedding.objects.all()
        similarities = []
        
        for emb in embeddings:
            # Cosine similarity
            dot_product = sum(a * b for a, b in zip(question_embedding, emb.embedding))
            norm_a = sum(a * a for a in question_embedding) ** 0.5
            norm_b = sum(b * b for b in emb.embedding) ** 0.5
            similarity = dot_product / (norm_a * norm_b) if norm_a * norm_b > 0 else 0
            
            if similarity > 0.3:
                similarities.append((emb.table_name, emb.column_name, similarity))
        
        # Sort by similarity and group by table
        similarities.sort(key=lambda x: x[2], reverse=True)
        unique_tables = []
        seen_tables = set()
        
        for table, column, sim in similarities:
            if table not in seen_tables:
                unique_tables.append((table, column, sim))
                seen_tables.add(table)
        
        return unique_tables[:10] if unique_tables else [('hr_department', 'name', 1.0)]
    
    def generate_sql(self, question: str, relevant_tables: List[tuple]) -> str:
        """Generate SQL from natural language"""
        question_lower = question.lower()
        
        # Smart table selection based on question keywords
        table_mapping = {
            # HR related
            'department': 'hr_department',
            'employee': 'hr_employee', 
            'attendance': 'hr_attendance',
            'payroll': 'hr_payrollcycle',
            'salary': 'hr_employee',
            'leave': 'hr_leaveapplication',
            'holiday': 'hr_holiday',
            
            # Finance related
            'customer': 'finance_customer',
            'invoice': 'finance_invoices',
            'payment': 'finance_payments',
            'quotation': 'finance_quotations',
            'purchase': 'finance_purchase_orders',
            
            # Inventory related
            'product': 'inventory_product',
            'category': 'inventory_category',
            'supplier': 'inventory_supplier',
            'warehouse': 'inventory_warehouse',
            'stock': 'inventory_stocklevel',
            'inventory': 'inventory_product',
            
            # CRM related
            'lead': 'crm_lead',
            'contact': 'crm_contact',
            'deal': 'crm_deal',
            'opportunity': 'crm_opportunity',
            'campaign': 'crm_campaign'
        }
        
        main_table = None
        for keyword, table in table_mapping.items():
            if keyword in question_lower:
                main_table = table
                break
        
        if not main_table:
            main_table = relevant_tables[0][0] if relevant_tables else 'hr_department'
        
        # Extract numbers for LIMIT
        numbers = re.findall(r'\d+', question)
        limit = numbers[0] if numbers else '10'
        
        # Intent detection
        if any(word in question_lower for word in ['count', 'how many', 'total']):
            return f"SELECT COUNT(*) as total FROM {main_table}"
        
        elif any(word in question_lower for word in ['top', 'best', 'highest', 'maximum']):
            # Try to find numeric column for ordering
            if 'salary' in question_lower:
                return f"SELECT * FROM {main_table} ORDER BY base_salary DESC LIMIT {limit}"
            elif 'price' in question_lower:
                return f"SELECT * FROM {main_table} ORDER BY selling_price DESC LIMIT {limit}"
            else:
                return f"SELECT * FROM {main_table} ORDER BY id DESC LIMIT {limit}"
        
        elif any(word in question_lower for word in ['recent', 'latest', 'new']):
            return f"SELECT * FROM {main_table} ORDER BY created_at DESC LIMIT {limit}"
        
        else:
            # Default select
            return f"SELECT * FROM {main_table} LIMIT {limit}"
    
    def execute_query(self, sql: str) -> List[Dict]:
        """Execute SQL and return results"""
        with connection.cursor() as cursor:
            cursor.execute(sql)
            columns = [col[0] for col in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            return results