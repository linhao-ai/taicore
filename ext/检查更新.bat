@echo off
chcp 65001 >nul
setlocal
set "EXTHOME=%APPDATA%\WeDAO\ext"
echo 正在检查更新...
call "%~dp0run-updater.cmd"
echo.
echo 完成。日志：%EXTHOME%\update.log
if exist "%EXTHOME%\update.log" start "" notepad "%EXTHOME%\update.log"
pause
