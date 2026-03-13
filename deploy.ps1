# CricketLive Pro - Firebase Deployment Script
Write-Host "Starting Firebase deployment..." -ForegroundColor Green

# Check if Firebase CLI is installed
if (!(Get-Command "firebase" -ErrorAction SilentlyContinue)) {
    Write-Host "Firebase CLI is not installed. Installing..." -ForegroundColor Yellow
    npm install -g firebase-tools
}

# Login to Firebase (uncomment if needed)
# firebase login

# Deploy to Firebase
Write-Host "Deploying to Firebase..." -ForegroundColor Cyan
firebase deploy --only hosting,database

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Access your website at:" -ForegroundColor Yellow
Write-Host "Main Site: https://cricketsix26.web.app" -ForegroundColor Cyan
Write-Host "Admin Panel: https://cricketsix26.web.app/admin.html" -ForegroundColor Cyan
