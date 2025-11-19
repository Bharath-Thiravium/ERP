from django.urls import path
from . import views

app_name = 'ai_assistant'

urlpatterns = [
    path('query/', views.ai_query, name='ai_query'),
    path('export/', views.export_query_data, name='export_query_data'),
    path('initialize/', views.initialize_embeddings, name='initialize_embeddings'),
    path('history/', views.query_history, name='query_history'),
    path('tables/', views.available_tables, name='available_tables'),
]