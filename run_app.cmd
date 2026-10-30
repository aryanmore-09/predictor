@echo off
setlocal enabledelayedexpansion
title Student Risk Predictor - System Launcher
cd /d "%~dp0"

echo ===============================================================================
echo        STUDENT ACADEMIC PERFORMANCE & DROPOUT RISK PREDICTOR
echo               MIT School of Computing - Dept. of CSE
echo ===============================================================================
echo.

:: 1. Check Python installation
echo [1/5] Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in system PATH.
    echo Please install Python 3.10+ from https://www.python.org/ and check "Add Python to PATH".
    pause
    exit /b 1
)

:: 2. Check Node.js / NPM installation
echo [2/5] Checking Node.js environment...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in system PATH.
    echo Please install Node.js 18+ from https://nodejs.org/.
    pause
    exit /b 1
)

:: 3. Setup Backend Virtual Environment & Dependencies
echo [3/5] Verifying backend virtual environment...
if not exist "backend\venv\Scripts\python.exe" (
    echo [*] Creating virtual environment in backend\venv...
    python -m venv backend\venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [*] Installing backend dependencies (this may take a few minutes on first run)...
    backend\venv\Scripts\python.exe -m pip install --upgrade pip
    backend\venv\Scripts\pip.exe install -r backend\requirements.txt
) else (
    echo [OK] Backend virtual environment found.
)

:: 4. Verify Database & Machine Learning Models
echo [4/5] Checking database and trained ML models...
if not exist "backend\predictor.db" (
    echo [*] Database not detected. Initializing database, seeding 520 students, and training champion ML model...
    cd backend
    venv\Scripts\python.exe -m data.seed
    cd ..
) else (
    echo [OK] Database and ML model artifacts ready.
)

:: 5. Setup Frontend Dependencies
echo [5/5] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo [*] Installing frontend npm packages...
    cd frontend
    call npm install --legacy-peer-deps
    cd ..
) else (
    echo [OK] Frontend node_modules found.
)

echo.
echo ===============================================================================
echo  Launching Services:
echo    - Backend API:  http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/api/docs)
echo    - Frontend App: http://localhost:5173
echo.
echo  Demo Credentials:
echo    - Administrator:  admin@mit.edu       / Admin@123
echo    - Faculty Mentor: prof.sharma@mit.edu / Faculty@123
echo    - Student Portal: student1@mit.edu    / Student@123
echo.
echo  Features Active:
echo    - What-If Simulator (real-time debounced model evaluations)
echo    - Risk Trend Over Time (interactive line charts)
echo    - Official PDF Report Export (ReportLab institutional downloads)
echo ===============================================================================
echo.

:: Launch Backend in separate window
start "Predictor - Backend API (Port 8000)" cmd /k "cd /d \"%~dp0backend\" && venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Launch Frontend in separate window
start "Predictor - Frontend App (Port 5173)" cmd /k "cd /d \"%~dp0frontend\" && npm run dev"

:: Wait 3 seconds for server warm-up and launch default browser
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo Servers are running in their respective background console windows.
echo You may minimize this window or press any key to close this launcher.
echo.
pause

