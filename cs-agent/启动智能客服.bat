@echo off
chcp 65001 >nul
setlocal

rem Prefer hot-updated copy under %APPDATA%\WeDAO\ext\<tool>, fallback to install dir
set "EXTDIR=%APPDATA%\WeDAO\ext\cs-agent"
if exist "%EXTDIR%\server.mjs" (
  set "ROOT=%EXTDIR%"
) else (
  set "ROOT=%~dp0"
)

rem Locate bundled Node runtime
set "NODE_EXE="
if exist "%~dp0..\vendor\node\node.exe" set "NODE_EXE=%~dp0..\vendor\node\node.exe"
if defined NODE_EXE goto run
if exist "%~dp0..\..\vendor\node\node.exe" set "NODE_EXE=%~dp0..\..\vendor\node\node.exe"
if defined NODE_EXE goto run
where node >nul 2>nul && set "NODE_EXE=node"
if defined NODE_EXE goto run
echo Node runtime not found. Please reinstall.
pause
exit /b 1

:run
rem Silent extension update (background, non-blocking)
if exist "%APPDATA%\WeDAO\ext\updater.mjs" start "" /min "%NODE_EXE%" "%APPDATA%\WeDAO\ext\updater.mjs" --quiet
start "" http://127.0.0.1:8794
cd /d "%ROOT%"
"%NODE_EXE%" server.mjs
pause
