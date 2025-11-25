from django.urls import path
from .invoice_template_views import InvoiceTemplateSettingsView, InvoiceTemplatePreviewView

urlpatterns = [
    path('invoice-template-settings/', InvoiceTemplateSettingsView.as_view(), name='invoice_template_settings'),
    path('invoice-template-preview/<str:template_name>/', InvoiceTemplatePreviewView.as_view(), name='invoice_template_preview'),
]