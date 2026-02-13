# 🎬 Giffeur - Professional GIF Recorder for Chrome

**Giffeur** est une extension Chrome puissante et élégante pour capturer n'importe quelle zone de votre écran et créer des GIFs animés de haute qualité. Conçue pour les développeurs, designers et créateurs de contenu, elle offre une suite complète d'outils d'édition post-capture.

![Giffeur Interface](icons/icon128.png)

## ✨ Fonctionnalités Principales

### 🎥 Capture & Enregistrement
- **Sélection précise** : Cliquez et glissez pour définir la zone à enregistrer.
- **Overlay intelligent** : Affiche les dimensions en temps réel.
- **Contrôle total** : Pause, reprise et arrêt de l'enregistrement à tout moment.

### 🎨 Éditeur Vidéo Avancé
Une fois la capture terminée, le studio de montage s'ouvre automatiquement :

- **🔍 Timeline Pro** : Zoom, navigation fluide et découpage précis.
- **💧 Outil Flou (Blur)** : Floutez des zones sensibles (mots de passe, emails) avec **suivi de mouvement** (keyframes).
- **📝 Textes & Titres** : Ajoutez des annotations stylisées (police, contour, couleur).
- **📐 Formes & Flèches** : Dessinez des flèches, rectangles et cercles pour mettre en évidence des éléments.
- **🖼️ Stickers & Images** : Importez vos propres images (logos, emojis) sur la vidéo.
- **⚡ Contrôle de Vitesse** : Accélérez ou ralentissez des segments (0.25x à 4x).
- **✂️ Recadrage (Crop)** : Presets inclus (16:9, 9:16, 1:1, Social Media).

### 💾 Gestion & Export
- **Galerie Intégrée** : Retrouvez tous vos enregistrements avec prévisualisation.
- **Export Optimisé** : Encodage GIF haute performance via Web Workers (fluide même pour les longs enregistrements).
- **Confidentialité** : Tout le traitement se fait **localement** dans votre navigateur. Aucune vidéo n'est envoyée sur un serveur.

---

## 🚀 Installation

### Pour les utilisateurs (Mode développeur)

1. Clonez ce dépôt ou téléchargez le ZIP.
2. Ouvrez Chrome et accédez à `chrome://extensions/`.
3. Activez le **Mode développeur** (en haut à droite).
4. Cliquez sur **Charger l'extension non empaquetée**.
5. Sélectionnez le dossier du projet `Giffeur`.

### Prérequis techniques

L'extension utilise `gif.js` pour l'encodage. Assurez-vous que le dossier `lib/` contient bien :
- `gif.js`
- `gif.worker.js`

(Ces fichiers sont inclus dans le dépôt, mais veillez à ne pas les supprimer).

---

## 📖 Guide de Démarrage Rapide

1. **Lancer** : Cliquez sur l'icône **Giffeur** dans la barre d'outils Chrome.
2. **Sélectionner** : Cadrez la zone à capturer.
3. **Enregistrer** : Cliquez sur "Enregistrer". Une fois terminé, cliquez sur "Arrêter".
4. **Éditer** :
   - Utilisez la timeline pour naviguer.
   - Ajoutez du flou, du texte ou des formes via la barre d'outils.
   - Ajustez la vitesse si nécessaire.
5. **Exporter** : Choisissez la qualité et téléchargez votre GIF !

---

## 🛠️ Stack Technique

- **Frontend** : Vanilla JS, HTML5 Canvas, CSS3 (Glassmorphism UI).
- **Core** : Chrome Extension Manifest V3.
- **Storage** : IndexedDB (pour la galerie et les projets volumineux).
- **Encoding** : `gif.js` (WASM/Workers).

## 🔒 Sécurité & Performance

- **Anti-XSS** : Interface construite via création DOM sécurisée (pas d'`innerHTML` sur les données utilisateur).
- **Optimisé** : Rendu canvas optimisé (boucles performantes, redessin partiel pour le flou).
- **Permissions** : Utilise le minimum de permissions requises (`tabCapture`, `storage`, `offscreen`).

---

## 🤝 Contribuer

Les contributions sont les bienvenues !
1. Forkez le projet.
2. Créez votre branche (`git checkout -b feature/AmazingFeature`).
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`).
4. Push vers la branche (`git push origin feature/AmazingFeature`).
5. Ouvrez une Pull Request.

## 📄 Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.

---

*Développé avec ❤️ pour rendre le web plus animé.*
