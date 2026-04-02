from django.urls import path
from .quotation_template_views import QuotationTemplateSettingsView, QuotationTemplatePreviewView, TemplateInfoView

urlpatterns = [
    path('quotation-template-settings/', QuotationTemplateSettingsView.as_view(), name='quotation_template_settings'),
    path('quotation-template-preview/<str:template_name>/', QuotationTemplatePreviewView.as_view(), name='quotation_template_preview'),
    path('template-info/', TemplateInfoView.as_view(), name='template_info'),
]
