@echo off
title FORGE UI
cd /d "%~dp0"
echo Starting FORGE UI...
npx tsx src\core\onboarding\cli.ts ui
pause
