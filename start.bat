@echo off
echo Starting HCP Engagement Copilot...
echo.

:: Start backend
start "Backend - FastAPI" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend
start "Frontend - React" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit...
pause >nul
