# ᗩTᕼᙓᑎᗩ'𝔖 - Modern Enterprise System

A complete modern enterprise system built with React + TypeScript frontend and Django REST API backend.

## 🚀 Quick Start

### Local Development
```bash
# Clone the repository
git clone https://github.com/your-username/athenas.git
cd athenas

# Quick setup (recommended)
./manage_project.sh local-setup

# Start development servers
./manage_project.sh local-start
```

### Manual Setup
```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.local .env
python manage.py migrate
python manage.py runserver

# Frontend (in another terminal)
cd frontend
pnpm install
pnpm run dev
```

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework:** React 19.1.1 with Vite 7.1.5
- **Styling:** Tailwind CSS 3.4.17
- **State Management:** Zustand + TanStack Query
- **Routing:** React Router 7.8.2
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Real-time:** Socket.io-client

### Backend (Django REST API)
- **Framework:** Django 5.2.6 + DRF 3.16.1
- **Database:** PostgreSQL
- **Authentication:** JWT (SimpleJWT)
- **Real-time:** Django Channels + Redis
- **API Documentation:** Auto-generated
- **File Storage:** Local/Cloud ready
