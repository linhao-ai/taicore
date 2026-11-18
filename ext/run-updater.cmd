@echo off
chcp 65001 >nul
setlocal
rem WeDAO silent updater runner (lives in <install>\dsh-desktop\ext)
set "HERE=%~dp0"
set "EXTHOME=%APPDATA%\WeDAO\ext"
if not exist "%EXTHOME%" mkdir "%EXTHOME%" >nul 2>nul

rem Seed the working copy into %APPDATA% on first run (so it survives reinstall and can be replaced)
if not exist "%EXTHOME%\updater.mjs" (
  if exist "%HERE%updater.mjs" copy /y "%HERE%updater.mjs" "%EXTHOME%\updater.mjs" >nul 2>nul
)

rem Prefer the %APPDATA% copy (hot-updatable), fallback to bundled copy
set "UPD=%EXTHOME%\updater.mjs"
if not exist "%UPD%" set "UPD=%HERE%updater.mjs"
if not exist "%UPD%" exit /b 0

set "NODE_EXE="
if exist "%HERE%..\vendor\node\node.exe" set "NODE_EXE=%HERE%..\vendor\node\node.exe"
if defined NODE_EXE goto run
if exist "%HERE%vendor\node\node.exe" set "NODE_EXE=%HERE%vendor\node\node.exe"
if defined NODE_EXE goto run
where node >nul 2>nul && set "NODE_EXE=node"
if defined NODE_EXE goto run
exit /b 0
:run
"%NODE_EXE%" "%UPD%" --quiet
exit /b 0
