// ===== GIFFEUR - Popup Script =====

const state = {
  isSelecting: false,
  isRecording: false,
  isProcessing: false,
  selectedArea: null,
  tabId: null
};

// DOM elements
const selectBtn = document.getElementById('selectBtn');
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const statusCard = document.getElementById('statusCard');
const statusTitle = document.getElementById('statusTitle');
const statusDesc = document.getElementById('statusDesc');
const statusIcon = document.getElementById('statusIcon');
const fpsSelect = document.getElementById('fpsSelect');
const qualitySelect = document.getElementById('qualitySelect');
const shortcutInput = document.getElementById('shortcutInput');

// ===== MESSAGES DU BACKGROUND / CONTENT SCRIPT =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'selectionComplete':
      state.selectedArea = message.area;
      updateUIForSelection();
      break;
    case 'recordingProgress':
      state.isProcessing = true;
      updateStatus('Traitement...', Math.round(message.progress * 100) + '%', 'processing');
      break;
    case 'recordingComplete':
      handleRecordingComplete();
      break;
    case 'recordingError':
      handleRecordingError(message.error);
      break;
  }
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.tabId = tab.id;

  // Pages non supportées
  const url = tab.url || '';
  const isRestricted = url !== '' && (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('https://chromewebstore.google.com/') ||
    url.startsWith('https://chrome.google.com/webstore/') ||
    url === 'about:blank'
  );

  if (isRestricted) {
    updateStatus('Page non supportée', 'Naviguez vers une page web pour utiliser Giffeur', 'error');
    selectBtn.disabled = true;
    return;
  }

  // Charger les paramètres sauvegardés
  const settings = await chrome.storage.local.get(['fps', 'quality', 'customShortcut']);
  if (settings.fps) fpsSelect.value = settings.fps;
  if (settings.quality) qualitySelect.value = settings.quality;
  if (settings.customShortcut) {
    shortcutInput.value = formatShortcut(settings.customShortcut);
  } else {
    shortcutInput.value = 'Ctrl+Shift+U';
  }

  // Vérifier s'il y a déjà une sélection active
  chrome.tabs.sendMessage(state.tabId, { action: 'getSelection' }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response && response.area) {
      state.selectedArea = response.area;
      updateUIForSelection();
    }
  });
});

// ===== EVENT LISTENERS =====
selectBtn.addEventListener('click', startSelection);
recordBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
document.getElementById('galleryBtn')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('gallery.html') });
});

fpsSelect.addEventListener('change', (e) => {
  chrome.storage.local.set({ fps: e.target.value });
});
qualitySelect.addEventListener('change', (e) => {
  chrome.storage.local.set({ quality: e.target.value });
});

// Shortcut Configuration
shortcutInput.addEventListener('keydown', (e) => {
  e.preventDefault();
  if (e.key === 'Escape') {
    shortcutInput.blur();
    return;
  }

  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

  const shortcut = {
    key: e.key.toUpperCase(),
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
    metaKey: e.metaKey
  };

  shortcutInput.value = formatShortcut(shortcut);
  chrome.storage.local.set({ customShortcut: shortcut });
  shortcutInput.blur();
});

function formatShortcut(s) {
  const parts = [];
  if (s.ctrlKey) parts.push('Ctrl');
  if (s.metaKey) parts.push('Cmd');
  if (s.altKey) parts.push('Alt');
  if (s.shiftKey) parts.push('Shift');
  parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key);
  return parts.join('+');
}

// ===== SÉLECTION =====
async function startSelection() {
  state.isSelecting = true;
  selectBtn.disabled = true;
  updateStatus('Sélection en cours', 'Cliquez et glissez pour définir la zone', 'selecting');

  try {
    // Ping le content script
    const alive = await new Promise((resolve) => {
      chrome.tabs.sendMessage(state.tabId, { action: 'ping' }, (response) => {
        resolve(!chrome.runtime.lastError && response && response.status === 'ok');
      });
    });

    if (!alive) {
      // Injecter le content script
      console.log('[Giffeur] Injecting content script into tab', state.tabId);
      try {
        await chrome.scripting.executeScript({
          target: { tabId: state.tabId },
          files: ['content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId: state.tabId },
          files: ['content.css']
        });
        console.log('[Giffeur] Content script injected successfully');

        // Attendre que le script soit prêt
        let ready = false;
        for (let i = 0; i < 15; i++) {
          await sleep(100);
          ready = await new Promise((resolve) => {
            chrome.tabs.sendMessage(state.tabId, { action: 'ping' }, (response) => {
              resolve(!chrome.runtime.lastError && response && response.status === 'ok');
            });
          });
          if (ready) break;
        }

        if (!ready) {
          updateStatus('Erreur', 'Le script ne répond pas. Rechargez la page et réessayez.', 'error');
          selectBtn.disabled = false;
          return;
        }
      } catch (injErr) {
        // Injection bloquée (page système, extension, etc.)
        const msg = injErr.message || '';
        if (msg.includes('Cannot access') || msg.includes('chrome-extension') || msg.includes('gallery')) {
          updateStatus('Page non supportée', 'Naviguez vers une page web pour utiliser Giffeur', 'error');
        } else {
          updateStatus('Erreur', msg || 'Injection impossible', 'error');
        }
        selectBtn.disabled = false;
        return;
      }
    }

    // Démarrer la sélection
    chrome.tabs.sendMessage(state.tabId, { action: 'startSelection' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Giffeur] startSelection error:', chrome.runtime.lastError.message);
        updateStatus('Erreur', chrome.runtime.lastError.message, 'error');
        selectBtn.disabled = false;
        return;
      }
      // Fermer le popup pour révéler l'overlay de sélection
      window.close();
    });
  } catch (error) {
    console.error('[Giffeur] startSelection exception:', error);
    updateStatus('Erreur', error.message || 'Impossible de démarrer', 'error');
    selectBtn.disabled = false;
  }
}

// ===== ENREGISTREMENT =====
async function startRecording() {
  if (!state.selectedArea) return;

  state.isRecording = true;
  recordBtn.style.display = 'none';
  stopBtn.style.display = 'flex';
  statusCard.classList.add('recording');

  updateStatus('Démarrage...', 'Compte à rebours...', 'countdown');

  chrome.runtime.sendMessage({
    action: 'startRecording',
    area: state.selectedArea,
    tabId: state.tabId,
    fps: parseInt(fpsSelect.value),
    quality: parseInt(qualitySelect.value)
  });

  updateStatus('Enregistrement', 'Capture en cours...', 'recording');
}

// ===== ARRÊT =====
function stopRecording() {
  state.isRecording = false;
  stopBtn.style.display = 'none';
  statusCard.classList.remove('recording');
  statusCard.classList.add('processing');

  updateStatus('Traitement', 'Génération du GIF...', 'processing');

  chrome.runtime.sendMessage({ action: 'stopRecording' });
}

// ===== UI UPDATES =====
function updateUIForSelection() {
  state.isSelecting = false;
  selectBtn.disabled = false;
  recordBtn.disabled = false;

  const { width, height } = state.selectedArea;
  updateStatus(
    'Zone sélectionnée',
    `${Math.round(width)}×${Math.round(height)} px — Utilisez les boutons sur la page`,
    'ready'
  );
}

function updateStatus(title, desc, type) {
  statusTitle.textContent = title;
  statusDesc.textContent = desc;

  const svgIcons = {
    selecting: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 4"/></svg>',
    ready: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    countdown: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    recording: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
    processing: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    success: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
  };
  statusIcon.innerHTML = svgIcons[type] || svgIcons.ready;
}

async function handleRecordingComplete() {
  statusCard.classList.remove('processing', 'recording');
  statusCard.classList.add('success');
  updateStatus('Terminé !', 'Votre GIF a été téléchargé', 'success');
  await sleep(4000);
  resetUI();
}

function handleRecordingError(error) {
  statusCard.classList.remove('processing', 'recording');
  updateStatus('Erreur', error || 'Échec de l\'enregistrement', 'error');
  resetUI();
}

function resetUI() {
  state.isRecording = false;
  state.isProcessing = false;
  state.selectedArea = null;

  statusCard.classList.remove('recording', 'processing', 'success');
  recordBtn.disabled = true;
  recordBtn.style.display = 'flex';
  stopBtn.style.display = 'none';

  updateStatus('Prêt à capturer', 'Sélectionnez une zone et enregistrez', 'ready');

  chrome.tabs.sendMessage(state.tabId, { action: 'clearSelection' }).catch(() => { });
}

// ===== UTILITY =====
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
