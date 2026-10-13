@echo off
rem TechCare launcher for Windows. Double-click it, or run "setup.bat 1" / "setup.bat 2".
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title TechCare

set "MODEL=qwen2.5:3b"
set "EMBED_MODEL=nomic-embed-text"
if exist ".env.local" (
  for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env.local") do (
    if "%%a"=="TECHCARE_OLLAMA_MODEL" if not "%%b"=="" set "MODEL=%%b"
    if "%%a"=="TECHCARE_OLLAMA_EMBED_MODEL" if not "%%b"=="" set "EMBED_MODEL=%%b"
  )
)

set "CHOICE=%~1"
if not defined CHOICE (
  echo.
  echo   TechCare
  echo   --------
  echo   1. Start TechCare [default]
  echo   2. Set up everything: dependencies, settings, database, and local AI
  echo   3. Share online at your Cloudflare domain
  echo.
  set /p "CHOICE=Choose 1, 2, or 3 and press Enter [1]: "
)
if "!CHOICE!"=="2" goto setup
if "!CHOICE!"=="3" goto share
goto start

:setup
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 or later is required. Install it from https://nodejs.org/ and run setup again.
  goto fail
)
for /f "delims=" %%v in ('node -p "process.versions.node.split('.')[0]"') do set "NODE_MAJOR=%%v"
if !NODE_MAJOR! LSS 24 (
  echo Node.js 24 or later is required. Install it from https://nodejs.org/ and run setup again.
  goto fail
)

echo [1/5] Installing dependencies...
call npm ci
if errorlevel 1 goto fail

echo.
echo [2/5] Creating local settings...
if exist ".env.local" (
  echo Kept your existing .env.local.
) else (
  copy /y ".env.example" ".env.local" >nul
  echo Created .env.local from .env.example.
)

echo.
echo [3/5] Preparing the database...
call node scripts\setup-database.mjs
if errorlevel 1 (
  set "DB_WARNING=1"
  echo The database is not ready yet. Fix the message above, then run option 2 again.
)

echo.
echo [4/5] Setting up the local AI assistant...
call :share
if not exist "node_modules" (
  echo TechCare is not set up yet. Run this again and choose option 2 first.
  goto fail
)
echo.
echo [1/5] Checking the sharing settings...
call node scripts\setup-sharing.mjs
if errorlevel 1 goto fail
set "PUBLIC_ORIGIN="
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env.production.local") do (
  if "%%a"=="TECHCARE_ORIGIN" set "PUBLIC_ORIGIN=%%b"
)
set "PUBLIC_HOST=!PUBLIC_ORIGIN:https://=!"

echo.
echo [2/5] Checking Cloudflare Tunnel...
call :find_cloudflared
if not defined CLOUDFLARED (
  where winget >nul 2>nul
  if not errorlevel 1 (
    echo cloudflared is not installed. Installing it with winget...
    winget install --id Cloudflare.cloudflared -e --silent --accept-source-agreements --accept-package-agreements
    call :find_cloudflared
  )
)
if not defined CLOUDFLARED (
  echo Install cloudflared from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
  echo then run option 3 again.
  goto fail
)
if not exist "%USERPROFILE%\.cloudflared\cert.pem" (
  echo A browser window will open. Sign in to Cloudflare and choose !PUBLIC_HOST!.
  "!CLOUDFLARED!" tunnel login
  if errorlevel 1 goto fail
)
"!CLOUDFLARED!" tunnel info techcare >nul 2>nul
if errorlevel 1 (
  echo Creating the "techcare" tunnel...
  "!CLOUDFLARED!" tunnel create techcare
  if errorlevel 1 goto fail
)
echo Pointing !PUBLIC_HOST! at the tunnel...
"!CLOUDFLARED!" tunnel route dns --overwrite-dns techcare !PUBLIC_HOST!
if errorlevel 1 goto fail

echo.
echo [3/5] Starting the local AI assistant if available...
call :find_ollama
if defined OLLAMA call :start_ollama

echo.
echo [4/5] Building the production version...
call npm run build
if errorlevel 1 goto fail

echo.
echo [5/5] Sharing TechCare at !PUBLIC_ORIGIN!
echo Keep this window and the "TechCare tunnel" window open while people use it.
echo Press Ctrl+C here to stop, then close the tunnel window.
start "TechCare tunnel" /min "!CLOUDFLARED!" tunnel run --url http://127.0.0.1:3100 techcare
set "PORT=3100"
call npm start
goto end

:find_cloudflared
set "CLOUDFLARED="
for /f "delims=" %%p in ('where cloudflared 2^>nul') do if not defined CLOUDFLARED set "CLOUDFLARED=%%p"
if not defined CLOUDFLARED if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "CLOUDFLARED=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
if not defined CLOUDFLARED if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CLOUDFLARED=%ProgramFiles%\cloudflared\cloudflared.exe"
exit /b 0

:find_ollama
if not defined OLLAMA (
  where winget >nul 2>nul
  if not errorlevel 1 (
    echo Ollama is not installed. Installing it with winget...
    winget install --id Ollama.Ollama -e --silent --accept-source-agreements --accept-package-agreements
    call :find_ollama
  )
)
if not defined OLLAMA (
  echo Ollama could not be installed automatically. Download it from https://ollama.com/download,
  echo then run option 2 again. Until then the assistant uses built-in help only.
) else (
  call :start_ollama
  echo Downloading the AI models. The first download is about 2 GB and can take a while...
  "!OLLAMA!" pull !MODEL!
  "!OLLAMA!" pull !EMBED_MODEL!
)

echo.
echo [5/5] Administrator account
set "MAKE_ADMIN=n"
set /p "MAKE_ADMIN=Create an administrator account now? [y/N]: "
if /i "!MAKE_ADMIN!"=="y" call npm run create-admin

echo.
if defined DB_WARNING (
  echo Setup finished, but the database still needs attention. See the message above.
  goto end
)
echo Setup finished.
set "START_NOW=y"
set /p "START_NOW=Start TechCare now? [Y/n]: "
if /i "!START_NOW!"=="n" goto end
goto start

:start
if not exist "node_modules" (
  echo Dependencies are not installed yet. Run this again and choose option 2.
  goto fail
)
if not exist ".env.local" (
  echo Settings are missing. Run this again and choose option 2.
  goto fail
)
call :find_ollama
if defined OLLAMA call :start_ollama
echo.
echo Starting TechCare. Open http://127.0.0.1:3000 in your browser when it says Ready.
echo Press Ctrl+C to stop.
call npm run dev
goto end

:find_ollama
set "OLLAMA="
for /f "delims=" %%p in ('where ollama 2^>nul') do if not defined OLLAMA set "OLLAMA=%%p"
if not defined OLLAMA if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" set "OLLAMA=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
exit /b 0

:start_ollama
curl -s -o nul http://127.0.0.1:11434/api/tags >nul 2>nul
if not errorlevel 1 exit /b 0
echo Starting Ollama...
start "Ollama" /min "%OLLAMA%" serve
for /l %%i in (1,1,20) do (
  timeout /t 1 /nobreak >nul
  curl -s -o nul http://127.0.0.1:11434/api/tags >nul 2>nul
  if not errorlevel 1 exit /b 0
)
echo Ollama did not start. The assistant will use built-in help only.
exit /b 0

:fail
echo.
pause
exit /b 1

:end
endlocal
