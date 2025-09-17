from django.contrib import admin
from .models import DeploymentLog

@admin.register(DeploymentLog)
class DeploymentLogAdmin(admin.ModelAdmin):
    list_display = ['webhook_id', 'repository', 'branch', 'commit_hash_short', 'status', 'author', 'started_at']
    list_filter = ['status', 'branch', 'repository', 'started_at']
    search_fields = ['commit_hash', 'commit_message', 'author']
    readonly_fields = ['webhook_id', 'started_at', 'completed_at']
    
    def commit_hash_short(self, obj):
        return obj.commit_hash[:8] if obj.commit_hash else ''
    commit_hash_short.short_description = 'Commit'