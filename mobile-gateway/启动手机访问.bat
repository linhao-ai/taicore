@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "NODE_EXE="
if exist "%~dp0..\vendor\node\node.exe" set "NODE_EXE=%~dp0..\vendor\node\node.exe"
if defined NODE_EXE goto run
if exist "%~dp0..\..\vendor\node\node.exe" set "NODE_EXE=%~dp0..\..\vendor\node\node.exe"
if defined NODE_EXE goto run
where node >nul 2>nul && set "NODE_EXE=node"
if defined NODE_EXE goto run
echo 未找到 Node 运行时。
pause
exit /b 1

:run
start "" http://127.0.0.1:8766
"%NODE_EXE%" server.mjs
pause