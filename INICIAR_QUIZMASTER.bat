@echo off
cd /d "%~dp0"
if not exist "backend\.env" (
  copy "backend\.env.example" "backend\.env" >nul
  start notepad "backend\.env"
  echo Configure backend\.env y vuelva a ejecutar este archivo.
  pause
  exit /b
)
call npm install
call npm run install:all
start http://localhost:5173
call npm run dev
pause
