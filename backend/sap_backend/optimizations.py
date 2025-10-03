"""
Query optimization utilities for better performance
"""
from django.db import models

class OptimizedQueryMixin:
    """
    Mixin to add common query optimizations
    """
    
    @classmethod
    def get_optimized_queryset(cls):
        """
        Returns an optimized queryset with select_related and prefetch_related
        """
        queryset = cls.objects.all()
        
        # Add select_related for ForeignKey fields
        select_fields = []
        prefetch_fields = []
        
        for field in cls._meta.get_fields():
            if isinstance(field, models.ForeignKey):
                select_fields.append(field.name)
            elif isinstance(field, (models.ManyToManyField, models.OneToManyRel)):
                prefetch_fields.append(field.name)
        
        if select_fields:
            queryset = queryset.select_related(*select_fields[:5])  # Limit to avoid over-optimization
        
        if prefetch_fields:
            queryset = queryset.prefetch_related(*prefetch_fields[:3])  # Limit to avoid over-optimization
            
        return queryset

def optimize_queryset_for_list_view(queryset, model_class):
    """
    Generic function to optimize querysets for list views
    """
    # Common optimizations for list views
    if hasattr(model_class, 'company'):
        queryset = queryset.select_related('company')
    
    if hasattr(model_class, 'created_by'):
        queryset = queryset.select_related('created_by')
        
    return queryset