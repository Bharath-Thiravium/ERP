from django.urls import path
from . import views

urlpatterns = [
    path('webhook/', views.WebhookView.as_view(), name='deployment_webhook'),
    path('status/<int:deployment_id>/', views.deployment_status, name='deployment_status'),
    path('history/', views.deployment_history, name='deployment_history'),
]