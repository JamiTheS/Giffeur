# ⚡ QuickGif - Démarrage Rapide (5 minutes)

Ce guide vous permet d'installer et tester QuickGif en moins de 5 minutes.

## 🚀 Installation Express

### Windows (PowerShell)

Ouvrez PowerShell dans le dossier du projet et exécutez :

```powershell
.\setup.ps1
```

### Linux / Mac

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
chmod +x setup.sh
./setup.sh
```

Le script télécharge automatiquement :
- ✅ gif.js et gif.worker.js
- ✅ Icônes de placeholder

## 📦 Chargement dans Chrome

1. Ouvrez Chrome : `chrome://extensions/`
2. Activez **"Mode développeur"** (toggle en haut à droite)
3. Cliquez **"Charger l'extension non empaquetée"**
4. Sélectionnez le dossier `Giffeur`
5. ✅ L'extension est chargée !

## 🎯 Premier Test (30 secondes)

1. **Ouvrez YouTube** et lancez une vidéo
2. **Cliquez sur l'icône QuickGif** dans la barre d'outils
3. **Cliquez "Sélectionner la zone"**
4. **Dessinez un rectangle** autour de la vidéo
5. **Cliquez "Enregistrer (3s)"**
6. Attendez 5 secondes
7. **Cliquez "Arrêter"**
8. 🎉 **Votre GIF se télécharge automatiquement !**

## 🎨 Utilisation Basique

### Sélection de zone
```
Clic gauche + Glisser = Sélectionner une zone
ESC = Annuler
```

### Paramètres recommandés
| Usage | FPS | Qualité | Durée |
|-------|-----|---------|-------|
| Partage web | 10-15 | Basse | 2-5s |
| Démo produit | 15-20 | Moyenne | 5-10s |
| Tutoriel | 20-30 | Haute | 5-15s |

## ⚙️ Configuration Rapide

### Changer les couleurs

Éditez `popup.css` ligne 8-16 :

```css
:root {
  --primary: #6366f1;        /* Couleur principale */
  --primary-dark: #4f46e5;   /* Variante foncée */
}
```

### Modifier le FPS par défaut

Éditez `popup.html` ligne 63 :

```html
<option value="15" selected>15 fps</option>
<!-- Changez "selected" vers une autre option -->
```

## 🐛 Dépannage Express

### L'extension ne se charge pas
```powershell
# Vérifiez les fichiers manquants
cd C:\Users\damie\Giffeur
ls lib\      # Doit contenir gif.js et gif.worker.js
ls icons\    # Doit contenir icon16.png, icon48.png, icon128.png
```

### La sélection ne marche pas
1. Actualisez la page web (F5)
2. Rechargez l'extension dans `chrome://extensions/`

### Le GIF n'est pas généré
1. Ouvrez la console : `chrome://extensions/` → QuickGif → "service worker"
2. Vérifiez les erreurs JavaScript

## 📚 Documentation Complète

- 📖 [README.md](README.md) - Guide complet
- 📦 [INSTALLATION.md](INSTALLATION.md) - Installation détaillée
- 🔧 [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Résolution de problèmes

## 💡 Astuces Rapides

### GIF plus léger
- FPS: 10
- Qualité: Basse
- Zone: Plus petite
- Durée: < 5 secondes

### GIF haute qualité
- FPS: 30
- Qualité: Haute
- Zone: Taille souhaitée
- Durée: < 10 secondes

### Capturer une animation CSS
1. Ouvrez [CodePen](https://codepen.io)
2. Trouvez une animation
3. Sélectionnez uniquement la zone animée
4. Utilisez 20-30 FPS

## 🎓 Exemples d'Usage

### Démo de produit
```
Zone : 800×600 px
FPS  : 20
Qualité : Haute
Durée : 5-10s
```

### Tutoriel logiciel
```
Zone : 1024×768 px
FPS  : 15
Qualité : Moyenne
Durée : 10-20s
```

### Bug report
```
Zone : 640×480 px
FPS  : 15
Qualité : Moyenne
Durée : 5-10s
```

### Réseaux sociaux
```
Zone : 400×300 px
FPS  : 10
Qualité : Basse
Durée : 2-5s
```

## 🚀 Vous êtes prêt !

QuickGif est maintenant opérationnel. Bonne capture de GIFs ! 🎬

---

**Besoin d'aide ?** Consultez [INSTALLATION.md](INSTALLATION.md) pour plus de détails.
