#!/bin/bash

# Start Celery Worker
echo "Starting Celery Worker..."
celery -A sap_backend.celery_app worker --loglevel=info --detach

# Start Celery Beat Scheduler
echo "Starting Celery Beat Scheduler..."
celery -A sap_backend.celery_app beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler --detach

# Start Celery Flower (optional monitoring)
echo "Starting Celery Flower..."
celery -A sap_backend.celery_app flower --port=5555 --detach

echo "All Celery services started successfully!"
echo "Celery Flower monitoring available at: http://localhost:5555"