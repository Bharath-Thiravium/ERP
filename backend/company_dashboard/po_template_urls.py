from django.urls import path
from .po_template_views import POTemplateSettingsView, POTemplatePreviewView

urlpatterns = [
    path('po-template-settings/', POTemplateSettingsView.as_view(), name='po_template_settings'),
    path('po-template-preview/<str:template_name>/', POTemplatePreviewView.as_view(), name='po_template_preview'),
]