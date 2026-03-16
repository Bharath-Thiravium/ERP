import uuid

from django.utils.deprecation import MiddlewareMixin


class CorrelationIdMiddleware(MiddlewareMixin):
    """Attach a correlation ID to each request/response for traceability."""

    request_header = "HTTP_X_REQUEST_ID"
    response_header = "X-Request-ID"

    def process_request(self, request):
        request_id = request.META.get(self.request_header)
        if not request_id:
            request_id = uuid.uuid4().hex
        request.correlation_id = request_id

    def process_response(self, request, response):
        request_id = getattr(request, "correlation_id", None)
        if request_id:
            response[self.response_header] = request_id
        return response
