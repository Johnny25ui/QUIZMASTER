$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".\backend\.env")) {
    Write-Host "ERROR: No existe backend\.env" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "QUIZMASTER - LIMPIAR PRUEBAS" -ForegroundColor Cyan
Write-Host "Se eliminaran estudiantes, intentos y respuestas de prueba." -ForegroundColor Yellow
Write-Host "NO se eliminaran cuestionarios, preguntas ni administrador." -ForegroundColor Green
Write-Host ""

$confirmacion = Read-Host "Escriba LIMPIAR para continuar"

if ($confirmacion -ne "LIMPIAR") {
    Write-Host "Operacion cancelada." -ForegroundColor Yellow
    exit 0
}

node ".\backend\scripts\limpiar-pruebas.js"
