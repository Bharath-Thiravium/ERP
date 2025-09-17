import json
import hmac
import hashlib
import subprocess
import threading
from datetime import datetime
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from .models import DeploymentLog
import logging

logger = logging.getLogger(__name__)

class WebhookView(View):
    
    def verify_signature(self, payload, signature):
        """Verify GitHub webhook signature"""
        secret = getattr(settings, 'WEBHOOK_SECRET', 'your-webhook-secret')
        expected_signature = 'sha256=' + hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_signature, signature)
    
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        try:
            # Verify signature
            signature = request.META.get('HTTP_X_HUB_SIGNATURE_256', '')
            if not self.verify_signature(request.body, signature):
                return JsonResponse({'error': 'Invalid signature'}, status=403)
            
            # Parse payload
            payload = json.loads(request.body)
            
            # Only process push events to main/master branch
            if payload.get('ref') not in ['refs/heads/main', 'refs/heads/master']:
                return JsonResponse({'message': 'Ignored: Not main/master branch'})
            
            # Extract commit info
            commit_info = {
                'webhook_id': payload.get('after', ''),
                'repository': payload.get('repository', {}).get('full_name', ''),
                'branch': payload.get('ref', '').split('/')[-1],
                'commit_hash': payload.get('after', ''),
                'commit_message': payload.get('head_commit', {}).get('message', ''),
                'author': payload.get('head_commit', {}).get('author', {}).get('name', ''),
            }
            
            # Create deployment log
            deployment = DeploymentLog.objects.create(**commit_info)
            
            # Start deployment in background
            thread = threading.Thread(
                target=self.deploy_application,
                args=(deployment.id,)
            )
            thread.daemon = True
            thread.start()
            
            return JsonResponse({
                'message': 'Deployment started',
                'deployment_id': deployment.id,
                'commit': commit_info['commit_hash'][:8]
            })
            
        except Exception as e:
            logger.error(f"Webhook error: {str(e)}")
            return JsonResponse({'error': str(e)}, status=500)
    
    def deploy_application(self, deployment_id):
        """Execute deployment steps"""
        deployment = DeploymentLog.objects.get(id=deployment_id)
        deployment.status = 'running'
        deployment.save()
        
        logs = []
        
        try:
            # Step 1: Git pull
            logs.append("=== Starting Git Pull ===")
            result = subprocess.run(['git', 'pull', 'origin', 'main'], 
                                  capture_output=True, text=True, cwd=settings.BASE_DIR.parent)
            logs.append(f"Git pull output: {result.stdout}")
            if result.stderr:
                logs.append(f"Git pull errors: {result.stderr}")
            
            # Step 2: Install dependencies
            logs.append("=== Installing Backend Dependencies ===")
            result = subprocess.run(['pip', 'install', '-r', 'requirements.txt'], 
                                  capture_output=True, text=True, cwd=settings.BASE_DIR)
            logs.append(f"Pip install output: {result.stdout}")
            
            # Step 3: Run migrations
            logs.append("=== Running Migrations ===")
            result = subprocess.run(['python', 'manage.py', 'migrate'], 
                                  capture_output=True, text=True, cwd=settings.BASE_DIR)
            logs.append(f"Migration output: {result.stdout}")
            
            # Step 4: Collect static files
            logs.append("=== Collecting Static Files ===")
            result = subprocess.run(['python', 'manage.py', 'collectstatic', '--noinput'], 
                                  capture_output=True, text=True, cwd=settings.BASE_DIR)
            logs.append(f"Collectstatic output: {result.stdout}")
            
            # Step 5: Install frontend dependencies
            logs.append("=== Installing Frontend Dependencies ===")
            frontend_path = settings.BASE_DIR.parent / 'frontend'
            result = subprocess.run(['pnpm', 'install'], 
                                  capture_output=True, text=True, cwd=frontend_path)
            logs.append(f"Frontend install output: {result.stdout}")
            
            # Step 6: Build frontend
            logs.append("=== Building Frontend ===")
            result = subprocess.run(['pnpm', 'run', 'build'], 
                                  capture_output=True, text=True, cwd=frontend_path)
            logs.append(f"Frontend build output: {result.stdout}")
            
            # Step 7: Restart services (if in production)
            if not settings.DEBUG:
                logs.append("=== Restarting Services ===")
                # Restart Gunicorn
                subprocess.run(['sudo', 'systemctl', 'restart', 'gunicorn'])
                # Restart Nginx
                subprocess.run(['sudo', 'systemctl', 'restart', 'nginx'])
                logs.append("Services restarted successfully")
            
            deployment.status = 'success'
            deployment.completed_at = datetime.now()
            logs.append("=== Deployment Completed Successfully ===")
            
        except Exception as e:
            deployment.status = 'failed'
            deployment.error_message = str(e)
            deployment.completed_at = datetime.now()
            logs.append(f"=== Deployment Failed: {str(e)} ===")
            
            # Attempt rollback
            self.rollback_deployment(deployment, logs)
        
        deployment.logs = '\n'.join(logs)
        deployment.save()
    
    def rollback_deployment(self, deployment, logs):
        """Rollback to previous commit"""
        try:
            logs.append("=== Starting Rollback ===")
            
            # Get previous commit
            result = subprocess.run(['git', 'log', '--oneline', '-2'], 
                                  capture_output=True, text=True, cwd=settings.BASE_DIR.parent)
            commits = result.stdout.strip().split('\n')
            if len(commits) > 1:
                previous_commit = commits[1].split()[0]
                deployment.rollback_commit = previous_commit
                
                # Reset to previous commit
                subprocess.run(['git', 'reset', '--hard', previous_commit], 
                             cwd=settings.BASE_DIR.parent)
                
                # Re-run migrations
                subprocess.run(['python', 'manage.py', 'migrate'], 
                             cwd=settings.BASE_DIR)
                
                deployment.status = 'rollback'
                logs.append(f"Rolled back to commit: {previous_commit}")
            
        except Exception as rollback_error:
            logs.append(f"Rollback failed: {str(rollback_error)}")


@require_http_methods(["GET"])
def deployment_status(request, deployment_id):
    """Get deployment status"""
    try:
        deployment = DeploymentLog.objects.get(id=deployment_id)
        return JsonResponse({
            'id': deployment.id,
            'status': deployment.status,
            'commit': deployment.commit_hash[:8],
            'started_at': deployment.started_at,
            'completed_at': deployment.completed_at,
            'logs': deployment.logs,
            'error': deployment.error_message
        })
    except DeploymentLog.DoesNotExist:
        return JsonResponse({'error': 'Deployment not found'}, status=404)


@require_http_methods(["GET"])
def deployment_history(request):
    """Get deployment history"""
    deployments = DeploymentLog.objects.all()[:20]
    return JsonResponse({
        'deployments': [{
            'id': d.id,
            'status': d.status,
            'commit': d.commit_hash[:8],
            'message': d.commit_message[:100],
            'author': d.author,
            'started_at': d.started_at,
            'completed_at': d.completed_at
        } for d in deployments]
    })