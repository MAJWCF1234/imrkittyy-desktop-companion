@echo off
setlocal

cd /d "%~dp0app"
set "QUIET=0"
if /i "%~1"=="--quiet" set "QUIET=1"
if /i "%~1"=="/quiet" set "QUIET=1"

if not exist "package.json" (
  echo ERROR: app\package.json not found.
  if not "%QUIET%"=="1" pause
  exit /b 1
)

where node >nul 2>nul
set "HAS_NODE=%errorlevel%"
where npm >nul 2>nul
set "HAS_NPM=%errorlevel%"

if exist "node_modules" (
  echo Dependencies already present in app\.
) else if "%HAS_NODE%"=="0" if "%HAS_NPM%"=="0" (
  echo Installing dependencies in app\...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    if not "%QUIET%"=="1" pause
    exit /b 1
  )
) else (
  echo Node.js/npm were not found.
  echo The app folder is ready only if the bundled dependencies are already present.
)

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Create-Desktop-Shortcut.ps1"
echo.
echo Installation check complete. You can now double-click Start-Mai.cmd.
if not "%QUIET%"=="1" pause
