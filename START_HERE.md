# 🎬 QuickGif - Commencez Ici !

Bienvenue dans **QuickGif**, votre extension Chrome moderne pour capturer des GIFs animés en un clic !

---

## 🚀 Installation Rapide (3 minutes)

### ✅ Ce qui est déjà fait

- ✅ Tous les fichiers source créés
- ✅ gif.js et gif.worker.js téléchargés
- ✅ Documentation complète

### ⚡ Ce qu'il reste à faire (2 minutes)

#### 1️⃣ Créer les icônes (30 secondes)

**Ouvrez** `create-icons.html` dans votre navigateur :
```powershell
start create-icons.html
```

**Cliquez** sur "Download All" et placez les 3 fichiers PNG dans `icons/`

#### 2️⃣ Charger dans Chrome (30 secondes)

1. Ouvrez Chrome : `chrome://extensions/`
2. Activez "Mode développeur"
3. Cliquez "Charger l'extension non empaquetée"
4. Sélectionnez le dossier `C:\Users\damie\Giffeur`

#### 3️⃣ Premier test (1 minute)

1. Cliquez sur l'icône QuickGif
2. "Sélectionner la zone"
3. Dessinez un rectangle
4. "Enregistrer (3s)"
5. Attendez 5 secondes
6. "Arrêter"
7. 🎉 **Votre GIF est téléchargé !**

---

## 📚 Documentation

### 🏃 Pour commencer rapidement
➡️ **[QUICKSTART.md](QUICKSTART.md)** - Guide de démarrage rapide (5 min)

### 📖 Pour tout comprendre
➡️ **[README.md](README.md)** - Documentation complète

### 🔧 Pour résoudre des problèmes
➡️ **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Guide de dépannage

### 📦 Pour l'installation détaillée
➡️ **[INSTALLATION.md](INSTALLATION.md)** - Instructions pas à pas

### 🏗️ Pour les développeurs
➡️ **[ARCHITECTURE.md](ARCHITECTURE.md)** - Architecture technique

### 🚀 Pour les dernières étapes
➡️ **[FINAL_SETUP.md](FINAL_SETUP.md)** - Finalisation de l'installation

---

## 🎯 Fonctionnalités Principales

✨ **Sélection intuitive** - Cliquez et glissez pour définir la zone
⚡ **Performance optimisée** - Encodage avec Web Workers
🎨 **Interface moderne** - Design glassmorphism épuré
🎛️ **Personnalisable** - FPS et qualité ajustables
💾 **Export automatique** - Téléchargement avec horodatage
📊 **Retours visuels** - Progression et notifications

---

## 🛠️ Structure du Projet

```
Giffeur/
├── 📄 manifest.json          # Configuration
├── 🎨 popup.html/css/js      # Interface
├── 📝 content.js/css         # Sélection de zone
├── 🔧 background.js          # Capture & encodage
├── 📁 lib/                   # gif.js
├── 📁 icons/                 # Icônes (à créer)
└── 📚 *.md                   # Documentation
```

---

## ⚙️ Configuration Recommandée

### Pour les GIFs légers (réseaux sociaux)
- **FPS** : 10-15
- **Qualité** : Basse
- **Durée** : 2-5 secondes
- **Zone** : 400×300 px

### Pour les démos de qualité
- **FPS** : 20-30
- **Qualité** : Haute
- **Durée** : 5-10 secondes
- **Zone** : 800×600 px

---

## 🎨 Personnalisation Rapide

### Changer les couleurs

Éditez `popup.css` :
```css
:root {
  --primary: #6366f1;     /* Couleur principale */
  --success: #10b981;     /* Couleur succès */
  --danger: #ef4444;      /* Couleur enregistrement */
}
```

### Modifier le FPS par défaut

Éditez `popup.html` ligne 63 :
```html
<option value="20" selected>20 fps</option>
```

---

## 🆘 Besoin d'Aide ?

### Problème d'installation
➡️ Consultez [INSTALLATION.md](INSTALLATION.md)

### Problème technique
➡️ Consultez [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Question d'architecture
➡️ Consultez [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 🏆 Quick Win

**Testez immédiatement avec ces étapes** :

```powershell
# 1. Créez les icônes
start create-icons.html
# Téléchargez et placez dans icons/

# 2. Ouvrez Chrome
start chrome chrome://extensions/

# 3. Activez "Mode développeur" et chargez le dossier Giffeur

# 4. Testez sur YouTube !
```

---

## 📊 Checklist de Vérification

Avant de charger l'extension, vérifiez :

- [ ] `lib/gif.js` existe
- [ ] `lib/gif.worker.js` existe
- [ ] `icons/icon16.png` existe
- [ ] `icons/icon48.png` existe
- [ ] `icons/icon128.png` existe
- [ ] `manifest.json` existe
- [ ] Tous les autres fichiers .js/.html/.css existent

---

## 🎓 Prochaines Étapes

1. ✅ **Installer** - Suivez [FINAL_SETUP.md](FINAL_SETUP.md)
2. 🎯 **Tester** - Capturez votre premier GIF
3. 🎨 **Personnaliser** - Ajustez les couleurs et paramètres
4. 📖 **Apprendre** - Lisez la documentation complète
5. 🚀 **Utiliser** - Capturez des GIFs au quotidien !

---

## 💡 Astuces Pro

### Capturer une animation CSS
1. Trouvez une animation sur [CodePen](https://codepen.io)
2. Sélectionnez uniquement la zone animée
3. Utilisez 20-30 FPS

### Créer un tutoriel
1. Préparez les étapes à montrer
2. Sélectionnez la zone de travail
3. Enregistrez chaque action lentement
4. FPS 15, qualité moyenne

### Signaler un bug
1. Capturez le bug en action
2. GIF court (5-10s)
3. Ajoutez à votre ticket GitHub

---

## 🎉 Vous êtes prêt !

**QuickGif est prêt à l'emploi !**

➡️ **Commencez par [FINAL_SETUP.md](FINAL_SETUP.md)** pour finaliser l'installation

---

## 📞 Support

- 📖 Documentation complète dans ce dossier
- 🐛 Issues GitHub : [github.com/yourusername/quickgif/issues](https://github.com/yourusername/quickgif/issues)
- 📧 Email : your.email@example.com

---

## 📄 Licence

Ce projet est sous licence MIT. Libre à vous de l'utiliser, le modifier et le distribuer.

---

**Développé avec ❤️ pour simplifier la capture de GIFs**

🎬 Bonne capture !
