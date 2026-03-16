from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrchestratorViewSet

router = DefaultRouter()
router.register(r'orchestrator', OrchestratorViewSet, basename='orchestrator')

urlpatterns = [
    path('', include(router.urls)),
]
