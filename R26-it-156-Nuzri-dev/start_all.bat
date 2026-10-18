@echo off
title AI Surveillance Launcher
echo ============================================================
echo Launching AI Surveillance ^& Threat Detection System...
echo ============================================================
start "Surveillance Backend" cmd /c "%~dp0run_backend.bat"
ping 127.0.0.1 -n 3 >nul
start "Surveillance Frontend" cmd /c "%~dp0run_frontend.bat"
echo.
echo ============================================================
echo System launched successfully!
echo - Backend API:  http://localhost:8001
echo - Swagger Docs: http://localhost:8001/docs
echo - Frontend UI:  http://localhost:5173
echo ============================================================
