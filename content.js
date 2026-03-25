// ===== GIFFEUR - Content Script =====
// Gère la sélection de zone, contrôles flottants, drag & resize, formes

let isSelecting = false;
let selectionStart = null;
let selectionArea = null;
let overlays = { top: null, bottom: null, left: null, right: null };
let selectionBox = null;
let dimensionLabel = null;
let floatingUI = null;
let interactionLayer = null;
let initialized = false;
let isRecording = false;

// Selection State
let currentFormat = 'free'; // free, square, circle, iphone, mac
let currentRadius = 0;      // px

// Drag & Resize state
let isDragging = false;
let isResizing = false;
let resizeHandle = null;
let dragStart = null;
let originalArea = null;

// rAF throttling
let rafId = null;
let pendingMouse = null;

// Helper : force display avec !important
function setDisplay(el, value) {
  if (el) el.style.setProperty('display', value, 'important');
}

function setStyle(el, prop, value) {
  if (el) el.style.setProperty(prop, value, 'important');
}

// ===== INITIALISATION =====
function init() {
  if (initialized && document.getElementById('quickgif-overlay-top')) return;
  cleanup();
  createOverlays();
  initialized = true;
}

function cleanup() {
  // Remove document-level listeners to prevent accumulation
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('mouseup', handleMouseUp, true);
  document.removeEventListener('keydown', handleKeyDown);

  ['quickgif-selection', 'quickgif-dimensions', 'quickgif-floating-ui', 'quickgif-recording',
    'quickgif-animations', 'quickgif-rec-border', 'quickgif-interaction', 'quickgif-help'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

  Object.values(overlays).forEach(el => {
    if (el) el.remove();
  });
  overlays = { top: null, bottom: null, left: null, right: null };
  const help = document.getElementById('quickgif-help');
  if (help) help.remove();

  selectionBox = null;
  dimensionLabel = null;
  floatingUI = null;
  interactionLayer = null;
  initialized = false;
  isDragging = false;
  isResizing = false;
  resizeHandle = null;
  dragStart = null;
  originalArea = null;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  pendingMouse = null;
}

// ===== CRÉATION DE L'OVERLAY (4 DIVS) =====
function createOverlays() {
  // 4 divs pour créer un "trou" au milieu
  ['top', 'bottom', 'left', 'right'].forEach(side => {
    const el = document.createElement('div');
    el.id = `quickgif-overlay-${side}`;
    el.style.cssText = `
      position: fixed !important;
      background: rgba(0, 0, 0, 0.35) !important;
      backdrop-filter: blur(6px) !important;
      -webkit-backdrop-filter: blur(6px) !important;
      z-index: 2147483640 !important;
      cursor: crosshair !important;
      pointer-events: auto !important;
      margin: 0 !important; padding: 0 !important;
      border: none !important;
    `;
    // Initial: tout l'écran couvert par Top
    if (side === 'top') {
      el.style.top = '0'; el.style.left = '0'; el.style.width = '100vw'; el.style.height = '100vh';
    } else {
      el.style.display = 'none';
    }

    // Event listeners
    el.addEventListener('mousedown', handleMouseDown, true);
    el.addEventListener('click', (e) => {
      if (isSelecting) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      }
    }, true);

    document.body.appendChild(el);
    overlays[side] = el;
  });

  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('mouseup', handleMouseUp, true);
  document.addEventListener('keydown', handleKeyDown);

  // Selection box (bordure visible)
  selectionBox = document.createElement('div');
  selectionBox.id = 'quickgif-selection';
  selectionBox.style.cssText = `
    position: fixed !important;
    border: 3px solid #6366f1 !important;
    background: transparent !important;
    display: none !important;
    z-index: 2147483642 !important;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.5) !important;
    pointer-events: none !important;
    margin: 0 !important; padding: 0 !important;
    transition: border-radius 0.1s ease !important;
  `;
  document.body.appendChild(selectionBox);

  // Label dimensions
  dimensionLabel = document.createElement('div');
  dimensionLabel.id = 'quickgif-dimensions';
  dimensionLabel.style.cssText = `
    position: fixed !important;
    background: #6366f1 !important;
    color: white !important;
    padding: 6px 14px !important;
    border-radius: 8px !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    font-size: 13px !important; font-weight: 600 !important;
    display: none !important;
    z-index: 2147483643 !important;
    pointer-events: none !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    white-space: nowrap !important;
  `;
  document.body.appendChild(dimensionLabel);

  // Help text
  const helpText = document.createElement('div');
  helpText.id = 'quickgif-help';
  helpText.style.cssText = `
    position: fixed !important;
    top: 50% !important; left: 50% !important;
    transform: translate(-50%, -50%) !important;
    background: white !important; color: #1e293b !important;
    padding: 28px 36px !important; border-radius: 18px !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    font-size: 16px !important; font-weight: 500 !important;
    z-index: 2147483644 !important;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4) !important;
    text-align: center !important; pointer-events: none !important;
  `;
  helpText.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 12px;">🎯</div>
    <div style="margin-bottom: 8px; font-size: 17px;">Cliquez et glissez pour sélectionner</div>
    <div style="font-size: 13px; color: #64748b;">
      <kbd>ESC</kbd> pour annuler
    </div>
  `;
  document.body.appendChild(helpText);

  // Animations CSS
  if (!document.getElementById('quickgif-animations')) {
    const style = document.createElement('style');
    style.id = 'quickgif-animations';
    style.textContent = `
      @keyframes quickgif-recordPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.7); }
      }
      @keyframes quickgif-fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes quickgif-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

// ===== UPDATE 4 DIVS OVERLAY =====
function updateOverlays(left, top, width, height) {
  if (!overlays.top) return;

  // Window dimens
  const winW = window.innerWidth;
  const winH = window.innerHeight;

  // Top div
  setStyle(overlays.top, 'display', 'block');
  setStyle(overlays.top, 'top', '0');
  setStyle(overlays.top, 'left', '0');
  setStyle(overlays.top, 'width', '100vw');
  setStyle(overlays.top, 'height', `${top}px`);

  // Bottom div
  setStyle(overlays.bottom, 'display', 'block');
  setStyle(overlays.bottom, 'top', `${top + height}px`);
  setStyle(overlays.bottom, 'left', '0');
  setStyle(overlays.bottom, 'width', '100vw');
  setStyle(overlays.bottom, 'height', `${winH - (top + height)}px`);

  // Left div
  setStyle(overlays.left, 'display', 'block');
  setStyle(overlays.left, 'top', `${top}px`);
  setStyle(overlays.left, 'left', '0');
  setStyle(overlays.left, 'width', `${left}px`);
  setStyle(overlays.left, 'height', `${height}px`);

  // Right div
  setStyle(overlays.right, 'display', 'block');
  setStyle(overlays.right, 'top', `${top}px`);
  setStyle(overlays.right, 'left', `${left + width}px`);
  setStyle(overlays.right, 'width', `${winW - (left + width)}px`);
  setStyle(overlays.right, 'height', `${height}px`);
}

function resetOverlays() {
  // Reset to full screen cover (top div only)
  if (overlays.top) {
    setStyle(overlays.top, 'display', 'block');
    setStyle(overlays.top, 'top', '0');
    setStyle(overlays.top, 'left', '0');
    setStyle(overlays.top, 'width', '100vw');
    setStyle(overlays.top, 'height', '100vh');

    setStyle(overlays.bottom, 'display', 'none');
    setStyle(overlays.left, 'display', 'none');
    setStyle(overlays.right, 'display', 'none');
  }
}

// ===== GESTION SOURIS =====
function handleMouseDown(e) {
  if (!isSelecting) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();

  selectionStart = { x: e.clientX, y: e.clientY };
  selectionArea = null;
  pendingMouse = null;

  // Default format handling
  if (currentFormat !== 'free') {
    // We'll enforce aspect ratio during drag
  }

  const help = document.getElementById('quickgif-help');
  if (help) setDisplay(help, 'none');

  setDisplay(selectionBox, 'block');
  setDisplay(dimensionLabel, 'block');

  // Init small box
  const px = `${e.clientX}px`, py = `${e.clientY}px`;
  setStyle(selectionBox, 'left', px); setStyle(selectionBox, 'top', py);
  setStyle(selectionBox, 'width', '0'); setStyle(selectionBox, 'height', '0');

  // Update border radius based on settings
  updateBorderRadius();
}

function handleMouseMove(e) {
  if (!isSelecting || !selectionStart) return;
  e.preventDefault();

  pendingMouse = { x: e.clientX, y: e.clientY };
  if (!rafId) rafId = requestAnimationFrame(renderSelectionFrame);
}

function renderSelectionFrame() {
  rafId = null;
  if (!pendingMouse || !selectionStart) return;

  let width = Math.abs(pendingMouse.x - selectionStart.x);
  let height = Math.abs(pendingMouse.y - selectionStart.y);
  let left = Math.min(selectionStart.x, pendingMouse.x);
  let top = Math.min(selectionStart.y, pendingMouse.y);

  // Apply Aspect Ratio Constraints
  if (currentFormat !== 'free') {
    let ratio = 1;
    if (currentFormat === 'square' || currentFormat === 'circle') ratio = 1;
    else if (currentFormat === 'iphone') ratio = 9 / 19.5; // ~0.46
    else if (currentFormat === 'mac') ratio = 16 / 10; // 1.6

    // Constraints: width is master
    height = width / ratio;

    // Direction adjustment
    if (pendingMouse.y < selectionStart.y) top = selectionStart.y - height;
    if (pendingMouse.x < selectionStart.x) left = selectionStart.x - width;
  }

  // Update DOM
  if (selectionBox) {
    setStyle(selectionBox, 'left', `${left}px`);
    setStyle(selectionBox, 'top', `${top}px`);
    setStyle(selectionBox, 'width', `${width}px`);
    setStyle(selectionBox, 'height', `${height}px`);
  }

  if (dimensionLabel) {
    dimensionLabel.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
    setStyle(dimensionLabel, 'left', `${left + width / 2}px`);
    setStyle(dimensionLabel, 'top', `${top - 35}px`);
    setStyle(dimensionLabel, 'transform', 'translateX(-50%)');
  }

  selectionArea = { left, top, width, height };
  updateOverlays(left, top, width, height);
}

function handleMouseUp(e) {
  if (!isSelecting || !selectionStart) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();

  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

  // Finalize selection area (re-calculate with aspect ratio if needed)
  if (pendingMouse) {
    // Re-run logic once to ensure sync
    renderSelectionFrame();
  }
  pendingMouse = null;

  if (!selectionArea || selectionArea.width < 5 || selectionArea.height < 5) {
    // Cancel/Retry
    selectionStart = null; selectionArea = null;
    setDisplay(selectionBox, 'none'); setDisplay(dimensionLabel, 'none');
    resetOverlays();
    const help = document.getElementById('quickgif-help');
    if (help) setDisplay(help, 'block');
    return;
  }

  // Validation
  if (selectionArea.width < 50 || selectionArea.height < 50) {
    showNotification('⚠️ Zone trop petite', 'warning');
    resetOverlays();
    startSelection(); // Restart
    return;
  }

  isSelecting = false;
  selectionStart = null;

  // Style success
  if (selectionBox) setStyle(selectionBox, 'border-color', '#10b981');
  if (dimensionLabel) setStyle(dimensionLabel, 'background', '#10b981');

  showFloatingUI();
  createInteractionLayer();

  showNotification('✅ Zone sélectionnée', 'success');
}

// ===== UI FLOTTANTE (FORMATS & RADIUS) =====
function showFloatingUI() {
  if (floatingUI) floatingUI.remove();

  floatingUI = document.createElement('div');
  floatingUI.id = 'quickgif-floating-ui';

  const area = selectionArea;
  let uiTop = area.top + area.height + 16;
  let uiLeft = area.left + area.width / 2;
  if (uiTop + 80 > window.innerHeight) uiTop = area.top - 120; // More space for complex UI

  floatingUI.style.cssText = `
    position: fixed !important;
    top: ${uiTop}px !important;
    left: ${uiLeft}px !important;
    transform: translateX(-50%) !important;
    display: flex !important; flex-direction: column !important;
    gap: 8px !important;
    z-index: 2147483647 !important;
    animation: quickgif-fadeIn 0.25s ease !important;
    pointer-events: auto !important;
    align-items: center !important;
  `;

  // Toolbar row (Record, Reselect, Cancel)
  const toolbar = document.createElement('div');
  toolbar.style.cssText = "display: flex !important; gap: 8px !important;";

  const recordBtn = createBtn('Enregistrer', '#ef4444', () => startRecordingFromContent(), true);
  const reselectBtn = createBtn('Resélectionner', 'rgba(255,255,255,0.2)', () => {
    removeInteractionLayer(); hideFloatingUI(); startSelection();
  });
  const cancelBtn = createBtn('✕', 'rgba(255,255,255,0.2)', () => cancelEverything());

  toolbar.appendChild(recordBtn);
  toolbar.appendChild(reselectBtn);
  toolbar.appendChild(cancelBtn);

  // Settings row (Format, Radius)
  const settings = document.createElement('div');
  settings.style.cssText = `
    display: flex !important; gap: 8px !important;
    background: rgba(0,0,0,0.6) !important;
    backdrop-filter: blur(10px) !important;
    padding: 6px 10px !important; border-radius: 12px !important;
    align-items: center !important;
  `;

  // Format Dropdown
  const formatSelect = document.createElement('select');
  formatSelect.style.cssText = `
    background: rgba(255,255,255,0.1) !important; color: white !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
    border-radius: 6px !important; padding: 4px 8px !important;
    font-size: 12px !important; cursor: pointer !important;
    outline: none !important;
  `;
  const formats = [
    { v: 'free', l: 'Libre' }, { v: 'square', l: 'Carré' }, { v: 'circle', l: 'Cercle' },
    { v: 'iphone', l: 'iPhone' }, { v: 'mac', l: 'Mac' }
  ];
  formats.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.v; opt.text = f.l;
    opt.style.cssText = 'color: #333 !important; background: #fff !important;'; // FIX: visible text
    if (f.v === currentFormat) opt.selected = true;
    formatSelect.appendChild(opt);
  });
  formatSelect.addEventListener('change', (e) => {
    currentFormat = e.target.value;
    applyFormatConstraint();
  });

  // Radius Slider
  const radiusContainer = document.createElement('div');
  radiusContainer.style.cssText = "display: flex !important; align-items: center !important; gap: 6px !important; margin-left:8px;";

  const rLabel = document.createElement('span');
  rLabel.textContent = 'Arrondi:';
  rLabel.style.cssText = "font-size: 11px !important; color: #ccc !important;";

  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = '0'; slider.max = '50'; slider.value = currentRadius;
  slider.style.cssText = "width: 60px !important; cursor: pointer !important;";
  slider.addEventListener('input', (e) => {
    currentRadius = parseInt(e.target.value);
    // If circle, ignore slider visually or disable it
    if (currentFormat !== 'circle') {
      updateBorderRadius();
    }
  });

  radiusContainer.appendChild(rLabel);
  radiusContainer.appendChild(slider);

  settings.appendChild(formatSelect);
  settings.appendChild(radiusContainer);

  floatingUI.appendChild(toolbar);
  floatingUI.appendChild(settings);
  document.body.appendChild(floatingUI);

  // Initial check
  if (currentFormat === 'circle') {
    slider.disabled = true;
    slider.style.opacity = 0.5;
  }
}

function createBtn(text, bg, onClick, primary = false) {
  const btn = document.createElement('button');
  btn.innerHTML = text;
  btn.style.cssText = `
    display: flex !important; align-items: center !important; justify-content: center !important;
    padding: ${primary ? '8px 20px' : '8px 12px'} !important;
    background: ${bg} !important; color: white !important;
    border: none !important; border-radius: 8px !important;
    font-size: 13px !important; font-weight: 600 !important;
    cursor: pointer !important; font-family: system-ui !important;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2) !important;
    transition: transform 0.1s !important;
  `;
  btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
  btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
  btn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation(); onClick();
  });
  return btn;
}

// ===== LOGIQUE FORMATS & RADIUS =====
function updateBorderRadius() {
  if (!selectionBox) return;

  if (currentFormat === 'circle') {
    setStyle(selectionBox, 'border-radius', '50%');
  } else {
    setStyle(selectionBox, 'border-radius', `${currentRadius}px`);
  }
}

function applyFormatConstraint() {
  if (!selectionArea) return;

  // Re-calculate dimensions based on format
  let { width, height } = selectionArea;

  if (currentFormat === 'square' || currentFormat === 'circle') {
    const size = Math.min(width, height);
    width = size; height = size;
  } else if (currentFormat === 'iphone') {
    // 9:19.5
    const ratio = 9 / 19.5;
    height = width / ratio;
  } else if (currentFormat === 'mac') {
    const ratio = 16 / 10;
    height = width / ratio;
  }

  // Update Area
  selectionArea.width = width;
  selectionArea.height = height;

  // Handle UI
  updateSelectionUI();
  updateBorderRadius();

  // Handle slider state
  const slider = floatingUI ? floatingUI.querySelector('input[type="range"]') : null;
  if (slider) {
    slider.disabled = (currentFormat === 'circle');
    slider.style.opacity = (currentFormat === 'circle') ? '0.5' : '1';
  }
}

// ===== DRAG & RESIZE =====
function createInteractionLayer() {
  removeInteractionLayer();
  if (!selectionArea) return;

  interactionLayer = document.createElement('div');
  interactionLayer.id = 'quickgif-interaction';
  interactionLayer.style.cssText = `
    position: fixed !important;
    left: ${selectionArea.left}px !important;
    top: ${selectionArea.top}px !important;
    width: ${selectionArea.width}px !important;
    height: ${selectionArea.height}px !important;
    z-index: 2147483644 !important;
    cursor: move !important;
    pointer-events: auto !important;
    background: transparent !important;
  `;

  // Handles
  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  handles.forEach(pos => {
    const h = document.createElement('div');
    h.dataset.handle = pos;
    h.className = 'quickgif-handle'; // Styled in CSS
    positionHandle(h, pos, selectionArea.width, selectionArea.height);
    interactionLayer.appendChild(h);
  });

  interactionLayer.addEventListener('mousedown', handleInteractionDown, true);
  document.body.appendChild(interactionLayer);
}

function positionHandle(h, pos, w, hDim) {
  const size = 12; const half = -6;
  const p = {
    nw: { t: half, l: half }, n: { t: half, l: w / 2 + half }, ne: { t: half, l: w + half },
    e: { t: hDim / 2 + half, l: w + half }, se: { t: hDim + half, l: w + half },
    s: { t: hDim + half, l: w / 2 + half }, sw: { t: hDim + half, l: half },
    w: { t: hDim / 2 + half, l: half }
  };
  setStyle(h, 'top', `${p[pos].t}px`);
  setStyle(h, 'left', `${p[pos].l}px`);
}

function handleInteractionDown(e) {
  e.preventDefault(); e.stopPropagation();
  const handle = e.target.dataset.handle;
  isResizing = !!handle;
  isDragging = !handle;
  resizeHandle = handle;
  dragStart = { x: e.clientX, y: e.clientY };
  originalArea = { ...selectionArea };

  document.addEventListener('mousemove', handleInteractionMove, true);
  document.addEventListener('mouseup', handleInteractionUp, true);
}

function handleInteractionMove(e) {
  e.preventDefault(); e.stopPropagation();
  if (!isDragging && !isResizing) return;

  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;

  if (isDragging) {
    selectionArea.left = originalArea.left + dx;
    selectionArea.top = originalArea.top + dy;
  } else if (isResizing) {
    let { left, top, width, height } = originalArea;

    // Apply changes based on handle
    if (resizeHandle.includes('e')) width += dx;
    if (resizeHandle.includes('w')) { left += dx; width -= dx; }
    if (resizeHandle.includes('s')) height += dy;
    if (resizeHandle.includes('n')) { top += dy; height -= dy; }

    // Constraints
    if (width < 50) width = 50;
    if (height < 50) height = 50;

    // Aspect Ratio Lock
    if (currentFormat !== 'free') {
      let ratio = 1;
      if (currentFormat === 'square' || currentFormat === 'circle') ratio = 1;
      else if (currentFormat === 'iphone') ratio = 9 / 19.5;
      else if (currentFormat === 'mac') ratio = 16 / 10;

      // If dragging corner, width dominates. If side, depends.
      // Simple approach: master width
      height = width / ratio;
    }

    selectionArea = { left, top, width, height };
  }

  updateSelectionUI();
}

function handleInteractionUp(e) {
  isDragging = false; isResizing = false;
  document.removeEventListener('mousemove', handleInteractionMove, true);
  document.removeEventListener('mouseup', handleInteractionUp, true);

  // Re-create layer to fix handle positions if resized
  createInteractionLayer();
}

function updateSelectionUI() {
  if (!selectionArea) return;
  const { left, top, width, height } = selectionArea;

  // Box
  setStyle(selectionBox, 'left', `${left}px`);
  setStyle(selectionBox, 'top', `${top}px`);
  setStyle(selectionBox, 'width', `${width}px`);
  setStyle(selectionBox, 'height', `${height}px`);

  // Dimensions
  dimensionLabel.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
  setStyle(dimensionLabel, 'left', `${left + width / 2}px`);
  setStyle(dimensionLabel, 'top', `${top - 35}px`);
  setStyle(dimensionLabel, 'transform', 'translateX(-50%)');

  // Update Overlay 4 divs
  updateOverlays(left, top, width, height);

  // Floating UI pos
  if (floatingUI) {
    let uiTop = top + height + 16;
    if (uiTop + 80 > window.innerHeight) uiTop = top - 120;
    setStyle(floatingUI, 'top', `${uiTop}px`);
    setStyle(floatingUI, 'left', `${left + width / 2}px`);
  }
}

function removeInteractionLayer() {
  if (interactionLayer) interactionLayer.remove();
  interactionLayer = null;
}

// ===== RECORDING =====
let recordingBorder = null;

function showRecordingBorder(area) {
  if (recordingBorder) recordingBorder.remove();
  recordingBorder = document.createElement('div');
  recordingBorder.id = 'quickgif-rec-border';

  // Border logic: if Circle, round border. if Radius, round border.
  let radius = (currentFormat === 'circle') ? '50%' : `${currentRadius}px`;

  recordingBorder.style.cssText = `
    position: fixed !important;
    left: ${area.left}px !important;
    top: ${area.top}px !important;
    width: ${area.width}px !important;
    height: ${area.height}px !important;
    border: 2px dashed #ef4444 !important;
    border-radius: ${radius} !important;
    pointer-events: none !important;
    z-index: 2147483647 !important;
  `;
  document.body.appendChild(recordingBorder);
}

function startRecordingFromContent() {
  if (!selectionArea) return;
  isRecording = true;

  // Hide UI
  removeInteractionLayer();
  if (floatingUI) floatingUI.remove();
  setDisplay(selectionBox, 'none');
  setDisplay(dimensionLabel, 'none');

  // Show guide
  showRecordingBorder(selectionArea);

  // Countdown
  showCountdown(3, () => {
    if (recordingBorder) recordingBorder.remove();

    // Keep overlays visible (they are outside the crop area, won't appear in GIF)

    chrome.runtime.sendMessage({
      action: 'startRecording',
      area: selectionArea,
      fps: 15,
      quality: 10,
      borderRadius: (currentFormat === 'circle') ? '50%' : currentRadius,
      shape: currentFormat,
      winW: window.innerWidth,
      winH: window.innerHeight,
      dpr: window.devicePixelRatio
    });

    // Show stop button (Bottom Center with Dodge)
    showRecordingIndicator();
  });
}

function showCountdown(seconds, callback) {
  const countdownEl = document.createElement('div');
  countdownEl.style.cssText = `
    position: fixed !important; top: 50%; left: 50%; transform: translate(-50%, -50%);
    font-size: 80px; font-weight: 800; color: white; z-index: 2147483647 !important;
  `;
  document.body.appendChild(countdownEl);
  let c = seconds;
  const tick = () => {
    if (c <= 0) { countdownEl.remove(); callback(); return; }
    countdownEl.textContent = c;
    c--; setTimeout(tick, 1000);
  };
  tick();
}

function showRecordingIndicator() {
  const el = document.createElement('div');
  el.id = 'quickgif-recording';
  el.innerHTML = '<span>⏺ Arrêter</span>';

  // Default: Bottom Center
  let css = 'bottom: 30px !important; left: 50% !important; transform: translateX(-50%) !important; top: auto !important;';

  // Smart Dodge: If selection covers bottom center, move to Top Center
  if (selectionArea) {
    const winH = window.innerHeight;
    const winW = window.innerWidth;
    const bottomZoneY = winH - 80;
    const centerZoneX_Left = winW / 2 - 80;
    const centerZoneX_Right = winW / 2 + 80;

    // Check overlap
    const overlapsBottom = (
      selectionArea.top + selectionArea.height > bottomZoneY &&
      selectionArea.left < centerZoneX_Right &&
      selectionArea.left + selectionArea.width > centerZoneX_Left
    );

    if (overlapsBottom) {
      // Move to Top Center
      css = 'top: 30px !important; left: 50% !important; transform: translateX(-50%) !important; bottom: auto !important;';
    }
  }

  el.style.cssText = `
    position: fixed !important;
    ${css}
    background: #ef4444 !important; color: white !important; 
    padding: 12px 32px !important; border-radius: 30px !important;
    z-index: 2147483647 !important; cursor: pointer !important;
    font-family: system-ui !important; font-weight: 700 !important; font-size: 15px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    display: flex !important; align-items: center !important; gap: 8px !important;
    animation: quickgif-fadeIn 0.25s ease !important; transition: all 0.3s ease !important;
  `;
  el.onclick = () => { chrome.runtime.sendMessage({ action: 'stopRecording' }); };
  document.body.appendChild(el);
}

function hideFloatingUI() {
  if (floatingUI) {
    floatingUI.remove();
    floatingUI = null;
  }
}

function cancelEverything() {
  isSelecting = false; isRecording = false; isDragging = false;
  cleanup();
  resetOverlays();
  if (rafId) cancelAnimationFrame(rafId);
}

function handleKeyDown(e) {
  if (e.key === 'Escape') cancelEverything();
}

// LISTENERS
chrome.runtime.onMessage.addListener((msg, sender, resp) => {
  try {
    if (msg.action === 'ping') {
      resp({ status: 'ok' });
    }
    if (msg.action === 'startSelection') {
      console.log('[Giffeur] startSelection received');
      init();
      startSelection();
      resp({ status: 'ok' });
    }
    if (msg.action === 'recordingComplete') { cancelEverything(); showNotification('GIF enregistré ! 🎉', 'success'); }
    if (msg.action === 'recordingError') { cancelEverything(); showNotification('Erreur: ' + (msg.error || 'Échec'), 'error'); }
    if (msg.action === 'clearSelection') {
      cancelEverything();
    }
    if (msg.action === 'hideRecordingIndicator') {
      const rec = document.getElementById('quickgif-recording');
      if (rec) rec.remove();
    }

    // Shortcuts logic
    if (msg.action === 'toggleRecording') {
      if (isRecording) {
        chrome.runtime.sendMessage({ action: 'stopRecording' });
      } else if (isSelecting) {
      cancelEverything();
    } else {
      init();
      startSelection();
    }
  }

    // Support for getSelection if needed by popup?
    if (msg.action === 'getSelection') {
      resp({ area: selectionArea });
    }
  } catch (err) {
    console.error('[Giffeur] Message handler error:', err);
  }
  return true;
});

function startSelection() {
  isSelecting = true;
  // Reset overlays to full
  resetOverlays();

  const help = document.getElementById('quickgif-help');
  if (help) setDisplay(help, 'block');

  // Ensure no old UI matches
  removeInteractionLayer();
  if (floatingUI) setDisplay(floatingUI, 'none');
  setDisplay(selectionBox, 'none');
  setDisplay(dimensionLabel, 'none');
}

// Helper notification
function showNotification(msg, type) {
  const n = document.createElement('div');
  n.textContent = msg;
  n.style.cssText = `
    position: fixed !important; top: 20px !important; right: 20px !important; 
    background: ${type === 'error' ? '#ef4444' : '#10b981'} !important; 
    color: white !important; padding: 12px 24px !important; border-radius: 10px !important; 
    z-index: 2147483647 !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important; 
    font-family: system-ui !important; font-weight: 600 !important;
    font-size: 14px !important; max-width: 400px !important;
  `;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), type === 'error' ? 8000 : 3000);
}

// ===== CLICK HIGHLIGHT =====
document.addEventListener('mousedown', (e) => {
  if (isRecording) {
    showClickRipple(e.clientX, e.clientY);
  }
});

function showClickRipple(x, y) {
  const el = document.createElement('div');
  el.className = 'quickgif-click-ripple';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 600);
}

// ===== CUSTOM SHORTCUT LISTENER =====
document.addEventListener('keydown', async (e) => {
  // Check if user set a custom shortcut
  const settings = await chrome.storage.local.get(['customShortcut']);
  const s = settings.customShortcut;
  if (!s) return;

  // Check match
  // Note: e.key can be 'a' or 'A', we stored Upper.
  if (e.key.toUpperCase() === s.key &&
    e.ctrlKey === s.ctrlKey &&
    e.shiftKey === s.shiftKey &&
    e.altKey === s.altKey &&
    e.metaKey === s.metaKey) {

    e.preventDefault();
    e.stopPropagation();

    // Toggle Logic
    if (isRecording) {
      chrome.runtime.sendMessage({ action: 'stopRecording' });
    } else if (isSelecting) {
      cancelEverything();
    } else {
      init();
      startSelection();
    }
  }
});

// DO NOT auto-init: only init when triggered by popup
// The message listener is always active to respond to ping/startSelection
