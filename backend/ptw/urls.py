from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PermitToWorkViewSet

router = DefaultRouter()
router.register(r'permits', PermitToWorkViewSet, basename='ptw-permit')

urlpatterns = [
    path('', include(router.urls)),
]
