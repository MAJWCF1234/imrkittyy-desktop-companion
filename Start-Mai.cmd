@echo off
setlocal

cd /d "%~dp0"
set "LOG_DIR=%cd%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

set "POWERSHELL_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "DATE_PART=%DATE:/=-%"
set "TIME_PART=%TIME::=-%"
set "TIME_PART=%TIME_PART:.=-%"
set "TIME_PART=%TIME_PART: =0%"
set "TS=%DATE_PART%_%TIME_PART%"
set "TS=%TS: =_%"
set "LOG_FILE=%LOG_DIR%\launcher-%TS%.log"

set "PRIMARY_BASE=http://127.0.0.1:1234"
set "FALLBACK_BASE=http://localhost:1234"
set "PRIMARY_API=%PRIMARY_BASE%/v1/models"
set "FALLBACK_API=%FALLBACK_BASE%/v1/models"
set "SUGGESTED_MODEL=lmstudio-community/gemma-4-31B-it-GGUF"
set "PORTABLE_LM_DIR=%cd%\lmstudio"
set "LOCAL_MODEL_DIR=%cd%\models"
set "ELECTRON_EXE=%cd%\node_modules\electron\dist\electron.exe"
set "HAS_BUNDLED_ELECTRON=0"
set "HAS_DIST_BUILD=0"
set "RETRIED_START=0"
set "ACTIVE_BASE="

echo ===========================================
echo   Mai Desktop Companion Launcher
echo   Custom build for imrkittyy
echo ===========================================
echo.
echo Log file: "%LOG_FILE%"
echo.
echo ===== Launcher started at %date% %time% =====> "%LOG_FILE%"
echo Working directory: %cd%>> "%LOG_FILE%"

if not exist "package.json" (
  echo ERROR: package.json not found in:
  echo %cd%
  echo.
  echo Make sure this launcher is inside your project folder.
  echo ERROR: package.json missing.>> "%LOG_FILE%"
  pause
  exit /b 1
)

where node >nul 2>nul
if not errorlevel 1 (
  set "HAS_NODE=1"
)

where npm >nul 2>nul
if not errorlevel 1 (
  set "HAS_NPM=1"
)

if exist "%ELECTRON_EXE%" (
  set "HAS_BUNDLED_ELECTRON=1"
)

if exist "dist\index.html" (
  set "HAS_DIST_BUILD=1"
)

if not defined HAS_NODE (
  echo Node.js not found on PATH.
  echo NOTE: Falling back to bundled Electron if available.>> "%LOG_FILE%"
)

if not defined HAS_NPM (
  echo npm not found on PATH.
  echo NOTE: Falling back to bundled Electron if available.>> "%LOG_FILE%"
)

call :EnsureLmStudioRunning

echo Checking LM Studio endpoint...
echo Checking endpoint: %PRIMARY_API%>> "%LOG_FILE%"
call :CheckEndpoint "%PRIMARY_API%"
if errorlevel 1 (
  echo Primary endpoint not reachable. Trying local fallback...
  echo Primary endpoint unreachable.>> "%LOG_FILE%"
  echo Checking endpoint: %FALLBACK_API%>> "%LOG_FILE%"
  call :CheckEndpoint "%FALLBACK_API%"
  if errorlevel 1 (
    echo WARNING: Could not reach LM Studio endpoint.
    echo Start LM Studio and load a model, then continue.
    if exist "%LOCAL_MODEL_DIR%" (
      echo Local model folder found: "%LOCAL_MODEL_DIR%"
      echo Put GGUF/model files here to keep LM Studio and the model bundle in one client folder.
      echo Local model folder found: "%LOCAL_MODEL_DIR%">> "%LOG_FILE%"
    )
    echo WARNING: No endpoint reachable.>> "%LOG_FILE%"
  ) else (
    echo Local fallback endpoint is reachable.
    echo Local fallback endpoint reachable.>> "%LOG_FILE%"
    set "ACTIVE_BASE=%FALLBACK_BASE%"
  )
) else (
  echo Primary endpoint is reachable.
  echo Primary endpoint reachable.>> "%LOG_FILE%"
  set "ACTIVE_BASE=%PRIMARY_BASE%"
)

if defined ACTIVE_BASE (
  echo Attempting to load suggested model: %SUGGESTED_MODEL%
  echo Attempting model load: %SUGGESTED_MODEL% on %ACTIVE_BASE%>> "%LOG_FILE%"
  call :TryLoadSuggestedModel "%ACTIVE_BASE%" "%SUGGESTED_MODEL%"
  if errorlevel 1 (
    echo Could not auto-load suggested model.
    echo You can load it manually in LM Studio.
    echo WARNING: model auto-load failed.>> "%LOG_FILE%"
  ) else (
    echo Suggested model load request sent.
    echo Suggested model load request succeeded.>> "%LOG_FILE%"
  )
)

if not defined ACTIVE_BASE (
  echo Skipping model auto-load because no endpoint is reachable.
  echo INFO: skipped model auto-load because endpoint unavailable.>> "%LOG_FILE%"
)

if defined HAS_NODE if defined HAS_NPM if not exist "node_modules" (
  echo Installing dependencies...
  echo Running: npm install>> "%LOG_FILE%"
  call npm install >> "%LOG_FILE%" 2>&1
  if errorlevel 1 (
    echo.
    echo Failed to install dependencies.
    echo ERROR: npm install failed.>> "%LOG_FILE%"
    pause
    exit /b 1
  )
)

set "START_MODE="
if defined HAS_NODE if defined HAS_NPM set "START_MODE=NPM"
if not defined START_MODE if "%HAS_BUNDLED_ELECTRON%"=="1" if "%HAS_DIST_BUILD%"=="1" set "START_MODE=BUNDLED"

if "%START_MODE%"=="NPM" (
  echo Starting Mai Desktop Companion...
  echo Running: npm start>> "%LOG_FILE%"
  call npm start >> "%LOG_FILE%" 2>&1
) else if "%START_MODE%"=="BUNDLED" (
  echo Starting Mai Desktop Companion from bundled Electron...
  echo Running: bundled electron>> "%LOG_FILE%"
  "%ELECTRON_EXE%" .
) else (
  echo.
  echo ERROR: This folder cannot start on this machine yet.
  echo Install Node.js LTS if you want the launcher to build the app,
  echo or ship the bundled Electron files and dist\index.html together.
  echo ERROR: no runnable Electron path found.>> "%LOG_FILE%"
  pause
  exit /b 1
)

if errorlevel 1 (
  if "%RETRIED_START%"=="0" (
    set "RETRIED_START=1"
    echo.
    echo First start failed. Running npm install once, then retrying...
    echo First start failed. Retrying after npm install.>> "%LOG_FILE%"
    call npm install >> "%LOG_FILE%" 2>&1
    if errorlevel 1 (
      echo Retry install failed. Check log for details.
      echo ERROR: retry npm install failed.>> "%LOG_FILE%"
      pause
      exit /b 1
    )
    echo Starting Mai Desktop Companion ^(retry^)...
    echo Running: npm start ^(retry^)>> "%LOG_FILE%"
    call npm start >> "%LOG_FILE%" 2>&1
  )
)

if errorlevel 1 (
  echo.
  echo App exited with an error. Check log:
  echo "%LOG_FILE%"
  echo ERROR: npm start failed after retry.>> "%LOG_FILE%"
  pause
  exit /b 1
)

echo.
echo Launcher finished. Log saved at:
echo "%LOG_FILE%"
echo ===== Launcher exited successfully at %date% %time% =====>> "%LOG_FILE%"
exit /b 0

:CheckEndpoint
"%POWERSHELL_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%~1' -Method GET -TimeoutSec 3; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }"
exit /b %errorlevel%

:EnsureLmStudioRunning
echo Checking whether LM Studio server is already reachable...
echo Checking LM Studio endpoint before launch.>> "%LOG_FILE%"
call :CheckEndpoint "%PRIMARY_API%"
if not errorlevel 1 (
  echo LM Studio server is already reachable.
  echo LM Studio endpoint already reachable at %PRIMARY_API%.>> "%LOG_FILE%"
  exit /b 0
)
call :CheckEndpoint "%FALLBACK_API%"
if not errorlevel 1 (
  echo LM Studio server is already reachable.
  echo LM Studio endpoint already reachable at %FALLBACK_API%.>> "%LOG_FILE%"
  exit /b 0
)

echo Checking LM Studio process...
echo Checking LM Studio process.>> "%LOG_FILE%"
"%POWERSHELL_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "$running = Get-Process | Where-Object { $_.ProcessName -like 'LM Studio*' -or $_.ProcessName -like 'LMStudio*' }; if ($running) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
  echo LM Studio is already running.
  echo LM Studio already running.>> "%LOG_FILE%"
  exit /b 0
)

set "LM_EXE="
for %%P in (
  "%LocalAppData%\Programs\LM Studio\LM Studio.exe"
  "%PORTABLE_LM_DIR%\LM Studio.exe"
  "%PORTABLE_LM_DIR%\LM Studio\LM Studio.exe"
  "%ProgramFiles%\LM Studio\LM Studio.exe"
  "%ProgramFiles(x86)%\LM Studio\LM Studio.exe"
) do (
  if exist "%%~P" (
    set "LM_EXE=%%~P"
  )
)

if not defined LM_EXE (
  for /f "usebackq delims=" %%P in (`"%POWERSHELL_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "$roots = @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'); foreach ($root in $roots) { Get-ItemProperty $root -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'LM Studio*' } | ForEach-Object { $candidates = @($_.DisplayIcon, $(if ($_.InstallLocation) { Join-Path $_.InstallLocation 'LM Studio.exe' })); foreach ($candidate in $candidates) { if ($candidate) { $clean = [string]$candidate -replace ',\d+$',''; if (Test-Path $clean) { $clean; exit 0 } } } } }; exit 1"`) do (
    set "LM_EXE=%%P"
  )
)

if not defined LM_EXE (
  echo LM Studio executable not found in common install paths.
  echo If this computer already owns LM Studio, open it once and enable the local server.
  echo WARNING: LM Studio executable not found in common paths or registry.>> "%LOG_FILE%"
  exit /b 0
)

echo Existing LM Studio install found.
echo Launching LM Studio...
echo Existing LM Studio install found: %LM_EXE%>> "%LOG_FILE%"
echo Launching LM Studio from: %LM_EXE%>> "%LOG_FILE%"
start "" "%LM_EXE%" >nul 2>&1
"%POWERSHELL_EXE%" -NoProfile -Command "Start-Sleep -Seconds 4" >nul 2>nul
exit /b 0

:TryLoadSuggestedModel
"%POWERSHELL_EXE%" -NoProfile -ExecutionPolicy Bypass -Command "$base = '%~1'.TrimEnd('/'); $model = '%~2'; $body = @{ model = $model } | ConvertTo-Json -Compress; $urls = @($base + '/api/v0/model/load', $base + '/api/v0/models/load', $base + '/v1/internal/model/load'); foreach ($url in $urls) { try { $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 8; if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) { exit 0 } } catch {} }; exit 1"
exit /b %errorlevel%
