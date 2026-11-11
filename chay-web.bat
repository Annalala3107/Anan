@echo off
title AnanQuiz - The Open-Source Smart Quiz App
cd /d "E:\AnanQuiz"
echo ========================================================
echo    Dang khoi dong AnanQuiz tai http://localhost:3000...
echo ========================================================
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"
npm.cmd run start
pause
