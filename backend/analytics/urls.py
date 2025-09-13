from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Create router for ViewSets
router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
    # Add analytics endpoints here later
]
