
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " QUIZMASTER - INSTALACION Y EJECUCION" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Node.js no esta instalado." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path ".\backend\.env")) {
  Copy-Item ".\backend\.env.example" ".\backend\.env"
  Write-Host "Se creo backend\.env." -ForegroundColor Yellow
  Write-Host "Pegue la DATABASE_URL real y configure JWT_SECRET / ADMIN_PASSWORD." -ForegroundColor Yellow
  notepad ".\backend\.env"
  exit 0
}

Write-Host "Instalando dependencias raiz..." -ForegroundColor Yellow
npm install

Write-Host "Instalando backend y frontend..." -ForegroundColor Yellow
npm run install:all

Write-Host ""
Write-Host "Abriendo QuizMaster en http://localhost:5173" -ForegroundColor Green
Start-Process "http://localhost:5173"

npm run dev
