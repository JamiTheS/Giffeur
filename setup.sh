#!/bin/bash

# QuickGif - Script d'installation automatique (Linux/Mac)
# Execute this script to automatically download dependencies

echo "========================================"
echo "  QuickGif - Installation automatique  "
echo "========================================"
echo ""

# Check if running in correct directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le dossier Giffeur"
    echo "   Utilisez: cd ~/Giffeur"
    exit 1
fi

echo "✓ Dossier du projet détecté"
echo ""

# Step 1: Download gif.js library
echo "📦 Étape 1: Téléchargement de gif.js..."

mkdir -p lib

echo "   Téléchargement de gif.js..."
if curl -sS -o lib/gif.js https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js; then
    echo "   ✓ gif.js téléchargé"
else
    echo "   ❌ Erreur lors du téléchargement de gif.js"
    exit 1
fi

echo "   Téléchargement de gif.worker.js..."
if curl -sS -o lib/gif.worker.js https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js; then
    echo "   ✓ gif.worker.js téléchargé"
else
    echo "   ❌ Erreur lors du téléchargement de gif.worker.js"
    exit 1
fi

echo ""

# Step 2: Create placeholder icons
echo "🎨 Étape 2: Création des icônes..."

mkdir -p icons

echo "   Téléchargement des icônes de placeholder..."

curl -sS -o icons/icon16.png "https://via.placeholder.com/16/6366f1/ffffff?text=QG" && echo "   ✓ icon16.png créé"
curl -sS -o icons/icon48.png "https://via.placeholder.com/48/6366f1/ffffff?text=QG" && echo "   ✓ icon48.png créé"
curl -sS -o icons/icon128.png "https://via.placeholder.com/128/6366f1/ffffff?text=QG" && echo "   ✓ icon128.png créé"

echo "   ℹ️  Note: Ce sont des icônes de placeholder. Remplacez-les par vos propres icônes."

echo ""

# Step 3: Verify installation
echo "🔍 Étape 3: Vérification de l'installation..."

all_files_present=true

required_files=(
    "manifest.json"
    "popup.html"
    "popup.css"
    "popup.js"
    "content.js"
    "content.css"
    "background.js"
    "lib/gif.js"
    "lib/gif.worker.js"
    "icons/icon16.png"
    "icons/icon48.png"
    "icons/icon128.png"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file"
    else
        echo "   ❌ $file MANQUANT"
        all_files_present=false
    fi
done

echo ""

# Final message
if [ "$all_files_present" = true ]; then
    echo "========================================"
    echo "  ✅ Installation terminée avec succès !  "
    echo "========================================"
    echo ""
    echo "Prochaines étapes :"
    echo "1. Ouvrez Chrome et allez à: chrome://extensions/"
    echo "2. Activez le 'Mode développeur' (toggle en haut à droite)"
    echo "3. Cliquez sur 'Charger l'extension non empaquetée'"
    echo "4. Sélectionnez ce dossier: $(pwd)"
    echo ""
    echo "📖 Consultez INSTALLATION.md pour plus de détails"
else
    echo "========================================"
    echo "  ⚠️  Installation incomplète  "
    echo "========================================"
    echo ""
    echo "Certains fichiers sont manquants. Veuillez les ajouter manuellement."
    echo "Consultez INSTALLATION.md pour les instructions détaillées."
fi

echo ""
