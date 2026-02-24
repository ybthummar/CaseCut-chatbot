# First Time Setup Script for Windows PowerShell
# Run this once to set up the project

Write-Host "🚀 Legal RAG System - First Time Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "1️⃣  Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Python installed: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Python not found! Install from: https://python.org" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "2️⃣  Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Node.js not found! Install from: https://nodejs.org" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "3️⃣  Setting up Backend..." -ForegroundColor Yellow

# Create backend .env
if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "   ✅ Created backend\.env" -ForegroundColor Green
    Write-Host "   ⚠️  IMPORTANT: Edit backend\.env with your API keys!" -ForegroundColor Red
    Write-Host "   Run: notepad backend\.env" -ForegroundColor Cyan
} else {
    Write-Host "   ℹ️  backend\.env already exists" -ForegroundColor Gray
}

# Create Python virtual environment
Write-Host "   Creating virtual environment..." -ForegroundColor Gray
cd backend
python -m venv venv
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to create virtual environment" -ForegroundColor Red
    exit 1
}

# Install Python dependencies
Write-Host "   Installing Python packages (takes 2-3 minutes)..." -ForegroundColor Gray
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Python packages installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to install Python packages" -ForegroundColor Red
    exit 1
}
deactivate
cd ..

Write-Host ""
Write-Host "4️⃣  Setting up Frontend..." -ForegroundColor Yellow

# Create frontend .env
if (-not (Test-Path "frontend\.env")) {
    Copy-Item "frontend\.env.example" "frontend\.env"
    Write-Host "   ✅ Created frontend\.env" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  frontend\.env already exists" -ForegroundColor Gray
}

# Install Node dependencies
Write-Host "   Installing Node packages (takes 1-2 minutes)..." -ForegroundColor Gray
cd frontend
npm install --silent
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Node packages installed" -ForegroundColor Green
} else {
    Write-Host "   ❌ Failed to install Node packages" -ForegroundColor Red
    exit 1
}
cd ..

# Create data directories
Write-Host ""
Write-Host "5️⃣  Creating data directories..." -ForegroundColor Yellow
if (-not (Test-Path "data\raw")) {
    New-Item -ItemType Directory -Path "data\raw" -Force | Out-Null
    Write-Host "   ✅ Created data\raw" -ForegroundColor Green
}
if (-not (Test-Path "data\embeddings")) {
    New-Item -ItemType Directory -Path "data\embeddings" -Force | Out-Null
    Write-Host "   ✅ Created data\embeddings" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Get Free API Keys:" -ForegroundColor Cyan
Write-Host "      - Groq:   https://console.groq.com" -ForegroundColor Gray
Write-Host "      - Gemini: https://aistudio.google.com" -ForegroundColor Gray
Write-Host "      - Qdrant: https://cloud.qdrant.io" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Edit Configuration:" -ForegroundColor Cyan
Write-Host "      notepad backend\.env" -ForegroundColor Gray
Write-Host "      # Add your API keys" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   3. Add Legal PDFs to:" -ForegroundColor Cyan
Write-Host "      data\raw\" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. Process PDFs:" -ForegroundColor Cyan
Write-Host "      cd backend" -ForegroundColor Gray
Write-Host "      .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "      python app\embeddings.py" -ForegroundColor Gray
Write-Host ""
Write-Host "   5. Start Development:" -ForegroundColor Cyan
Write-Host "      .\start.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 For detailed instructions, see:" -ForegroundColor Yellow
Write-Host "   README.md or DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
