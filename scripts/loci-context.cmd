@echo off
rem Native Windows fallback launcher for instruction-only startup.
rem Codex hooks call the Node builder directly; this remains useful when hooks
rem are disabled or waiting for trust review.
where node >nul 2>nul
if errorlevel 1 exit /b 0
node "%~dp0loci-context.js" "%~dp0.." "%CD%"
exit /b 0
