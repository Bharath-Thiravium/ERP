# Orchestrator Agent - Code Testing & Error Learning System

## Overview
The Orchestrator Agent monitors your complete workflow, tracks errors, learns from fixes, and suggests working solutions for recurring issues.

## Features
- **Auto Error Capture**: Middleware automatically captures all errors
- **Fix Learning**: Records all fix attempts and marks working solutions
- **Amazon Q Integration**: Logs all Q interactions linked to errors
- **Workflow Monitoring**: Tracks complete request/response cycles
- **Confidence Scoring**: Ranks fixes by success rate

## Installation

1. Add to INSTALLED_APPS in settings.py:
```python
INSTALLED_APPS = [
    ...
    'orchestrator',
]
```

2. Add middleware in settings.py:
```python
MIDDLEWARE = [
    ...
    'orchestrator.middleware.OrchestratorMiddleware',
]
```

3. Include URLs in main urls.py:
```python
urlpatterns = [
    ...
    path('api/', include('orchestrator.urls')),
]
```

4. Run migrations:
```bash
python manage.py makemigrations orchestrator
python manage.py migrate orchestrator
```

## Usage

### In Code (Manual)
```python
from orchestrator import OrchestratorAgent

agent = OrchestratorAgent()

# Start workflow
workflow = agent.start_workflow('data_import', {'file': 'data.csv'})

try:
    # Your code
    process_data()
except Exception as e:
    # Capture error
    error_pattern = agent.capture_error(e, __file__, sys.exc_info()[2].tb_lineno)
    
    # Check for known fix
    best_fix = agent.get_best_fix(error_pattern)
    if best_fix:
        print(f"Suggested fix: {best_fix.method_description}")
        # Apply fix
        apply_fix(best_fix.code_changes)
        agent.mark_fix_success(best_fix)
    else:
        # Try new fix
        fix = agent.record_fix_attempt(
            error_pattern,
            "Added null check before processing",
            {"file": "processor.py", "changes": "if data is not None:"}
        )
        # Test and mark
        agent.mark_fix_success(fix)

agent.complete_workflow('completed')
```

### API Endpoints

**Error Dashboard**
```bash
GET /api/orchestrator/error_dashboard/
```

**Error Details**
```bash
GET /api/orchestrator/error_detail/?hash=<error_hash>
```

**Record Fix**
```bash
POST /api/orchestrator/record_fix/
{
  "error_hash": "abc123...",
  "method_description": "Fixed by adding validation",
  "code_changes": {"file": "views.py", "line": 45}
}
```

**Mark Fix Status**
```bash
POST /api/orchestrator/mark_fix_status/
{
  "fix_id": 1,
  "success": true
}
```

**Log Amazon Q Interaction**
```bash
POST /api/orchestrator/log_amazonq/
{
  "session_id": "session_123",
  "query": "How to fix ImportError?",
  "response": "Try installing package...",
  "error_hash": "abc123..."
}
```

**Learning Stats**
```bash
GET /api/orchestrator/learning_stats/
```

### CLI Commands

**Analyze Errors**
```bash
# Top 10 errors
python manage.py analyze_errors

# Top 20 errors
python manage.py analyze_errors --top 20

# Specific error
python manage.py analyze_errors --error-hash abc123...
```

## Workflow

1. **Error Occurs** → Auto-captured by middleware
2. **Check Knowledge Base** → Look for working fixes
3. **Apply Fix** → Use suggested solution
4. **Mark Result** → Success/failure updates confidence
5. **Learn** → System improves over time

## Integration with Amazon Q

Log all Q interactions:
```python
agent.log_amazonq_interaction(
    session_id="q_session_123",
    query="How to fix database connection?",
    response="Check your DATABASE_URL...",
    context={"module": "finance"},
    error_pattern=error_pattern
)
```

## Database Schema

- **ErrorPattern**: Unique errors with hash, type, message, location
- **FixMethod**: Fix attempts with success/failure tracking
- **WorkflowExecution**: Complete request/response cycles
- **WorkflowError**: Links errors to workflows
- **AmazonQHistory**: Q interactions linked to errors

## Benefits

- **Faster Debugging**: Instant access to working fixes
- **Knowledge Retention**: Never lose fix knowledge
- **Team Learning**: Share solutions across team
- **Reduced Downtime**: Quick resolution of recurring issues
- **AI Integration**: Amazon Q history for context
