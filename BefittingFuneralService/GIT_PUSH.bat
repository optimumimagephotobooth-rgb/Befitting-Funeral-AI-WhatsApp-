@echo off
REM Git Push Script for Befitting Funeral Service
REM Run this after Git is installed and in PATH

cd /d "C:\Users\photo\.cursor\projects\BefittingFuneralService"

REM Initialize repository
git init

REM Add all files
git add .

REM Commit
git commit -m "first commit: Complete WhatsApp AI system with Cloud API integration"

REM Set main branch
git branch -M main

REM Add remote
git remote add origin https://github.com/optimumimagephotobooth-rgb/Befitting-Funeral-AI-WhatsApp-.git

REM Push to GitHub
git push -u origin main

echo ✅ Push complete!
pause

