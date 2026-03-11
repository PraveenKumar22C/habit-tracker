@echo off
echo Starting Habit Tracker Application...

REM Check if .env.local exists
if not exist ".env.local" (
  echo Error: .env.local not found. Please create it with your configuration.
  exit /b 1
)

REM Check if backend\.env exists
if not exist "backend\.env" (
  echo Error: backend\.env not found. Please create it with your configuration.
  exit /b 1
)

REM Check if backend node_modules exists
if not exist "backend\node_modules" (
  echo Installing backend dependencies...
  cd backend
  call npm install
  cd ..
)

REM Start backend in a separate window
echo Starting backend server on port 5000...
start cmd /k "cd backend && npm run dev"

REM Wait a bit for backend to start
timeout /t 2 /nobreak

REM Start frontend
echo Starting frontend server on port 3000...
npm run dev

pause
