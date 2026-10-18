@echo off
title AquaGuard + Vision Sentry Launcher
set "ROOT=%~dp0"

echo Starting AquaGuard Backend (port 8000)...
start "AquaGuard Backend (8000)" cmd /k "cd /d "%ROOT%aquaguard-backend" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo Starting Vision Sentry Backend (port 8001)...
start "Vision Sentry Backend (8001)" cmd /k "cd /d "%ROOT%R26-it-156-Nuzri-dev" && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001"

echo Starting Vision Sentry Frontend (port 5173)...
start "Vision Sentry Frontend (5173)" cmd /k "cd /d "%ROOT%R26-it-156-Nuzri-dev\frontend" && npm run dev"

echo Starting AquaGuard Frontend (port 3000)...
start "AquaGuard Frontend (3000)" cmd /k "cd /d "%ROOT%aquaguard-frontend" && npm run dev"

echo Waiting for services to initialize...
timeout /t 10 >nul
start http://localhost:3000
