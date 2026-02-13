# 🔍 Debug : Overlay ne s'affiche pas

## 🎯 Problème actuel

Le popup disparaît mais l'overlay ne s'affiche pas sur korben.info

## ✅ Corrections appliquées

1. ✅ Le popup ne se ferme plus automatiquement
2. ✅ Logs de debug ajoutés partout
3. ✅ Vérification que l'overlay est bien initialisé

---

## 🧪 Test de debug

### Étape 1 : Recharger l'extension

```
chrome://extensions/ → QuickGif → ⟳ Recharger
```

### Étape 2 : Aller sur korben.info

```
https://korben.info
```

### Étape 3 : Ouvrir la console de la page

```
F12 → Onglet Console
```

### Étape 4 : Cliquer sur "Sélectionner la zone"

Dans la console, vous devriez voir :

```javascript
QuickGif received message: {action: "ping"}
Ping received, responding OK
QuickGif received message: {action: "startSelection"}
startSelection message received
QuickGif init called
Creating overlay... (ou "Overlay already exists")
Overlay created
startSelection called
overlay: <div id="quickgif-overlay">...</div>
Overlay display set to block
```

---

## 🐛 Messages d'erreur possibles

### Si vous voyez : "Overlay not initialized!"

**Cause** : L'overlay n'a pas été créé

**Solution** : Problème dans createOverlay()

### Si vous voyez : "overlay: null"

**Cause** : L'élément n'existe pas dans le DOM

**Solution** : Problème d'injection du script

### Si vous ne voyez AUCUN log

**Cause** : Le content script n'est pas chargé du tout

**Solution** :
1. Vérifiez que content.js existe
2. Rechargez l'extension
3. Rechargez la page
4. Réessayez

---

## 🔬 Test manuel dans la console

Une fois sur korben.info, ouvrez la console (F12) et tapez :

```javascript
// 1. Vérifier si l'overlay existe dans le DOM
console.log(document.getElementById('quickgif-overlay'));

// 2. Si null, le content script n'est pas chargé
// Si <div>, l'overlay existe

// 3. Vérifier le display
const overlay = document.getElementById('quickgif-overlay');
if (overlay) {
  console.log('Display:', overlay.style.display);
  console.log('Z-index:', overlay.style.zIndex);
}

// 4. Forcer l'affichage pour tester
if (overlay) {
  overlay.style.display = 'block';
  overlay.style.zIndex = '999999999';
}
```

---

## 📊 Ce que vous devriez voir

### Console de la popup (Inspect popup)

```
Content script not loaded, injecting manually...
```
OU simplement
```
Selection started successfully
```

### Console de la page (F12)

```
QuickGif received message: {action: "ping"}
Ping received, responding OK
QuickGif received message: {action: "startSelection"}
startSelection message received
QuickGif init called
Creating overlay...
Overlay created
startSelection called
overlay: <div id="quickgif-overlay">...</div>
Overlay display set to block
```

### Sur la page

- ✅ Un overlay sombre devrait couvrir toute la page
- ✅ Le curseur devrait devenir une croix
- ✅ Un message d'aide devrait apparaître au centre

---

## 🚨 Si l'overlay ne s'affiche toujours pas

### Possibilité 1 : Z-index trop faible

Certains sites ont des éléments avec z-index très élevé.

**Test** :
```javascript
const overlay = document.getElementById('quickgif-overlay');
if (overlay) {
  overlay.style.zIndex = '2147483647'; // Max z-index
}
```

### Possibilité 2 : Position CSS

**Test** :
```javascript
const overlay = document.getElementById('quickgif-overlay');
if (overlay) {
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
}
```

### Possibilité 3 : Conflit avec le site

Certains sites bloquent les overlays.

**Test sur un site simple** :
- https://example.com
- https://www.google.com

---

## 📝 Informations à me donner

Si ça ne marche toujours pas, donnez-moi :

1. **Les logs de la console de la page** (F12)
2. **Les logs de la console de la popup** (Inspect popup)
3. **Résultat de ce test** :
```javascript
console.log(document.getElementById('quickgif-overlay'));
```

---

## 🎯 Prochaines étapes

Une fois que vous avez les logs, je pourrai :

1. Identifier exactement où ça bloque
2. Corriger le problème spécifique
3. Tester sur plusieurs sites

**Rechargez l'extension et testez ! Les logs vont nous dire exactement ce qui se passe. 🔍**
