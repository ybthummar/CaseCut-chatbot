@echo off
echo Starting CaseCut Backend...
cd /d "%~dp0backend"

set "VENV=.venv310"
set "PYTHON=%VENV%\Scripts\python.exe"

if not exist "%PYTHON%" (
	echo Creating Python 3.10 virtual environment...
	py -3.10 -m venv "%VENV%"
)

echo Installing backend dependencies...
"%PYTHON%" -m pip install -r requirements.txt

echo Launching API on http://127.0.0.1:8000 ...
"%PYTHON%" -m uvicorn app.main:app --reload
pause
