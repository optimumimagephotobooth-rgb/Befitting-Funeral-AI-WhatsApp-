#!/bin/bash
# Git Push Script for Befitting Funeral Service
# Run this after Git is installed and in PATH

cd "C:\Users\photo\.cursor\projects\BefittingFuneralService"

# Initialize repository
git init

# Add all files
git add .

# Commit
git commit -m "first commit: Complete WhatsApp AI system with Cloud API integration"

# Set main branch
git branch -M main

# Add remote
git remote add origin https://github.com/optimumimagephotobooth-rgb/Befitting-Funeral-AI-WhatsApp-.git

# Push to GitHub
git push -u origin main

echo "✅ Push complete!"

