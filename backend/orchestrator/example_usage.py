#!/usr/bin/env python
"""
Example: Using Orchestrator Agent in your code
"""
import sys
from orchestrator import OrchestratorAgent

def example_workflow():
    agent = OrchestratorAgent()
    
    # Start tracking workflow
    workflow = agent.start_workflow(
        workflow_name='invoice_generation',
        context={'invoice_id': 'INV-001', 'company': 'ACME Corp'}
    )
    
    try:
        # Your business logic
        result = generate_invoice('INV-001')
        agent.complete_workflow('completed')
        return result
        
    except Exception as e:
        # Capture error
        error_pattern = agent.capture_error(
            e, 
            file_path=__file__,
            line_number=sys.exc_info()[2].tb_lineno
        )
        
        # Check for known fix
        best_fix = agent.get_best_fix(error_pattern)
        
        if best_fix:
            print(f"Known fix found (confidence: {best_fix.confidence_score}%)")
            print(f"Solution: {best_fix.method_description}")
            # Apply the fix
            apply_fix(best_fix.code_changes)
            agent.mark_fix_success(best_fix)
        else:
            print("New error - recording fix attempt")
            # Try a fix
            fix = agent.record_fix_attempt(
                error_pattern,
                method_description="Added validation for invoice data",
                code_changes={
                    "file": "invoice.py",
                    "line": 45,
                    "change": "if invoice_data: process(invoice_data)"
                }
            )
            # Test and mark result
            if test_fix():
                agent.mark_fix_success(fix)
            else:
                agent.mark_fix_failure(fix)
        
        agent.complete_workflow('failed')
        raise

def generate_invoice(invoice_id):
    # Your logic
    pass

def apply_fix(code_changes):
    # Apply the fix
    pass

def test_fix():
    # Test if fix works
    return True

if __name__ == '__main__':
    example_workflow()
