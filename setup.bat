@echo off
rem TechCare launcher for Windows. Double-click it, or run "setup.bat 1", "setup.bat 2", or "setup.bat 3".
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title TechCare

rem Logo colours as 24-bit ANSI: blue #0a68fc and teal #00cacc. Set NO_COLOR to turn them off.
for /f %%e in ('echo prompt $E^| cmd') do set "ESC=%%e"
if defined NO_COLOR set "ESC="
if defined ESC (
  set "BLUE=!ESC![38;2;10;104;252m"
  set "TEAL=!ESC![38;2;0;202;204m"
  set "WARN=!ESC![38;2;245;166;35m"
  set "ERR=!ESC![38;2;235;87;87m"
  set "BOLD=!ESC![1m"
  set "RESET=!ESC![0m"
)

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
  echo   !BOLD!!BLUE!Tech!TEAL!Care!RESET!
  echo   !BLUE!--------!RESET!
  echo   !TEAL!1.!RESET! Start TechCare !BLUE![default]!RESET!
  echo   !TEAL!2.!RESET! Set up everything: dependencies, settings, database, and local AI
  echo   !TEAL!3.!RESET! Share online at your Cloudflare domain
  echo.
  set /p "CHOICE=Choose 1, 2, or 3 and press Enter [1]: "
)
if "!CHOICE!"=="2" goto setup
if "!CHOICE!"=="3" goto share
goto start

rem ---------------------------------------------------------------- option 2
:setup
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo !ERR!Node.js 24 or later is required. Install it from https://nodejs.org/ and run setup again.!RESET!
  goto fail
)
for /f "delims=" %%v in ('node -p "process.versions.node.split('.')[0]"') do set "NODE_MAJOR=%%v"
if !NODE_MAJOR! LSS 24 (
  echo !ERR!Node.js 24 or later is required. Install it from https://nodejs.org/ and run setup again.!RESET!
  goto fail
)
rem Reinstalling packages while TechCare runs fails on locked files and leaves them half-deleted.
call :running
if defined RUNNING (
  echo !ERR!TechCare is running on port !RUNNING!. Stop it first with Ctrl+C in its window, then run option 2 again.!RESET!
  goto fail
)

echo !BLUE![1/5]!RESET! Installing dependencies...
call npm ci
if errorlevel 1 (
  echo !ERR!Installing dependencies failed. Close anything using this folder and run option 2 again.!RESET!
  goto fail
)

echo.
echo !BLUE![2/5]!RESET! Creating local settings...
if exist ".env.local" (
  echo Kept your existing .env.local.
) else (
  copy /y ".env.example" ".env.local" >nul
  echo Created .env.local from .env.example.
)

echo.
echo !BLUE![3/5]!RESET! Preparing the database...
call node scripts\setup-database.mjs
if errorlevel 1 (
  set "DB_WARNING=1"
  echo !WARN!The database is not ready yet. Fix the message above, then run option 2 again.!RESET!
)

echo.
echo !BLUE![4/5]!RESET! Setting up the local AI assistant...
call :find_ollama
if not defined OLLAMA (
  where winget >nul 2>nul
  if not errorlevel 1 (
    echo Ollama is not installed. Installing it with winget...
    winget install --id Ollama.Ollama -e --silent --accept-source-agreements --accept-package-agreements
    call :find_ollama
  )
)
if not defined OLLAMA (
  echo !WARN!Ollama could not be installed automatically. Download it from https://ollama.com/download,!RESET!
  echo !WARN!then run option 2 again. Until then the assistant uses built-in help only.!RESET!
) else (
  call :start_ollama
  echo Downloading the AI models. The first download is about 2 GB and can take a while...
  "!OLLAMA!" pull !MODEL!
  "!OLLAMA!" pull !EMBED_MODEL!
)

echo.
echo !BLUE![5/5]!RESET! Administrator account
set "MAKE_ADMIN=n"
set /p "MAKE_ADMIN=Create an administrator account now? [y/N]: "
if /i "!MAKE_ADMIN!"=="y" call npm run create-admin

echo.
if defined DB_WARNING (
  echo !WARN!Setup finished, but the database still needs attention. See the message above.!RESET!
  goto end
)
echo !TEAL!Setup finished.!RESET!
set "START_NOW=y"
set /p "START_NOW=Start TechCare now? [Y/n]: "
if /i "!START_NOW!"=="n" goto end
goto start

rem ---------------------------------------------------------------- option 1
:start
if not exist "node_modules\@next\env" (
  echo !ERR!Dependencies are not installed yet. Run this again and choose option 2.!RESET!
  goto fail
)
if not exist ".env.local" (
  echo !ERR!Settings are missing. Run this again and choose option 2.!RESET!
  goto fail
)
call :find_ollama
if defined OLLAMA call :start_ollama
echo.
echo !TEAL!Starting TechCare.!RESET! Open !BLUE!http://127.0.0.1:3000!RESET! in your browser when it says Ready.
echo Press Ctrl+C to stop.
call npm run dev
goto end

rem ---------------------------------------------------------------- option 3
:share
if not exist "node_modules\@next\env" (
  echo !ERR!TechCare is not set up yet. Run this again and choose option 2 first.!RESET!
  goto fail
)
echo.
echo !BLUE![1/5]!RESET! Checking the sharing settings...
call node scripts\setup-sharing.mjs
if errorlevel 1 goto fail
set "PUBLIC_ORIGIN="
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env.production.local") do (
  if "%%a"=="TECHCARE_ORIGIN" set "PUBLIC_ORIGIN=%%b"
)
set "PUBLIC_HOST=!PUBLIC_ORIGIN:https://=!"

echo.
echo !BLUE![2/5]!RESET! Checking Cloudflare Tunnel...
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
  echo !ERR!Install cloudflared from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/!RESET!
  echo !ERR!then run option 3 again.!RESET!
  goto fail
)
if not exist "%USERPROFILE%\.cloudflared\cert.pem" (
  echo A browser window will open. Sign in to Cloudflare and choose !TEAL!!PUBLIC_HOST!!RESET!.
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
echo !BLUE![3/5]!RESET! Starting the local AI assistant if available...
call :find_ollama
if defined OLLAMA call :start_ollama

echo.
echo !BLUE![4/5]!RESET! Building the production version...
call npm run build
if errorlevel 1 goto fail

echo.
echo !BLUE![5/5]!RESET! Sharing TechCare at !TEAL!!PUBLIC_ORIGIN!!RESET!
echo Keep this window and the "TechCare tunnel" window open while people use it.
echo Press Ctrl+C here to stop, then close the tunnel window.
start "TechCare tunnel" /min "!CLOUDFLARED!" tunnel run --url http://127.0.0.1:3100 techcare
set "PORT=3100"
call npm start
goto end

rem ---------------------------------------------------------------- helpers
:running
set "RUNNING="
for %%p in (3000 3100) do (
  netstat -ano | findstr /r /c:"127\.0\.0\.1:%%p .*LISTENING" >nul && if not defined RUNNING set "RUNNING=%%p"
)
exit /b 0

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
echo !WARN!Ollama did not start. The assistant will use built-in help only.!RESET!
exit /b 0

:find_cloudflared
set "CLOUDFLARED="
for /f "delims=" %%p in ('where cloudflared 2^>nul') do if not defined CLOUDFLARED set "CLOUDFLARED=%%p"
if not defined CLOUDFLARED if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "CLOUDFLARED=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
if not defined CLOUDFLARED if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CLOUDFLARED=%ProgramFiles%\cloudflared\cloudflared.exe"
exit /b 0

:fail
echo.
pause
exit /b 1

:end
endlocal
