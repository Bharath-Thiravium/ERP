from django.db import models
from django.contrib.postgres.fields import ArrayField
import json

class DocumentEmbedding(models.Model):
    table_name = models.CharField(max_length=100)
    column_name = models.CharField(max_length=100)
    content = models.TextField()
    embedding = ArrayField(models.FloatField(), size=384)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'document_embeddings'
        indexes = [
            models.Index(fields=['table_name']),
            models.Index(fields=['created_at']),
        ]

class QueryHistory(models.Model):
    question = models.TextField()
    sql_generated = models.TextField()
    results_count = models.IntegerField(default=0)
    execution_time = models.FloatField()
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ai_query_history'