@echo off
setlocal
title Student Risk Predictor - Project Packager
cd /d "%~dp0"

echo ===============================================================================
echo      CREATING SHAREABLE ZIP ARCHIVE OF COMPLETE SYSTEM
echo ===============================================================================
echo.
echo Packaging backend, frontend, models, database, and codes...
echo Excluding heavy dependency folders (node_modules, venv, pycache)...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$dest = Join-Path (Get-Location) 'Student_Risk_Predictor_Complete.zip'; " ^
    "if (Test-Path $dest) { Remove-Item -Force $dest }; " ^
    "$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ('predictor_pkg_' + [System.Guid]::NewGuid().ToString()); " ^
    "New-Item -ItemType Directory -Path $tmpDir | Out-Null; " ^
    "Write-Host '[1/3] Staging project files...'; " ^
    "Copy-Item -Path 'README.md','docker-compose.yml','.env.example','run_app.cmd','SYSTEM_DOCUMENTATION.md','COMPLETE_SYSTEM_CODEBOOK_AND_DOCUMENTATION.md' -Destination $tmpDir -ErrorAction SilentlyContinue; " ^
    "robocopy 'backend' (Join-Path $tmpDir 'backend') /E /XD 'venv' '.pytest_cache' '__pycache__' /XF '*.pyc' /NJH /NJS /NDL /NC /NS | Out-Null; " ^
    "robocopy 'frontend' (Join-Path $tmpDir 'frontend') /E /XD 'node_modules' 'dist' '.vite' /NJH /NJS /NDL /NC /NS | Out-Null; " ^
    "Write-Host '[2/3] Compressing into standalone archive...'; " ^
    "Compress-Archive -Path (Join-Path $tmpDir '*') -DestinationPath $dest -CompressionLevel Optimal; " ^
    "Remove-Item -Recurse -Force $tmpDir; " ^
    "$sizeMB = [math]::Round(((Get-Item $dest).Length / 1MB), 2); " ^
    "Write-Host '[3/3] Done! Created: ' $dest ('(' + $sizeMB + ' MB)');"

if exist "Student_Risk_Predictor_Complete.zip" (
    echo.
    echo ===============================================================================
    echo  SUCCESS: Archive ready for distribution:
    echo  File: Student_Risk_Predictor_Complete.zip
    echo.
    echo  The recipient only needs to:
    echo    1. Extract the zip
    echo    2. Double-click run_app.cmd
    echo ===============================================================================
) else (
    echo.
    echo [ERROR] Packaging failed. Please check permissions.
)

echo.
pause

