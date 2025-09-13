#!/bin/bash

# SAP Project Management Script

show_help() {
    echo "SAP Project Management Script"
    echo ""
    echo "Usage: ./manage_project.sh [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  local-setup     Set up project for local development"
    echo "  local-start     Start local development servers"
    echo "  local-stop      Stop local development servers"
    echo "  deploy-prod     Deploy to production server"
    echo "  backup-db       Create database backup"
    echo "  update-deps     Update project dependencies"
    echo "  help            Show this help message"
    echo ""
}

local_setup() {
    echo "🚀 Setting up SAP project for local development..."
    
    # Backend setup
    echo "📦 Setting up backend..."
    cd backend
    chmod +x scripts/local_setup.sh
    ./scripts/local_setup.sh
    cd ..
    
    # Frontend setup
    echo "🎨 Setting up frontend..."
    cd frontend
    pnpm install
    cd ..
    
    echo "✅ Local setup complete!"
    echo "Run './manage_project.sh local-start' to start development servers"
}

local_start() {
    echo "🚀 Starting local development servers..."
    
    # Start backend
    echo "🔧 Starting Django backend..."
    cd backend
    source venv/bin/activate
    python manage.py runserver &
    BACKEND_PID=$!
    cd ..
    
    # Start frontend
    echo "🎨 Starting React frontend..."
    cd frontend
    pnpm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo "✅ Development servers started!"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend: http://127.0.0.1:8000"
    echo "📊 Admin: http://127.0.0.1:8000/admin"
    echo ""
    echo "Press Ctrl+C to stop servers"
    
    # Wait for user to stop
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '🛑 Servers stopped'; exit" INT
    wait
}

local_stop() {
    echo "🛑 Stopping local development servers..."
    pkill -f "python manage.py runserver"
    pkill -f "vite"
    echo "✅ Servers stopped"
}

deploy_prod() {
    echo "🚀 Deploying to production..."
    
    # Push to GitHub
    echo "📤 Pushing to GitHub..."
    git add .
    git commit -m "Deploy: $(date)"
    git push origin main
    
    echo "✅ Pushed to GitHub"
    echo "🔄 Production deployment will be handled by GitHub Actions or manual server update"
}

backup_db() {
    echo "💾 Creating database backup..."
    cd backend
    source venv/bin/activate
    
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    pg_dump -U postgres modernsap > $BACKUP_FILE
    
    echo "✅ Database backup created: $BACKUP_FILE"
    cd ..
}

update_deps() {
    echo "📦 Updating project dependencies..."
    
    # Update backend
    echo "🔧 Updating backend dependencies..."
    cd backend
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt --upgrade
    cd ..
    
    # Update frontend
    echo "🎨 Updating frontend dependencies..."
    cd frontend
    pnpm update
    cd ..
    
    echo "✅ Dependencies updated"
}

# Main script logic
case "$1" in
    local-setup)
        local_setup
        ;;
    local-start)
        local_start
        ;;
    local-stop)
        local_stop
        ;;
    deploy-prod)
        deploy_prod
        ;;
    backup-db)
        backup_db
        ;;
    update-deps)
        update_deps
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
