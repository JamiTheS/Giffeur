# 📦 Guide d'Installation Détaillé - QuickGif

Ce guide vous accompagne pas à pas pour installer et tester l'extension QuickGif.

## 🎯 Vue d'ensemble

L'installation se fait en 3 étapes principales :
1. ✅ Télécharger et intégrer la librairie gif.js
2. ✅ Créer ou télécharger les icônes
3. ✅ Charger l'extension dans Chrome

**Temps estimé** : 5-10 minutes

---

## 📚 Étape 1 : Intégrer gif.js

### Option A : Téléchargement automatique (recommandé)

Ouvrez un terminal dans le dossier du projet et exécutez :

**Windows (PowerShell)** :
```powershell
cd C:\Users\damie\Giffeur\lib

# Télécharger gif.js
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js" -OutFile "gif.js"

# Télécharger gif.worker.js
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js" -OutFile "gif.worker.js"
```

**Windows (CMD)** :
```cmd
cd C:\Users\damie\Giffeur\lib
curl -o gif.js https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js
curl -o gif.worker.js https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js
```

**Linux/Mac** :
```bash
cd ~/Giffeur/lib
curl -o gif.js https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js
curl -o gif.worker.js https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js
```

### Option B : Téléchargement manuel

1. Visitez [https://github.com/jnordberg/gif.js/releases](https://github.com/jnordberg/gif.js/releases)
2. Téléchargez la dernière version
3. Extrayez les fichiers `gif.js` et `gif.worker.js` du dossier `dist/`
4. Placez-les dans `Giffeur/lib/`

### ✅ Vérification

Assurez-vous que votre structure ressemble à :
```
Giffeur/
├── lib/
│   ├── gif.js          ✅
│   └── gif.worker.js   ✅
```

---

## 🎨 Étape 2 : Créer les icônes

### Option A : Icônes de placeholder simples (rapide)

Créez des icônes basiques monochromes :

**Windows (PowerShell)** :
```powershell
cd C:\Users\damie\Giffeur\icons

# Télécharger des icônes de placeholder
Invoke-WebRequest -Uri "https://via.placeholder.com/16/6366f1/ffffff?text=QG" -OutFile "icon16.png"
Invoke-WebRequest -Uri "https://via.placeholder.com/48/6366f1/ffffff?text=QG" -OutFile "icon48.png"
Invoke-WebRequest -Uri "https://via.placeholder.com/128/6366f1/ffffff?text=QG" -OutFile "icon128.png"
```

### Option B : Icônes personnalisées (recommandé)

1. Utilisez un outil de design :
   - [Figma](https://figma.com) (gratuit)
   - [Canva](https://canva.com)
   - [GIMP](https://www.gimp.org/)
   - Adobe Illustrator/Photoshop

2. Créez 3 fichiers PNG avec les dimensions suivantes :
   - **icon16.png** : 16×16 pixels
   - **icon48.png** : 48×48 pixels
   - **icon128.png** : 128×128 pixels

3. **Suggestions de design** :
   - Utilisez un pictogramme représentant un GIF ou une caméra
   - Couleurs : Indigo (#6366f1) sur fond transparent
   - Style : Minimaliste et moderne
   - Format : PNG avec transparence

### Option C : Générateur d'icônes en ligne

1. Visitez [favicon.io](https://favicon.io) ou [realfavicongenerator.net](https://realfavicongenerator.net)
2. Uploadez un logo ou utilisez un emoji (🎬 ou 🎯)
3. Téléchargez les icônes générées
4. Renommez-les selon les tailles requises

### ✅ Vérification

```
Giffeur/
├── icons/
│   ├── icon16.png    ✅
│   ├── icon48.png    ✅
│   └── icon128.png   ✅
```

---

## 🚀 Étape 3 : Charger l'extension dans Chrome

### 3.1 - Activer le Mode Développeur

1. Ouvrez **Google Chrome**
2. Tapez dans la barre d'adresse : `chrome://extensions/`
3. En haut à droite, activez le toggle **"Mode développeur"**

![Mode développeur](https://developer.chrome.com/static/docs/extensions/get-started/tutorial/hello-world/image/extensions-page-e0d64d89a6acf_1920.png)

### 3.2 - Charger l'extension

1. Cliquez sur **"Charger l'extension non empaquetée"**
2. Sélectionnez le dossier `Giffeur`
3. L'extension apparaît dans la liste ! 🎉

![Extension chargée](https://i.imgur.com/extension-loaded.png)

### 3.3 - Épingler l'extension (optionnel)

1. Cliquez sur l'icône **puzzle** 🧩 dans la barre d'outils Chrome
2. Trouvez **QuickGif** dans la liste
3. Cliquez sur l'icône **épingle** 📌 pour l'ajouter à la barre d'outils

---

## 🧪 Étape 4 : Premier test

### Test de base

1. **Ouvrez une page web** (exemple : YouTube, Twitter, ou ce README)
2. **Cliquez sur l'icône QuickGif** dans la barre d'outils
3. La popup devrait s'ouvrir avec :
   - ✅ En-tête violet avec le logo
   - ✅ Carte de statut "Prêt à capturer"
   - ✅ Boutons de contrôle
   - ✅ Paramètres FPS et Qualité

### Test de sélection

1. Cliquez sur **"Sélectionner la zone"**
2. La page devient sombre avec un overlay
3. **Cliquez et glissez** pour créer un rectangle
4. Vérifiez que :
   - ✅ Les dimensions s'affichent en temps réel
   - ✅ Le rectangle est visible avec une bordure bleue
   - ✅ Notification de succès après sélection

### Test d'enregistrement

1. Sélectionnez une zone contenant du mouvement (vidéo, animation CSS)
2. Cliquez sur **"Enregistrer (3s)"**
3. Attendez le compte à rebours
4. Laissez enregistrer 5-10 secondes
5. Cliquez sur **"Arrêter"**
6. Attendez le traitement (barre de progression)
7. Le GIF se télécharge automatiquement ! 🎊

---

## ⚠️ Résolution de problèmes courants

### Problème 1 : "Erreur de chargement de l'extension"

**Cause** : Fichiers manquants ou manifest invalide

**Solution** :
1. Vérifiez que tous les fichiers sont présents
2. Vérifiez la console d'erreurs dans `chrome://extensions/`
3. Assurez-vous que `gif.js` et `gif.worker.js` sont dans `lib/`

### Problème 2 : "La popup ne s'ouvre pas"

**Cause** : popup.html manquant ou chemin incorrect

**Solution** :
1. Vérifiez que `popup.html` existe à la racine
2. Rechargez l'extension (icône de rafraîchissement ⟳)

### Problème 3 : "La sélection ne fonctionne pas"

**Cause** : content.js non injecté

**Solution** :
1. Rechargez la page web (F5)
2. Rechargez l'extension
3. Vérifiez les permissions dans manifest.json

### Problème 4 : "Erreur lors de la génération du GIF"

**Cause** : gif.js manquant ou worker introuvable

**Solution** :
1. Ouvrez la console du service worker :
   - `chrome://extensions/` → QuickGif → "Inspect views: service worker"
2. Vérifiez les erreurs JavaScript
3. Assurez-vous que `gif.worker.js` est accessible

### Problème 5 : "Performances très lentes"

**Cause** : FPS ou qualité trop élevés

**Solution** :
1. Réduisez le FPS à 10-15
2. Sélectionnez une zone plus petite
3. Réduisez la qualité à "Moyenne" ou "Basse"

---

## 🔍 Vérification complète

Utilisez cette checklist pour vous assurer que tout fonctionne :

### Structure des fichiers
- [ ] `manifest.json` présent
- [ ] `popup.html`, `popup.css`, `popup.js` présents
- [ ] `content.js`, `content.css` présents
- [ ] `background.js` présent
- [ ] `lib/gif.js` présent
- [ ] `lib/gif.worker.js` présent
- [ ] `icons/icon16.png` présent
- [ ] `icons/icon48.png` présent
- [ ] `icons/icon128.png` présent

### Tests fonctionnels
- [ ] Extension visible dans `chrome://extensions/`
- [ ] Popup s'ouvre correctement
- [ ] Overlay de sélection fonctionne
- [ ] Dimensions affichées en temps réel
- [ ] Compte à rebours visible
- [ ] Indicateur d'enregistrement visible
- [ ] Barre de progression fonctionne
- [ ] GIF téléchargé automatiquement
- [ ] Nom du fichier contient l'horodatage
- [ ] GIF lisible et de bonne qualité

---

## 📊 Recommandations de paramètres

### Pour des GIFs légers (partage web/social)
- **FPS** : 10-15
- **Qualité** : Basse ou Moyenne
- **Durée** : 2-5 secondes
- **Taille zone** : 400×300 px max

### Pour des GIFs de qualité (démonstrations)
- **FPS** : 20-30
- **Qualité** : Haute
- **Durée** : 5-10 secondes
- **Taille zone** : 800×600 px max

### Pour des tutoriels (captures longues)
- **FPS** : 15
- **Qualité** : Moyenne
- **Durée** : 10-30 secondes
- **Taille zone** : 640×480 px

---

## 🎓 Prochaines étapes

Maintenant que QuickGif est installé :

1. 📖 Consultez le [README.md](README.md) pour le guide d'utilisation complet
2. 🎨 Personnalisez les couleurs dans `popup.css`
3. ⚙️ Ajustez les paramètres par défaut dans `popup.js`
4. 🚀 Explorez les fonctionnalités avancées

---

## 💡 Astuces Pro

### Capturer une animation CSS
1. Ouvrez [CSS Animation Examples](https://codepen.io)
2. Sélectionnez uniquement la zone d'animation
3. Utilisez 20-30 FPS pour une fluidité maximale

### Capturer une vidéo YouTube
1. Lisez la vidéo en plein écran
2. Sélectionnez la zone du player
3. Enregistrez un segment court (3-5s)
4. Le son ne sera pas capturé (limitation actuelle)

### Réduire la taille du fichier
1. Sélectionnez la plus petite zone possible
2. Utilisez 10 FPS
3. Qualité "Basse"
4. Limitez la durée à 3-5 secondes

---

**✅ Installation terminée ! Bon capture de GIFs avec QuickGif ! 🎬**
