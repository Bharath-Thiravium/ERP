from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import time
from .postgres_rag import NLQueryProcessor
from .models import QueryHistory

@csrf_exempt
@require_http_methods(["POST"])
def ai_query(request):
    """Process natural language queries"""
    try:
        data = json.loads(request.body)
        question = data.get('question', '').strip()
        
        if not question:
            return JsonResponse({
                'type': 'error',
                'message': 'Please ask a question about your data.',
                'suggestion': 'Try asking: "Show me employees" or "Count customers"'
            })
        
        # Process query
        start_time = time.time()
        processor = NLQueryProcessor()
        result = processor.process_query(question)
        execution_time = time.time() - start_time
        
        # Log query
        try:
            QueryHistory.objects.create(
                question=question,
                sql_generated=result.get('sql', ''),
                results_count=result.get('total_count', 0),
                execution_time=execution_time,
                success=result['type'] == 'success',
                error_message=result.get('error_details', '')
            )
        except Exception as log_error:
            print(f"Failed to log query: {log_error}")
        
        # Ensure proper response format
        response_data = {
            'type': result.get('type', 'error'),
            'message': result.get('message', 'No response generated'),
            'data': result.get('data', []),
            'total_count': result.get('total_count', 0),
            'sql': result.get('sql', ''),
            'table': result.get('table', ''),
            'suggestion': result.get('suggestion', ''),
            'examples': result.get('examples', []),
            'error_details': result.get('error_details', '')
        }
        
        return JsonResponse(response_data)
        
    except Exception as e:
        print(f"AI Query API Error: {str(e)}")
        return JsonResponse({
            'type': 'error',
            'message': 'Unable to process your request at the moment.',
            'suggestion': 'Please try a simpler question or refresh the page.',
            'error_details': str(e)
        })

@csrf_exempt
@require_http_methods(["POST"])
def initialize_embeddings(request):
    """Initialize database schema embeddings"""
    try:
        from .postgres_rag import PostgresRAG
        rag = PostgresRAG()
        rag.embed_schema()
        
        return JsonResponse({
            'success': True,
            'message': 'Schema embeddings initialized successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@require_http_methods(["GET"])
def query_history(request):
    """Get recent query history"""
    try:
        history = QueryHistory.objects.order_by('-created_at')[:20]
        
        data = [{
            'question': q.question,
            'sql': q.sql_generated,
            'success': q.success,
            'results_count': q.results_count,
            'execution_time': round(q.execution_time, 3),
            'created_at': q.created_at.isoformat()
        } for q in history]
        
        return JsonResponse({'history': data})
        
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        })

@csrf_exempt
@require_http_methods(["POST"])
def export_query_data(request):
    """Export full query results for download"""
    try:
        data = json.loads(request.body)
        sql = data.get('sql', '').strip()
        
        if not sql:
            return JsonResponse({
                'error': 'SQL query is required'
            })
        
        # Execute query and get all results
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(sql)
            columns = [col[0] for col in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                row_dict = {}
                for i, value in enumerate(row):
                    if hasattr(value, 'isoformat'):
                        row_dict[columns[i]] = value.isoformat()
                    else:
                        row_dict[columns[i]] = value
                results.append(row_dict)
        
        return JsonResponse({
            'data': results,
            'columns': columns,
            'count': len(results)
        })
        
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        })

@require_http_methods(["GET"])
def available_tables(request):
    """Get list of available tables"""
    try:
        from django.db import connection
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name, 
                       COUNT(column_name) as column_count
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name NOT LIKE 'django_%'
                AND table_name NOT LIKE 'auth_%'
                GROUP BY table_name
                ORDER BY table_name
            """)
            
            tables = [{
                'name': row[0],
                'columns': row[1]
            } for row in cursor.fetchall()]
        
        return JsonResponse({'tables': tables})
        
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        })