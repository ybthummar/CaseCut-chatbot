# Quick Start Script for Windows PowerShell
# Run this to quickly start development environment

Write-Host "Starting Legal RAG System..." -ForegroundColor Cyan
Write-Host ""

# Check if in project root
if (-not (Test-Path "backend" -PathType Container)) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    Write-Host "   Expected: d:\SEMESTERS\Projects\CaseCut chatbot\" -ForegroundColor Yellow
    exit 1
}

# Check .env files
Write-Host "Checking configuration..." -ForegroundColor Yellow
if (-not (Test-Path "backend\.env")) {
    Write-Host "backend\.env not found!" -ForegroundColor Red
    Write-Host "   Creating from template..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "   Created backend\.env - Please edit with your API keys" -ForegroundColor Green
    Write-Host "   Run: notepad backend\.env" -ForegroundColor Cyan
    exit 0
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "frontend\.env not found!" -ForegroundColor Red
    Write-Host "   Creating from template..." -ForegroundColor Yellow
    Copy-Item "frontend\.env.example" "frontend\.env"
    Write-Host "   Created frontend\.env" -ForegroundColor Green
}

Write-Host "Configuration files found" -ForegroundColor Green
Write-Host ""

function Get-FreePort {
    param(
        [int]$StartPort = 8000,
        [int]$EndPort = 8100
    )

    for ($p = $StartPort; $p -le $EndPort; $p++) {
        $listener = $null
        try {
            $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
            $listener.Start()
            $listener.Stop()
            return $p
        } catch {
            if ($listener) {
                try { $listener.Stop() } catch {}
            }
        }
    }

    throw "No free port found between $StartPort and $EndPort"
}

$backendPort = Get-FreePort

# Start Backend
Write-Host "Starting Backend..." -ForegroundColor Cyan
if (-not (Test-Path "backend\.venv310\Scripts\python.exe")) {
    Write-Host "   Creating backend virtual environment (.venv310)..." -ForegroundColor Yellow
    py -3.10 -m venv "backend\.venv310"
}
$backendCmd = "cd 'backend'; .\.venv310\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 127.0.0.1 --port $backendPort"
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -PassThru
Write-Host "   Backend PID: $($backend.Id)" -ForegroundColor Gray
if ($backendPort -ne 8000) {
    Write-Host "   Port 8000 is unavailable, using $backendPort" -ForegroundColor Yellow
}
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Cyan
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'frontend'; npm run dev" -PassThru
Write-Host "   Frontend PID: $($frontend.Id)" -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Legal RAG System Started!" -ForegroundColor Green
Write-Host ""
Write-Host "Access Points:" -ForegroundColor Yellow
Write-Host "   Backend:  http://localhost:$backendPort" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Health:   http://localhost:$backendPort/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop: Close both PowerShell windows" -ForegroundColor Yellow
Write-Host ""
