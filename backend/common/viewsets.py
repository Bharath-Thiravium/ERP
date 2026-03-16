from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import PermissionDenied
from django.core.exceptions import FieldDoesNotExist
from django.conf import settings
from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated
from authentication.permissions import IsCompanyUser


class GlobalModelMixin:
    """
    Marker mixin for models that are truly global (not company-scoped).
    Use this for analytics, system config, or other global tables.
    """
    is_global_model = True


class CompanyScopedModelViewSet(viewsets.ModelViewSet):
    """
    Base viewset that enforces company-level tenant isolation for service users.
    
    Features:
    - Automatic company filtering in get_queryset()
    - Automatic company injection in perform_create()
    - Automatic created_by/updated_by tracking
    - Guardrails to prevent accidental data leakage
    """
    
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
    
    # Override these in subclasses if needed
    company_field_name = "company"
    created_by_field_name = "created_by"
    updated_by_field_name = "updated_by"
    
    def get_company(self):
        """Get the company from the authenticated service user."""
        return self.request.service_user.company
    
    def _model_has_field(self, model, field_name):
        """Check if model has a specific field."""
        try:
            model._meta.get_field(field_name)
            return True
        except FieldDoesNotExist:
            return False
    
    def get_queryset(self):
        """
        Filter queryset by company unless model is explicitly marked as global.
        """
        queryset = super().get_queryset()
        
        # Skip company filtering for global models
        if getattr(self, 'is_global_model', False):
            return queryset
            
        model = queryset.model
        company = self.get_company()
        
        # Check if model has company field
        if self._model_has_field(model, self.company_field_name):
            # Filter by company
            filter_kwargs = {self.company_field_name: company}
            return queryset.filter(**filter_kwargs)
        else:
            # Model doesn't have company field - this might be intentional for global models
            if settings.DEBUG:
                raise AssertionError(
                    f"Model {model.__name__} doesn't have '{self.company_field_name}' field. "
                    f"If this is intentional, set is_global_model = True on the viewset."
                )
            return queryset
    
    def perform_create(self, serializer):
        """
        Inject company and created_by fields if they exist on the model.
        Never accept company from request data to prevent cross-tenant access.
        """
        save_kwargs = {}
        company = self.get_company()
        service_user = self.request.service_user
        
        model = serializer.Meta.model
        
        # Inject company if field exists (don't mutate validated_data)
        if self._model_has_field(model, self.company_field_name):
            save_kwargs[self.company_field_name] = company
            
        # Inject created_by if field exists
        if self.created_by_field_name and self._model_has_field(model, self.created_by_field_name):
            save_kwargs[self.created_by_field_name] = service_user
        
        serializer.save(**save_kwargs)
    
    def perform_update(self, serializer):
        """
        Inject updated_by field if it exists on the model.
        Preserve company field (don't allow changes).
        """
        save_kwargs = {}
        service_user = self.request.service_user
        model = serializer.Meta.model
        
        # Ensure company cannot be changed - inject same company
        if self._model_has_field(model, self.company_field_name):
            save_kwargs[self.company_field_name] = self.get_company()
        
        # Inject updated_by if field exists
        if self.updated_by_field_name and self._model_has_field(model, self.updated_by_field_name):
            save_kwargs[self.updated_by_field_name] = service_user
        
        serializer.save(**save_kwargs)
    
    def get_object(self):
        """
        Override to ensure object belongs to the user's company.
        This provides an additional security layer.
        """
        obj = super().get_object()
        
        # Skip company check for global models
        if getattr(self, 'is_global_model', False):
            return obj
            
        # Verify object belongs to user's company
        if hasattr(obj, self.company_field_name):
            obj_company = getattr(obj, self.company_field_name)
            user_company = self.get_company()
            if obj_company != user_company:
                # Return 404 instead of 403 to avoid information disclosure
                from django.http import Http404
                raise Http404("Object not found")
        
        return obj


class CompanyUserScopedModelViewSet(viewsets.ModelViewSet):
    """
    Base viewset that enforces company-level tenant isolation for CompanyUser JWT auth.
    Mirrors CompanyScopedModelViewSet, but uses request.user.company_user.
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsCompanyUser]

    company_field_name = "company"
    created_by_field_name = "created_by"
    updated_by_field_name = "updated_by"

    def get_company(self):
        """Get the company from the authenticated company user."""
        return self.request.user.company_user.company

    def _model_has_field(self, model, field_name):
        try:
            model._meta.get_field(field_name)
            return True
        except FieldDoesNotExist:
            return False

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self, 'is_global_model', False):
            return queryset

        model = queryset.model
        company = self.get_company()
        if self._model_has_field(model, self.company_field_name):
            filter_kwargs = {self.company_field_name: company}
            return queryset.filter(**filter_kwargs)
        if settings.DEBUG:
            raise AssertionError(
                f"Model {model.__name__} doesn't have '{self.company_field_name}' field. "
                "If this is intentional, set is_global_model = True on the viewset."
            )
        return queryset

    def perform_create(self, serializer):
        save_kwargs = {}
        company = self.get_company()
        company_user = self.request.user.company_user
        model = serializer.Meta.model

        if self._model_has_field(model, self.company_field_name):
            save_kwargs[self.company_field_name] = company
        if self.created_by_field_name and self._model_has_field(model, self.created_by_field_name):
            save_kwargs[self.created_by_field_name] = company_user

        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        save_kwargs = {}
        company_user = self.request.user.company_user
        model = serializer.Meta.model

        if self._model_has_field(model, self.company_field_name):
            save_kwargs[self.company_field_name] = self.get_company()
        if self.updated_by_field_name and self._model_has_field(model, self.updated_by_field_name):
            save_kwargs[self.updated_by_field_name] = company_user

        serializer.save(**save_kwargs)

    def get_object(self):
        obj = super().get_object()
        if getattr(self, 'is_global_model', False):
            return obj
        if hasattr(obj, self.company_field_name):
            obj_company = getattr(obj, self.company_field_name)
            user_company = self.get_company()
            if obj_company != user_company:
                from django.http import Http404
                raise Http404("Object not found")
        return obj
