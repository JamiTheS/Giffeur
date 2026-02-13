# 🔍 Guide de Debug - QuickGif

## 🐛 Problème : "Impossible de démarrer la sélection"

### ✅ Corrections appliquées

1. **Manifest.json** - Changé `run_at` de `document_idle` à `document_end`
2. **popup.js** - Ajouté injection de secours si le content script n'est pas chargé
3. **Gestion d'erreur** - Meilleure gestion des erreurs de communication

---

## 🔧 Comment tester les corrections

### Étape 1 : Recharger l'extension

1. Allez dans `chrome://extensions/`
2. Trouvez **QuickGif**
3. Cliquez sur l'icône **⟳ Recharger**

### Étape 2 : Recharger la page web

1. Allez sur n'importe quelle page (ex: google.com)
2. Appuyez sur **F5** pour recharger la page
3. Cliquez sur l'icône **QuickGif**
4. Cliquez sur **"Sélectionner la zone"**

### Étape 3 : Vérifier les logs

Si ça ne marche toujours pas :

1. **Ouvrez la console de la popup** :
   - Clic droit sur l'icône QuickGif → "Inspecter la popup"
   - Onglet **Console**
   - Regardez les erreurs

2. **Ouvrez la console de la page** :
   - Appuyez sur **F12**
   - Onglet **Console**
   - Regardez les erreurs

3. **Ouvrez la console du service worker** :
   - `chrome://extensions/`
   - QuickGif → "Inspect views: **service worker**"
   - Onglet **Console**

---

## 🚨 Erreurs courantes et solutions

### Erreur 1 : "Cannot access chrome:// URLs"

**Cause** : Vous essayez de capturer sur une page système Chrome

**Solution** :
- Allez sur une page web normale (google.com, youtube.com, etc.)
- QuickGif ne peut pas capturer les pages chrome://, chrome-extension://, etc.

### Erreur 2 : "Could not establish connection"

**Cause** : Le content script n'est pas chargé sur la page

**Solution** :
1. Rechargez l'extension (chrome://extensions/)
2. Rechargez la page web (F5)
3. Réessayez

### Erreur 3 : "Scripting is not enabled"

**Cause** : L'extension n'a pas les permissions nécessaires

**Solution** :
1. Vérifiez que le manifest.json contient :
   ```json
   "permissions": ["activeTab", "scripting", "storage", "downloads"]
   ```
2. Rechargez l'extension

### Erreur 4 : Rien ne se passe quand je clique

**Cause** : JavaScript bloqué ou conflit avec une autre extension

**Solution** :
1. Désactivez temporairement les autres extensions
2. Rechargez la page
3. Réessayez

---

## 🧪 Test de diagnostic

Suivez ce script de test :

```javascript
// 1. Ouvrez la console de la page (F12)
// 2. Collez ce code pour vérifier si le content script est chargé

chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
  console.log('Extension réponse:', response);
});

// Si vous voyez une erreur, le content script n'est pas chargé
```

---

## 📊 Checklist de vérification

Avant de signaler un bug, vérifiez :

- [ ] Extension rechargée (chrome://extensions/ → ⟳)
- [ ] Page web rechargée (F5)
- [ ] Vous êtes sur une page web normale (pas chrome://)
- [ ] Pas d'erreur dans la console (F12)
- [ ] manifest.json contient les bonnes permissions
- [ ] Les fichiers content.js et content.css existent
- [ ] Autres extensions désactivées (test)

---

## 🔍 Logs à vérifier

### Console de la popup (Inspect popup)

Vous devriez voir :
```
Content script not loaded, injecting manually...
```
OU
```
// Aucune erreur
```

### Console de la page (F12)

Vous devriez voir :
```
// Le content script s'initialise
QuickGif content script loaded
```

### Console du service worker

Vous devriez voir :
```
Recording started
Captured frame 1
Captured frame 2
...
```

---

## 🚀 Si tout échoue

### Solution 1 : Réinstallation propre

```powershell
# 1. Supprimez l'extension de Chrome
# chrome://extensions/ → Supprimer

# 2. Fermez Chrome complètement

# 3. Rechargez l'extension
# chrome://extensions/ → Charger l'extension non empaquetée
# Sélectionnez: C:\Users\damie\Giffeur
```

### Solution 2 : Test sur page simple

1. Créez un fichier `test.html` :
```html
<!DOCTYPE html>
<html>
<head><title>Test QuickGif</title></head>
<body>
  <h1>Page de test QuickGif</h1>
  <p>Ceci est une page de test simple.</p>
  <div style="width: 300px; height: 200px; background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);"></div>
</body>
</html>
```

2. Ouvrez ce fichier dans Chrome
3. Testez QuickGif dessus

### Solution 3 : Vérifiez les permissions

Dans Chrome :
1. `chrome://extensions/`
2. Cliquez sur **"Détails"** sous QuickGif
3. Vérifiez que :
   - **Accès au site** : "Sur tous les sites"
   - **Autorisations** : Toutes cochées

---

## 📞 Signaler un bug

Si rien ne fonctionne, créez une issue avec :

1. **Version de Chrome** : `chrome://version/`
2. **Système d'exploitation** : Windows/Mac/Linux
3. **URL testée** : La page où ça ne marche pas
4. **Logs de console** :
   - Console popup
   - Console page
   - Console service worker
5. **Captures d'écran** : Si possible

---

## ✅ Changements apportés

### v1.0.1 - Corrections

- [x] Changé `run_at: document_idle` → `document_end` dans manifest.json
- [x] Ajouté injection manuelle de secours dans popup.js
- [x] Amélioré la gestion d'erreurs
- [x] Ajouté des logs de debug
- [x] Ajouté sleep(100ms) après injection

### Fichiers modifiés

- `manifest.json` (ligne 31)
- `popup.js` (fonction `startSelection`)

---

**🎯 Suivez ce guide et l'extension devrait fonctionner !**
