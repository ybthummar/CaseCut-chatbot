@echo off
title CaseCut Backend Server
echo ============================================
echo         CaseCut Backend Launcher
echo ============================================
echo.

cd /d "%~dp0backend"

:: ── Python environment setup ──────────────────────────────────
set "VENV=.venv310"
set "PYTHON=%VENV%\Scripts\python.exe"

if not exist "%PYTHON%" (
    echo [!] Virtual environment not found. Creating .venv310 with Python 3.10...
    py -3.10 -m venv "%VENV%" 2>nul
    if not exist "%PYTHON%" (
        echo [ERROR] Failed to create venv. Make sure Python 3.10 is installed.
        echo         Install from: https://www.python.org/downloads/release/python-3109/
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created.
    echo.
)

:: ── Install / update dependencies ─────────────────────────────
echo [*] Checking dependencies...
"%PYTHON%" -m pip install -r requirements.txt --quiet --disable-pip-version-check
if errorlevel 1 (
    echo [!] Some dependencies failed. Retrying with full output...
    "%PYTHON%" -m pip install -r requirements.txt --disable-pip-version-check
)
echo [OK] Dependencies ready.
echo.

:: ── Find available port (8000-8010) ───────────────────────────
set "PORT=8000"
"%PYTHON%" -c "import socket; s=socket.socket(); r=s.connect_ex(('127.0.0.1',8000)); s.close(); exit(0 if r else 1)" 2>nul
if errorlevel 1 (
    set "PORT=8001"
    echo [!] Port 8000 busy, using port 8001
)

echo [*] Starting server on http://127.0.0.1:%PORT%
echo [*] Press Ctrl+C to stop the server.
echo.

:: ── Launch uvicorn ────────────────────────────────────────────
"%PYTHON%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port %PORT%

echo.
echo [*] Server stopped.
pause
