#!/usr/bin/env python
import os
import sys
import django

sys.path.insert(0, '/var/www/SAP-Python/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
os.environ['DEBUG'] = 'False'
django.setup()

from orchestrator.agent import OrchestratorAgent
from orchestrator.models import ErrorPattern, FixMethod

print("Testing Orchestrator Agent...")
print("-" * 50)

agent = OrchestratorAgent()

# Test workflow
workflow = agent.start_workflow('test_workflow', {'test': 'data'})
print(f"✓ Workflow started: {workflow.workflow_id}")

# Test error capture
try:
    raise ValueError("Test error for orchestrator")
except Exception as e:
    error = agent.capture_error(e, __file__, 20)
    print(f"✓ Error captured: {error.error_type}")

# Test fix recording
fix = agent.record_fix_attempt(
    error,
    "Added validation check",
    {"file": "test.py", "line": 10}
)
print(f"✓ Fix recorded: {fix.id}")

# Test marking success
agent.mark_fix_success(fix)
print(f"✓ Fix marked as working (confidence: {fix.confidence_score}%)")

# Test getting best fix
best = agent.get_best_fix(error)
print(f"✓ Best fix retrieved: {best.method_description}")

# Complete workflow
agent.complete_workflow('completed')
print(f"✓ Workflow completed")

print("-" * 50)
print(f"Total errors tracked: {ErrorPattern.objects.count()}")
print(f"Total fixes recorded: {FixMethod.objects.count()}")
print("\n✅ Orchestrator Agent is working correctly!")
