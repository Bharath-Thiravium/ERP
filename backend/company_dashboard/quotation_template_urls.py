from django.urls import path
from .quotation_template_views import (
    QuotationTemplateSettingsView,
    QuotationTemplatePreviewView,
    TemplateInfoView
)

urlpatterns = [
    # Quotation template settings
    path('quotation-templates/', QuotationTemplateSettingsView.as_view(), name='quotation_template_settings'),
    path('quotation-templates/preview/<str:template_name>/', QuotationTemplatePreviewView.as_view(), name='quotation_template_preview'),
    path('quotation-templates/info/', TemplateInfoView.as_view(), name='quotation_template_info'),
]