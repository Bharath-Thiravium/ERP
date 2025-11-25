from django.urls import path
from .proforma_template_views import ProformaTemplateSettingsView, ProformaTemplatePreviewView

urlpatterns = [
    path('proforma-template-settings/', ProformaTemplateSettingsView.as_view(), name='proforma_template_settings'),
    path('proforma-template-preview/<str:template_name>/', ProformaTemplatePreviewView.as_view(), name='proforma_template_preview'),
]