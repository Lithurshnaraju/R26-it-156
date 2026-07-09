# AquaGuard Frontend — Setup Guide

## Quick start (3 commands)

```bash
cd aquaguard-frontend
pnpm install
pnpm dev
```

Open **http://localhost:3000** in your browser.

## Login credentials (hardcoded for demo)

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Monitoring Officer |
| officer | officer123 | Field Worker |

## Important: Start the backend FIRST

Before running the frontend, make sure your FastAPI backend is running:

```bash
cd aquaguard-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The frontend connects to the backend at `localhost:8000` via Next.js rewrites.

## If you don't have pnpm installed

```bash
npm install -g pnpm
```

## Demo flow

1. Open http://localhost:3000
2. Login with admin / admin123
3. Click "Analyze Image" button (top right)
4. Upload a garbage image, fill in river name and coordinates
5. Click "Analyze" — results appear on dashboard
6. Repeat with different images to build up the charts
