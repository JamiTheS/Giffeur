# QuickGif - Script d'installation automatique (PowerShell)
# Execute this script to automatically download dependencies

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  QuickGif - Installation automatique  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running in correct directory
if (!(Test-Path "manifest.json")) {
    Write-Host "❌ Erreur: Ce script doit être exécuté depuis le dossier Giffeur" -ForegroundColor Red
    Write-Host "   Utilisez: cd C:\Users\damie\Giffeur" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Dossier du projet détecté" -ForegroundColor Green
Write-Host ""

# Step 1: Download gif.js library
Write-Host "📦 Étape 1: Téléchargement de gif.js..." -ForegroundColor Yellow

if (!(Test-Path "lib")) {
    New-Item -ItemType Directory -Path "lib" | Out-Null
}

try {
    Write-Host "   Téléchargement de gif.js..." -ForegroundColor Gray
    Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js" -OutFile "lib\gif.js" -ErrorAction Stop
    Write-Host "   ✓ gif.js téléchargé" -ForegroundColor Green

    Write-Host "   Téléchargement de gif.worker.js..." -ForegroundColor Gray
    Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js" -OutFile "lib\gif.worker.js" -ErrorAction Stop
    Write-Host "   ✓ gif.worker.js téléchargé" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ Erreur lors du téléchargement: $_" -ForegroundColor Red
    Write-Host "   Veuillez télécharger manuellement depuis https://github.com/jnordberg/gif.js" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 2: Create placeholder icons
Write-Host "🎨 Étape 2: Création des icônes..." -ForegroundColor Yellow

if (!(Test-Path "icons")) {
    New-Item -ItemType Directory -Path "icons" | Out-Null
}

try {
    Write-Host "   Téléchargement des icônes de placeholder..." -ForegroundColor Gray

    Invoke-WebRequest -Uri "https://via.placeholder.com/16/6366f1/ffffff?text=QG" -OutFile "icons\icon16.png" -ErrorAction Stop
    Write-Host "   ✓ icon16.png créé" -ForegroundColor Green

    Invoke-WebRequest -Uri "https://via.placeholder.com/48/6366f1/ffffff?text=QG" -OutFile "icons\icon48.png" -ErrorAction Stop
    Write-Host "   ✓ icon48.png créé" -ForegroundColor Green

    Invoke-WebRequest -Uri "https://via.placeholder.com/128/6366f1/ffffff?text=QG" -OutFile "icons\icon128.png" -ErrorAction Stop
    Write-Host "   ✓ icon128.png créé" -ForegroundColor Green

    Write-Host "   ℹ️  Note: Ce sont des icônes de placeholder. Remplacez-les par vos propres icônes pour un meilleur rendu." -ForegroundColor Cyan
}
catch {
    Write-Host "   ⚠️  Avertissement: Impossible de créer les icônes automatiquement" -ForegroundColor Yellow
    Write-Host "   Créez manuellement icon16.png, icon48.png, icon128.png dans le dossier icons/" -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Verify installation
Write-Host "🔍 Étape 3: Vérification de l'installation..." -ForegroundColor Yellow

$allFilesPresent = $true

$requiredFiles = @(
    "manifest.json",
    "popup.html",
    "popup.css",
    "popup.js",
    "content.js",
    "content.css",
    "background.js",
    "lib\gif.js",
    "lib\gif.worker.js",
    "icons\icon16.png",
    "icons\icon48.png",
    "icons\icon128.png"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file MANQUANT" -ForegroundColor Red
        $allFilesPresent = $false
    }
}

Write-Host ""

# Final message
if ($allFilesPresent) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ Installation terminée avec succès !  " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes :" -ForegroundColor Cyan
    Write-Host "1. Ouvrez Chrome et allez à: chrome://extensions/" -ForegroundColor White
    Write-Host "2. Activez le 'Mode développeur' (toggle en haut à droite)" -ForegroundColor White
    Write-Host "3. Cliquez sur 'Charger l'extension non empaquetée'" -ForegroundColor White
    Write-Host "4. Sélectionnez ce dossier: $PWD" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 Consultez INSTALLATION.md pour plus de détails" -ForegroundColor Yellow
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ⚠️  Installation incomplète  " -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Certains fichiers sont manquants. Veuillez les ajouter manuellement." -ForegroundColor Yellow
    Write-Host "Consultez INSTALLATION.md pour les instructions détaillées." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Appuyez sur une touche pour quitter..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
