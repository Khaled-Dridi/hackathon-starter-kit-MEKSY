@echo off
REM Boot the Charity Day dev stack and tail backend logs.
REM Run this from anywhere — it cd's to the repo root.
cd /d "%~dp0"
echo Starting docker compose...
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d
if errorlevel 1 (
  echo.
  echo Docker compose failed. Is Docker Desktop running?
  pause
  exit /b 1
)
echo.
echo Waiting for backend to be ready...
:wait
timeout /t 2 /nobreak >nul
curl -s -o nul -w "backend health: %%{http_code}\n" http://localhost:8080/q/health/ready
curl -s -o nul -w "%%{http_code}" http://localhost:8080/q/health/ready | findstr /b "200" >nul
if errorlevel 1 goto wait
echo.
echo Stack is up.
echo   Frontend: http://localhost:4200
echo   Backend:  http://localhost:8080
echo.
echo Tailing backend logs (Ctrl+C to stop)...
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml logs -f --tail 30 backend
