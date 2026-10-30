@echo off
title Student Risk Predictor - Backend API
cd /d "%~dp0"
echo ============================================================
echo   Student Risk Predictor - Backend API
echo   URL  : http://localhost:8000
echo   Docs : http://localhost:8000/api/docs
echo ============================================================
echo.
set "PY=python"
if exist "venv\Scripts\python.exe" set "PY=venv\Scripts\python.exe"
echo Using: %PY%
echo Starting backend... (press Ctrl+C to stop)
echo.
"%PY%" -m uvicorn app.main:app --reload --port 8000
echo.
echo Backend stopped.
pause
