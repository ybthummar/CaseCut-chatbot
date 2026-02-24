# Quick Start Script for Windows PowerShell
# Run this to quickly start development environment

Write-Host "🚀 Starting Legal RAG System..." -ForegroundColor Cyan
Write-Host ""

# Check if in project root
if (-not (Test-Path "backend" -PathType Container)) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    Write-Host "   Expected: d:\SEMESTERS\Projects\CaseCut chatbot\" -ForegroundColor Yellow
    exit 1
}

# Check .env files
Write-Host "📋 Checking configuration..." -ForegroundColor Yellow
if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  backend\.env not found!" -ForegroundColor Red
    Write-Host "   Creating from template..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "   ✅ Created backend\.env - Please edit with your API keys" -ForegroundColor Green
    Write-Host "   Run: notepad backend\.env" -ForegroundColor Cyan
    exit 0
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "⚠️  frontend\.env not found!" -ForegroundColor Red
    Write-Host "   Creating from template..." -ForegroundColor Yellow
    Copy-Item "frontend\.env.example" "frontend\.env"
    Write-Host "   ✅ Created frontend\.env" -ForegroundColor Green
}

Write-Host "✅ Configuration files found" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "🔧 Starting Backend..." -ForegroundColor Cyan
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'backend'; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload" -PassThru
Write-Host "   Backend PID: $($backend.Id)" -ForegroundColor Gray
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "🎨 Starting Frontend..." -ForegroundColor Cyan
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'frontend'; npm run dev" -PassThru
Write-Host "   Frontend PID: $($frontend.Id)" -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ Legal RAG System Started!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access Points:" -ForegroundColor Yellow
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Health:   http://localhost:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "🛑 To stop: Close both PowerShell windows" -ForegroundColor Yellow
Write-Host ""
