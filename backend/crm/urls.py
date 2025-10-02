from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LeadViewSet, ContactViewSet, AccountViewSet, OpportunityViewSet,
    ActivityViewSet, CampaignViewSet, SalesTargetViewSet, DashboardViewSet
)

router = DefaultRouter()
router.register(r'leads', LeadViewSet)
router.register(r'contacts', ContactViewSet)
router.register(r'accounts', AccountViewSet)
router.register(r'opportunities', OpportunityViewSet)
router.register(r'activities', ActivityViewSet)
router.register(r'campaigns', CampaignViewSet)
router.register(r'sales-targets', SalesTargetViewSet)
router.register(r'dashboard', DashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
]