from django.urls import path
from .geolocation_views import GeolocationRulesView, get_countries_list, test_ip_location

urlpatterns = [
    path('rules/', GeolocationRulesView.as_view(), name='geolocation_rules'),
    path('rules/<int:rule_id>/', GeolocationRulesView.as_view(), name='geolocation_rule_detail'),
    path('countries/', get_countries_list, name='countries_list'),
    path('test-ip/', test_ip_location, name='test_ip_location'),
]