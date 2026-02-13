# 🔧 QuickGif - Guide de Dépannage

Ce guide vous aide à résoudre les problèmes courants avec QuickGif.

---

## 📑 Table des matières

1. [Problèmes d'installation](#problèmes-dinstallation)
2. [Problèmes de sélection](#problèmes-de-sélection)
3. [Problèmes d'enregistrement](#problèmes-denregistrement)
4. [Problèmes de génération GIF](#problèmes-de-génération-gif)
5. [Problèmes de performance](#problèmes-de-performance)
6. [Erreurs courantes](#erreurs-courantes)

---

## 🚨 Problèmes d'installation

### ❌ "Manifest file is missing or unreadable"

**Cause** : Le fichier manifest.json est invalide ou introuvable

**Solution** :
```powershell
# Vérifiez que manifest.json existe
cd C:\Users\damie\Giffeur
ls manifest.json

# Vérifiez la syntaxe JSON
# Utilisez un validateur : https://jsonlint.com
```

### ❌ "Failed to load extension"

**Cause** : Fichiers manquants ou structure incorrecte

**Solution** :
```powershell
# Vérifiez tous les fichiers requis
cd C:\Users\damie\Giffeur

# Fichiers principaux
ls manifest.json, popup.html, popup.css, popup.js
ls content.js, content.css, background.js

# Librairie gif.js
ls lib\gif.js, lib\gif.worker.js

# Icônes
ls icons\icon16.png, icons\icon48.png, icons\icon128.png
```

### ❌ Icons manquantes

**Cause** : Fichiers PNG introuvables dans le dossier icons/

**Solution** :
```powershell
# Option 1 : Télécharger automatiquement
.\setup.ps1

# Option 2 : Créer manuellement
# Utilisez un outil comme GIMP, Photoshop, ou en ligne :
# - https://favicon.io
# - https://realfavicongenerator.net
```

---

## 🎯 Problèmes de sélection

### ❌ L'overlay ne s'affiche pas

**Cause** : content.js non injecté ou bloqué

**Solution** :
1. **Rechargez la page web** (F5 ou Ctrl+R)
2. **Vérifiez les permissions** :
   - Ouvrez `chrome://extensions/`
   - Cliquez sur "Détails" sous QuickGif
   - Vérifiez que "Accès au site" est activé
3. **Réinjectez le content script** :
   - Rechargez l'extension (icône refresh dans chrome://extensions/)
   - Rechargez la page web

### ❌ "Cannot read properties of undefined"

**Cause** : content.js n'est pas chargé sur la page

**Solution** :
```javascript
// Vérifiez dans la console de la page (F12)
// Si vous voyez des erreurs liées à content.js :

// 1. Rechargez l'extension
// 2. Actualisez la page
// 3. Ouvrez la popup et cliquez "Sélectionner la zone"
```

### ❌ La sélection est trop petite

**Cause** : Zone inférieure à 50×50 pixels

**Solution** :
- Dessinez un rectangle plus grand
- La taille minimale est **50×50 pixels**
- La notification vous indiquera si la zone est trop petite

### ❌ ESC ne fonctionne pas

**Cause** : Événement clavier non capturé

**Solution** :
1. Cliquez sur la page pour lui donner le focus
2. Appuyez sur ESC
3. Si ça ne marche toujours pas, fermez manuellement l'extension

---

## 🎬 Problèmes d'enregistrement

### ❌ "Impossible de démarrer l'enregistrement"

**Cause** : Permission de capture d'onglet refusée

**Solution** :
1. **Vérifiez les permissions** :
   ```json
   // Dans manifest.json, assurez-vous que :
   "permissions": ["tabCapture", "activeTab"]
   ```
2. **Rechargez l'extension**
3. **Réessayez la capture**

### ❌ L'enregistrement démarre mais aucun frame capturé

**Cause** : MediaStream non accessible ou zone invalide

**Solution** :
1. **Ouvrez la console du service worker** :
   - `chrome://extensions/`
   - QuickGif → "Inspect views: service worker"
2. **Vérifiez les logs** :
   ```
   Recording started
   Captured frame 1
   Captured frame 2
   ...
   ```
3. **Si aucun log** :
   - Rechargez l'extension
   - Sélectionnez une nouvelle zone
   - Réessayez

### ❌ L'indicateur d'enregistrement ne s'affiche pas

**Cause** : Message entre background et content non transmis

**Solution** :
```javascript
// Vérifiez dans la console de la page (F12)
// Vous devriez voir le message "showRecordingIndicator"

// Si absent :
// 1. Rechargez la page
// 2. Rechargez l'extension
// 3. Réessayez
```

---

## 🎨 Problèmes de génération GIF

### ❌ "gif.js not found" ou "Worker error"

**Cause** : Librairie gif.js manquante ou mal placée

**Solution** :
```powershell
# Vérifiez que les fichiers existent
ls lib\gif.js
ls lib\gif.worker.js

# Si manquants, téléchargez :
.\setup.ps1

# OU manuellement :
cd lib
curl -o gif.js https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js
curl -o gif.worker.js https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js
```

### ❌ La génération est très lente

**Cause** : Trop de frames ou qualité trop élevée

**Solution** :
| Paramètre | Valeur recommandée |
|-----------|-------------------|
| FPS | 10-15 (au lieu de 30) |
| Qualité | Basse ou Moyenne |
| Durée | < 10 secondes |
| Zone | < 800×600 px |

### ❌ "Out of memory" ou crash du navigateur

**Cause** : Trop de frames en mémoire

**Solution** :
1. **Réduisez la durée d'enregistrement** (< 10s)
2. **Réduisez la zone sélectionnée** (< 640×480)
3. **Réduisez le FPS** (10-15)
4. **Fermez les autres onglets Chrome**

### ❌ Le GIF n'est pas téléchargé

**Cause** : Permissions de téléchargement manquantes

**Solution** :
1. **Vérifiez les permissions** :
   ```json
   "permissions": ["downloads"]
   ```
2. **Vérifiez les paramètres Chrome** :
   - Allez dans `chrome://settings/downloads`
   - Assurez-vous que le téléchargement est autorisé
3. **Rechargez l'extension**

---

## ⚡ Problèmes de performance

### 🐌 L'extension ralentit Chrome

**Cause** : Trop de ressources utilisées

**Solution** :
1. **Réduisez le FPS** à 10-15
2. **Réduisez la qualité** à "Basse"
3. **Sélectionnez une zone plus petite**
4. **Fermez les autres onglets**
5. **Redémarrez Chrome**

### 🐌 La capture est saccadée

**Cause** : FPS trop élevé pour les performances système

**Solution** :
```
Recommandations par puissance système :

🖥️ PC puissant (16GB+ RAM)
- FPS : 20-30
- Qualité : Haute
- Zone : 1024×768 max

💻 PC moyen (8GB RAM)
- FPS : 15-20
- Qualité : Moyenne
- Zone : 800×600 max

🖥️ PC faible (< 8GB RAM)
- FPS : 10-15
- Qualité : Basse
- Zone : 640×480 max
```

---

## ⚠️ Erreurs courantes

### "Cannot access chrome:// URLs"

**Cause** : Tentative de capture sur pages système Chrome

**Solution** :
- Les pages `chrome://`, `chrome-extension://`, etc. ne peuvent pas être capturées
- Utilisez QuickGif uniquement sur des pages web normales

### "Uncaught TypeError: Cannot read property..."

**Cause** : Variable undefined dans le code

**Solution** :
1. Ouvrez la console (F12)
2. Notez l'erreur complète
3. Rechargez l'extension
4. Rechargez la page
5. Si l'erreur persiste, signalez-la comme bug

### "DOMException: The play() request was interrupted"

**Cause** : Problème de lecture vidéo lors de la capture

**Solution** :
- Ceci est un avertissement, pas une erreur bloquante
- La capture devrait fonctionner normalement
- Si la capture échoue, réessayez

---

## 🔍 Diagnostic avancé

### Vérifier l'état de l'extension

```javascript
// Console de la page (F12)
chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
  console.log('Extension status:', response);
});
```

### Vérifier les messages entre composants

```javascript
// Console du service worker
// chrome://extensions/ → QuickGif → "service worker"

// Vous devriez voir :
// "Recording started"
// "Captured frame X"
// "Recording stopped"
// "Generating GIF from X frames"
```

### Réinitialisation complète

```powershell
# 1. Supprimez l'extension de Chrome
# chrome://extensions/ → Supprimer QuickGif

# 2. Supprimez les données de l'extension
# Chrome → Paramètres → Confidentialité → Effacer les données

# 3. Rechargez l'extension
# chrome://extensions/ → Charger l'extension
```

---

## 📞 Support

Si aucune solution ne fonctionne :

1. **Collectez les informations** :
   - Version de Chrome : `chrome://version/`
   - Système d'exploitation
   - Message d'erreur complet (console)
   - Captures d'écran

2. **Ouvrez une issue** sur GitHub avec :
   - Description du problème
   - Étapes pour reproduire
   - Logs de la console
   - Configuration système

3. **Consultez les issues existantes** :
   - [GitHub Issues](https://github.com/yourusername/quickgif/issues)

---

## ✅ Checklist de dépannage rapide

Avant de signaler un bug, vérifiez :

- [ ] Extension à jour (dernière version)
- [ ] Chrome à jour (version 88+)
- [ ] Tous les fichiers présents (manifest, lib, icons)
- [ ] Permissions accordées
- [ ] Page web rechargée (F5)
- [ ] Extension rechargée
- [ ] Console vérifiée (pas d'erreur JavaScript)
- [ ] Paramètres réduits (FPS 15, qualité moyenne)

---

**La plupart des problèmes se résolvent en rechargeant l'extension et la page !** 🔄
