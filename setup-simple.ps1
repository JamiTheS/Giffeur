# QuickGif - Simple Setup Script
Write-Host "QuickGif - Installation" -ForegroundColor Cyan
Write-Host ""

# Check directory
if (!(Test-Path "manifest.json")) {
    Write-Host "Error: Run this script from the Giffeur folder" -ForegroundColor Red
    exit 1
}

Write-Host "Creating directories..." -ForegroundColor Yellow
if (!(Test-Path "lib")) { New-Item -ItemType Directory -Path "lib" | Out-Null }
if (!(Test-Path "icons")) { New-Item -ItemType Directory -Path "icons" | Out-Null }

Write-Host "Downloading gif.js..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js" -OutFile "lib\gif.js"
    Write-Host "  OK: gif.js" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: gif.js" -ForegroundColor Red
}

Write-Host "Downloading gif.worker.js..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js" -OutFile "lib\gif.worker.js"
    Write-Host "  OK: gif.worker.js" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: gif.worker.js" -ForegroundColor Red
}

Write-Host "Creating icons..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "https://via.placeholder.com/16/6366f1/ffffff?text=QG" -OutFile "icons\icon16.png"
    Invoke-WebRequest -Uri "https://via.placeholder.com/48/6366f1/ffffff?text=QG" -OutFile "icons\icon48.png"
    Invoke-WebRequest -Uri "https://via.placeholder.com/128/6366f1/ffffff?text=QG" -OutFile "icons\icon128.png"
    Write-Host "  OK: Icons created" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Icons" -ForegroundColor Red
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Load the extension in Chrome: chrome://extensions/" -ForegroundColor Cyan
