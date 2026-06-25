@echo off
cd /d C:\Users\johnson\.qclaw\workspace\guandan-game
call npx.cmd vite build
exit /b %ERRORLEVEL%
