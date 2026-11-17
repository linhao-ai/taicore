@echo off
chcp 65001 >nul
setlocal
rem WeDAO silent extension updater
set "EXTHOME=%APPDATA%\WeDAO\ext"
set "UPD=%EXTHOME%\updater.mjs"
if not exist "%UPD%" exit /b 0
set "NODE_EXE="
if exist "%~dp0..\vendor\node\node.exe" set "NODE_EXE=%~dp0..\vendor\node\node.exe"
if defined NODE_EXE goto run
if exist "%~dp0vendor\node\node.exe" set "NODE_EXE=%~dp0vendor\node\node.exe"
if defined NODE_EXE goto run
where node >nul 2>nul && set "NODE_EXE=node"
if defined NODE_EXE goto run
exit /b 0
:run
"%NODE_EXE%" "%UPD%" --quiet
exit /b 0
