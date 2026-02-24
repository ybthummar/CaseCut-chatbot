@echo off
echo Starting CaseCut Backend...
cd /d "%~dp0backend"
pip install -r requirements.txt >nul 2>&1
py -m uvicorn app.main:app --reload
pause
