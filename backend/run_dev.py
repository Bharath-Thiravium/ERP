#!/usr/bin/env python
"""
Development server runner using Uvicorn
Replaces: daphne -b 0.0.0.0 -p 8000 sap_backend.asgi:application
"""
import os
import uvicorn

if __name__ == "__main__":
    # Set Django settings module
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
    
    print("🚀 Starting SAP Backend Development Server with Uvicorn...")
    print("📡 WebSocket support enabled for real-time features")
    print("🔗 Server will be available at: http://0.0.0.0:8000")
    
    uvicorn.run(
        "sap_backend.asgi:application",
        host="0.0.0.0",
        port=8000,
        reload=True,          # Auto-reload on code changes
        workers=1,            # Single worker for development
        loop="uvloop",        # Faster event loop
        http="httptools",     # Faster HTTP parser
        ws="websockets",      # WebSocket implementation
        log_level="info",
        access_log=True,
        reload_dirs=["./"],   # Watch current directory for changes
    )