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
            return {
                'type': 'error',
                'message': 'No results found in database',
                'suggestion': 'Try asking about: employees, products, customers, orders',
                'error': escape(str(e))
            }
    
    def find_relevant_tables(self, question: str) -> List[tuple]:
        """Find relevant tables using similarity search"""
        question_embedding = self.rag.model.encode(question).tolist()
        
        from .models import DocumentEmbedding
        
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
        
        return unique_tables[:10]
    
    def generate_sql(self, question: str, relevant_tables: List[tuple]) -> str:
        """Generate SQL from natural language"""
        question_lower = question.lower()
        main_table = relevant_tables[0][0] if relevant_tables else 'employees'
        
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