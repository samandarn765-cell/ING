@echo off
REM EduPrep AI: Backend va frontendni ishga tushirish
cd /d "%~dp0"

if not exist backend\venv (
  echo [1/3] Python virtual muhit yaratilmoqda...
  python -m venv backend\venv
  backend\venv\Scripts\python -m pip install -r backend\requirements.txt
)
if not exist backend\.env copy backend\.env.example backend\.env >nul
if not exist frontend\node_modules (
  echo [2/3] npm paketlari o'rnatilmoqda...
  cd frontend && call npm install && cd ..
)

echo [3/3] Serverlar ishga tushmoqda...
start "EduPrep Backend" cmd /k "cd backend && venv\Scripts\python -m uvicorn app.main:app --reload --port 8000"
start "EduPrep Frontend" cmd /k "cd frontend && npm run dev"

ping 127.0.0.1 -n 4 >nul
start http://localhost:5173
