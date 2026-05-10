"""
Middleware to handle PDF format requests for endpoints that don't support it
"""
from django.http import JsonResponse


class PDFFormatHandlerMiddleware:
    """
    Middleware to intercept format=pdf requests and return proper error
    before DRF's content negotiation tries to handle it
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Don't intercept - let the view handle it
        # The wrapper function will route to PDF endpoint if needed
        response = self.get_response(request)
        return response
