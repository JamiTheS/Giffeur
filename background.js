// ===== GIFFEUR - Background Service Worker =====
// Gère la capture d'écran et la génération de GIF via Offscreen Document

let recordingState = {
  isRecording: false,
  area: null,
  fps: 15,
  quality: 10,
  tabId: null
};

// ===== COMMAND LISTENER (Shortcuts) =====
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-recording') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleRecording' }).catch(() => {
          // If content script not ready or error
          console.log('Content script not ready for toggle');
        });
      }
    });
  }
});

// ===== MESSAGE LISTENER =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startRecording':
      handleStartRecording(message, sender);
      sendResponse({ success: true });
      break;

    case 'stopRecording':
      handleStopRecording();
      sendResponse({ success: true });
      break;

    case 'selectionComplete':
      // Forward to popup
      chrome.runtime.sendMessage(message).catch(() => { });
      break;

    case 'offscreen-recording-progress':
      // Forward progress to content script
      forwardToTab('recordingProgress', { progress: message.progress });
      // Also forward to popup
      chrome.runtime.sendMessage({
        action: 'recordingProgress',
        progress: message.progress
      }).catch(() => { });
      break;

    case 'offscreen-recording-complete':
      // Open the Editor instead of auto-download
      chrome.tabs.create({ url: 'editor.html' });

      // Notify content script
      forwardToTab('recordingComplete', {});
      // Notify popup
      chrome.runtime.sendMessage({ action: 'recordingComplete' }).catch(() => { });
      recordingState.isRecording = false;
      // Close offscreen document
      closeOffscreenDocument();
      break;

    case 'offscreen-recording-error':
      console.error('Recording error:', message.error);
      forwardToTab('recordingError', { error: message.error });
      chrome.runtime.sendMessage({
        action: 'recordingError',
        error: message.error
      }).catch(() => { });
      recordingState.isRecording = false;
      closeOffscreenDocument();
      break;
  }
  return true;
});

// ===== START RECORDING =====
async function handleStartRecording(config, sender) {
  try {
    recordingState.area = config.area;
    recordingState.fps = config.fps || 15;
    recordingState.quality = config.quality || 10;
    recordingState.isRecording = true;

    // Get active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      throw new Error('Aucun onglet actif trouvé');
    }
    const tab = tabs[0];
    recordingState.tabId = tab.id;

    console.log('[BG] Tab found:', tab.id, tab.width, 'x', tab.height);

    // Get a media stream ID for the tab
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id
    });

    console.log('[BG] StreamId obtained:', streamId ? 'OK' : 'EMPTY');

    // Create offscreen document for recording
    await createOffscreenDocument();

    console.log('[BG] Offscreen document ready');

    // Send config to offscreen document
    // Small delay to ensure offscreen document listener is ready
    await new Promise(r => setTimeout(r, 100));

    chrome.runtime.sendMessage({
      action: 'offscreen-start-recording',
      streamId: streamId,
      area: config.area,
      fps: config.fps || 15,
      quality: config.quality || 10,
      tabWidth: tab.width,
      tabHeight: tab.height,
      winW: config.winW,
      winH: config.winH,
      dpr: config.dpr,
      borderRadius: config.borderRadius || 0,
      shape: config.shape || 'free'
    });

    console.log('[BG] Recording config sent to offscreen');
  } catch (error) {
    console.error('[BG] Error starting recording:', error);
    recordingState.isRecording = false;

    forwardToTab('recordingError', { error: error.message });

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Giffeur - Erreur',
      message: 'Impossible de démarrer: ' + error.message
    });
  }
}

// ===== STOP RECORDING =====
async function handleStopRecording() {
  if (!recordingState.isRecording) return;

  recordingState.isRecording = false;

  // Hide recording indicator
  forwardToTab('hideRecordingIndicator', {});

  // Tell offscreen document to stop
  chrome.runtime.sendMessage({ action: 'offscreen-stop-recording' }).catch(() => { });
}

// ===== OFFSCREEN DOCUMENT MANAGEMENT =====
let hasOffscreenDocument = false;

async function createOffscreenDocument() {
  if (hasOffscreenDocument) return;

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording tab capture stream and generating GIF'
    });
    hasOffscreenDocument = true;
    console.log('[BG] Offscreen document created');
  } catch (e) {
    // Document might already exist
    if (e.message && e.message.includes('already exists')) {
      hasOffscreenDocument = true;
      console.log('[BG] Offscreen document already exists');
    } else {
      console.error('[BG] Offscreen creation error:', e);
      throw e;
    }
  }
}

async function closeOffscreenDocument() {
  if (!hasOffscreenDocument) return;
  try {
    await chrome.offscreen.closeDocument();
    hasOffscreenDocument = false;
  } catch (e) {
    console.warn('Error closing offscreen doc:', e);
    hasOffscreenDocument = false;
  }
}

// ===== HELPER =====
function forwardToTab(action, data) {
  if (recordingState.tabId) {
    chrome.tabs.sendMessage(recordingState.tabId, { action, ...data }).catch(() => { });
  }
}

