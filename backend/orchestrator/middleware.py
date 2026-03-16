import sys
from django.utils.deprecation import MiddlewareMixin
from .agent import OrchestratorAgent

class OrchestratorMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.orchestrator = OrchestratorAgent()
        request.orchestrator.start_workflow(
            workflow_name=f"{request.method}_{request.path}",
            context={'user': str(request.user), 'method': request.method, 'path': request.path}
        )
    
    def process_response(self, request, response):
        if hasattr(request, 'orchestrator'):
            request.orchestrator.complete_workflow('completed')
        return response
    
    def process_exception(self, request, exception):
        if hasattr(request, 'orchestrator'):
            frame = sys.exc_info()[2].tb_frame
            error_pattern = request.orchestrator.capture_error(
                exception,
                file_path=frame.f_code.co_filename,
                line_number=frame.f_lineno
            )
            best_fix = request.orchestrator.get_best_fix(error_pattern)
            if best_fix:
                request.orchestrator_suggested_fix = best_fix
        return None
