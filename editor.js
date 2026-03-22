// ===== GIFFEUR EDITOR v6 — Full Creative Suite =====

// ===== STATE =====
const state = {
    videoBlob: null, videoElement: null, duration: 0, width: 0, height: 0, fps: 15, quality: 10,
    currentTime: 0, isPlaying: false,
    zoomTracks: [], textTracks: [], blurTracks: [], shapeTracks: [], stickerTracks: [], speedTracks: [],
    selectedClip: null, timelineZoom: 1, timelineScroll: 0, activeTool: null,
    cropPreset: 'free', cropRect: null,
    _stickerImages: {} // cache loaded Image objects by index
};

// ===== DOM =====
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const canvasOverlay = document.getElementById('canvas-overlay');
const timelineTracks = document.getElementById('timeline-tracks');
const timelineTracksScroll = document.getElementById('timeline-tracks-scroll');
const scrubber = document.getElementById('scrubber');
const timeDisplay = document.getElementById('time-display');
const btnPlay = document.getElementById('btn-play-pause');
const zoomSlider = document.getElementById('timeline-zoom-slider');
const zoomLabel = document.getElementById('zoom-level-label');
const rulerCanvas = document.getElementById('timeline-ruler');
const rulerScroll = document.getElementById('timeline-ruler-scroll');
const propsPanel = document.getElementById('properties-panel');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const params = new URLSearchParams(window.location.search);
        const recordingId = params.get('id') || 'latest';
        const data = await loadRecordingFromIDB(recordingId);
        if (!data) return alert('Aucun enregistrement trouvé');

        const video = document.createElement('video');
        video.src = URL.createObjectURL(data.blob);
        video.muted = true; video.playsInline = true;
        await new Promise(r => video.onloadedmetadata = r);

        Object.assign(state, { videoBlob: data.blob, videoElement: video, duration: video.duration, width: data.width, height: data.height, fps: data.fps || 15 });
        canvas.width = state.width; canvas.height = state.height;

        drawFrame(); setupTimeline(); setupTools(); setupCanvasInteractions(); setupFormatPresets();
        requestAnimationFrame(renderLoop);
    } catch (e) { console.error(e); alert('Erreur chargement: ' + e.message); }
});

// ===== RENDER ENGINE =====
function renderLoop() {
    if (state.isPlaying) {
        state.currentTime = state.videoElement.currentTime;
        if (state.currentTime >= state.duration) { state.isPlaying = false; state.currentTime = state.duration; updatePlayButton(); }
    }
    drawFrame(); updateScrubberUI(); requestAnimationFrame(renderLoop);
}

// Interpolate blur position from keyframes at given time
function getBlurPos(blur, time) {
    const kf = blur.keyframes;
    // Fast path: no keyframes or only one
    if (!kf || kf.length === 0) return { x: blur.x || 0, y: blur.y || 0 };
    if (kf.length === 1) return { x: kf[0].x, y: kf[0].y };

    // Boundary checks
    if (time <= kf[0].time) return { x: kf[0].x, y: kf[0].y };
    if (time >= kf[kf.length - 1].time) return { x: kf[kf.length - 1].x, y: kf[kf.length - 1].y };

    // Linear search (usually very few keyframes, so binary search is overkill)
    // Optimized: most queries are sequential, so starting from 0 is fine for small N
    for (let i = 0; i < kf.length - 1; i++) {
        if (time >= kf[i].time && time <= kf[i + 1].time) {
            const t = (time - kf[i].time) / (kf[i + 1].time - kf[i].time);
            return { x: kf[i].x + (kf[i + 1].x - kf[i].x) * t, y: kf[i].y + (kf[i + 1].y - kf[i].y) * t };
        }
    }
    return { x: kf[0].x, y: kf[0].y };
}

// Add or update keyframe at a specific time
function setBlurKeyframe(blur, time, x, y) {
    if (!blur.keyframes) blur.keyframes = [{ time: blur.start, x: blur.x || 0, y: blur.y || 0 }];
    const existing = blur.keyframes.find(k => Math.abs(k.time - time) < 0.05);
    if (existing) {
        if (x !== null) existing.x = x;
        if (y !== null) existing.y = y;
    } else {
        const pos = getBlurPos(blur, time);
        blur.keyframes.push({ time, x: x !== null ? x : pos.x, y: y !== null ? y : pos.y });
        blur.keyframes.sort((a, b) => a.time - b.time);
    }
}

function drawFrame() {
    const { videoElement, width, height, currentTime } = state;
    ctx.clearRect(0, 0, width, height);

    // 1. Zoom transform
    const activeZoom = state.zoomTracks.find(z => currentTime >= z.start && currentTime <= z.end);
    ctx.save();
    if (activeZoom) {
        const ox = activeZoom.x * width, oy = activeZoom.y * height;
        ctx.translate(ox, oy); ctx.scale(activeZoom.scale, activeZoom.scale); ctx.translate(-ox, -oy);
    }
    ctx.drawImage(videoElement, 0, 0, width, height);

    // 2. Blur overlays — rendered INSIDE zoom transform, using keyframe interpolation
    for (let i = 0; i < state.blurTracks.length; i++) {
        const b = state.blurTracks[i];
        if (currentTime < b.start || currentTime > b.end) continue;

        const pos = getBlurPos(b, currentTime);
        const bx = pos.x * width, by = pos.y * height, bw = b.w * width, bh = b.h * height;
        try {
            ctx.filter = `blur(${b.intensity || 10}px)`;
            ctx.drawImage(videoElement, bx, by, bw, bh, bx, by, bw, bh);
            ctx.filter = 'none';
        } catch (e) { }
    }

    // 3. Shapes
    for (let i = 0; i < state.shapeTracks.length; i++) {
        const s = state.shapeTracks[i];
        if (currentTime < s.start || currentTime > s.end) continue;

        ctx.strokeStyle = s.color || '#ef4444'; ctx.lineWidth = s.strokeWidth || 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const x1 = s.x1 * width, y1 = s.y1 * height, x2 = s.x2 * width, y2 = s.y2 * height;

        ctx.beginPath();
        if (s.shapeType === 'arrow') {
            const headlen = 15, angle = Math.atan2(y2 - y1, x2 - x1);
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
        } else if (s.shapeType === 'rect') {
            ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
        } else if (s.shapeType === 'circle') {
            const r = Math.hypot(x2 - x1, y2 - y1) / 2, cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
        }
        if (s.shapeType !== 'rect') ctx.stroke();
    }

    // 4. Stickers
    for (let i = 0; i < state.stickerTracks.length; i++) {
        const s = state.stickerTracks[i];
        if (currentTime < s.start || currentTime > s.end) continue;
        if (s._img) {
            ctx.globalAlpha = s.opacity ?? 1;
            ctx.drawImage(s._img, s.x * width, s.y * height, s.w * width, s.h * height);
            ctx.globalAlpha = 1;
        }
    }

    // 5. Text
    for (let i = 0; i < state.textTracks.length; i++) {
        const t = state.textTracks[i];
        if (currentTime < t.start || currentTime > t.end) continue;

        ctx.font = `${t.italic ? 'italic ' : ''}${t.bold ? 'bold ' : ''}${t.fontSize || 40}px ${t.fontFamily || 'Arial'}`;
        ctx.fillStyle = t.color || '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (t.stroke) { ctx.lineWidth = (t.fontSize || 40) / 8; ctx.strokeStyle = t.strokeColor || '#000000'; ctx.strokeText(t.text, t.x * width, t.y * height); }
        ctx.fillText(t.text, t.x * width, t.y * height);
    }

    ctx.restore();

    // 6. Selection indicators
    drawSelectionIndicators();
}

function drawSelectionIndicators() {
    if (!state.selectedClip) return;
    const { type, index } = state.selectedClip;
    const { width, height, currentTime } = state;
    ctx.save();

    if (type === 'zoom') {
        const z = state.zoomTracks[index]; if (!z) { ctx.restore(); return; }
        const cx = z.x * width, cy = z.y * height;
        ctx.strokeStyle = 'rgba(139,92,246,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, height); ctx.moveTo(0, cy); ctx.lineTo(width, cy); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    } else if (type === 'text') {
        const t = state.textTracks[index]; if (!t || currentTime < t.start || currentTime > t.end) { ctx.restore(); return; }
        const fs = t.fontSize || 40, ff = t.fontFamily || 'sans-serif';
        ctx.font = `${t.italic ? 'italic' : 'normal'} ${t.bold ? 'bold' : 'normal'} ${fs}px "${ff}"`;
        const m = ctx.measureText(t.text), tx = t.x * width, ty = t.y * height;
        ctx.strokeStyle = 'rgba(16,185,129,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
        ctx.strokeRect(tx - m.width / 2 - 6, ty - fs / 2 - 4, m.width + 12, fs + 8); ctx.setLineDash([]);
    } else if (type === 'blur') {
        const b = state.blurTracks[index]; if (!b || currentTime < b.start || currentTime > b.end) { ctx.restore(); return; }
        const pos = getBlurPos(b, currentTime);
        const bx = pos.x * width, by = pos.y * height, bw = b.w * width, bh = b.h * height;
        ctx.strokeStyle = 'rgba(100,116,139,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
        ctx.strokeRect(bx, by, bw, bh); ctx.setLineDash([]);
        drawCornerHandles(ctx, bx, by, bw, bh, 'rgba(100,116,139,1)');
    } else if (type === 'shape') {
        const s = state.shapeTracks[index]; if (!s || currentTime < s.start || currentTime > s.end) { ctx.restore(); return; }
        const x1 = s.x1 * width, y1 = s.y1 * height, x2 = s.x2 * width, y2 = s.y2 * height;
        // Endpoint handles
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = s.color || '#ec4899'; ctx.lineWidth = 2;
        [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        });
    } else if (type === 'sticker') {
        const s = state.stickerTracks[index]; if (!s || currentTime < s.start || currentTime > s.end) { ctx.restore(); return; }
        const sx = s.x * width, sy = s.y * height, sw = s.w * width, sh = s.h * height;
        ctx.strokeStyle = 'rgba(6,182,212,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
        ctx.strokeRect(sx, sy, sw, sh); ctx.setLineDash([]);
        drawCornerHandles(ctx, sx, sy, sw, sh, 'rgba(6,182,212,1)');
    }
    ctx.restore();
}

function drawCornerHandles(ctx, x, y, w, h, color) {
    const sz = 5;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = color; ctx.lineWidth = 2;
    [{ cx: x, cy: y }, { cx: x + w, cy: y }, { cx: x, cy: y + h }, { cx: x + w, cy: y + h }].forEach(p => {
        ctx.fillRect(p.cx - sz, p.cy - sz, sz * 2, sz * 2);
        ctx.strokeRect(p.cx - sz, p.cy - sz, sz * 2, sz * 2);
    });
}

// ===== TIMELINE =====
function getTrackWidth() { return timelineTracksScroll.clientWidth * state.timelineZoom; }
function timeToPixel(time) { return (time / state.duration) * getTrackWidth(); }
function pixelToTime(px) { return (px / getTrackWidth()) * state.duration; }

function setupTimeline() {
    btnPlay.addEventListener('click', togglePlay);
    zoomSlider.addEventListener('input', () => { state.timelineZoom = parseFloat(zoomSlider.value); zoomLabel.textContent = state.timelineZoom.toFixed(1) + 'x'; updateTimelineLayout(); });
    timelineTracksScroll.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); state.timelineZoom = Math.max(1, Math.min(20, state.timelineZoom + (e.deltaY > 0 ? -0.5 : 0.5))); zoomSlider.value = state.timelineZoom; zoomLabel.textContent = state.timelineZoom.toFixed(1) + 'x'; updateTimelineLayout(); }
    }, { passive: false });
    timelineTracksScroll.addEventListener('mousedown', (e) => {
        if (e.target.closest('.clip') || e.target.closest('.clip-handle')) return;
        const rect = timelineTracks.getBoundingClientRect(); seekTo(pixelToTime(e.clientX - rect.left + timelineTracksScroll.scrollLeft));
    });
    timelineTracksScroll.addEventListener('scroll', () => { rulerScroll.scrollLeft = timelineTracksScroll.scrollLeft; drawRuler(); });
    updateTimelineLayout(); renderClips();
}

function updateTimelineLayout() {
    const w = getTrackWidth(); timelineTracks.style.width = w + 'px'; rulerCanvas.width = w;
    drawRuler(); renderClips(); updateScrubberUI();
}

function drawRuler() {
    const rc = rulerCanvas.getContext('2d'), w = rulerCanvas.width, h = 20;
    rc.clearRect(0, 0, w, h); rc.fillStyle = '#1e293b'; rc.fillRect(0, 0, w, h);
    if (!state.duration) return;
    const pxPerSec = w / state.duration;
    let tick = pxPerSec > 200 ? 0.1 : pxPerSec > 100 ? 0.25 : pxPerSec > 50 ? 0.5 : pxPerSec > 20 ? 1 : pxPerSec > 8 ? 2 : 5;
    const major = tick <= 0.25 ? 1 : tick <= 1 ? 5 : 10;
    for (let t = 0; t <= state.duration; t += tick) {
        const x = (t / state.duration) * w, isM = Math.abs(t % major) < 0.001 || Math.abs(t % major - major) < 0.001;
        rc.strokeStyle = isM ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'; rc.lineWidth = 1;
        rc.beginPath(); rc.moveTo(Math.round(x) + 0.5, isM ? 3 : 10); rc.lineTo(Math.round(x) + 0.5, h); rc.stroke();
        if (isM) { rc.fillStyle = '#94a3b8'; rc.font = '8px system-ui,sans-serif'; rc.textAlign = 'center'; rc.fillText(t.toFixed(1) + 's', x, 10); }
    }
}

function togglePlay() {
    if (state.isPlaying) { state.videoElement.pause(); state.isPlaying = false; }
    else { if (state.currentTime >= state.duration) state.currentTime = 0; state.videoElement.currentTime = state.currentTime; state.videoElement.play(); state.isPlaying = true; }
    updatePlayButton();
}
function updatePlayButton() {
    btnPlay.innerHTML = state.isPlaying ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
}
function seekTo(time) { state.currentTime = Math.max(0, Math.min(time, state.duration)); state.videoElement.currentTime = state.currentTime; drawFrame(); updateScrubberUI(); }
function updateScrubberUI() {
    scrubber.style.left = (state.currentTime / state.duration) * getTrackWidth() + 'px';
    const fmt = s => { const m = Math.floor(s / 60), sec = (s % 60).toFixed(1); return m > 0 ? `${m}:${sec.padStart(4, '0')}` : sec + 's'; };
    timeDisplay.textContent = fmt(state.currentTime) + ' / ' + fmt(state.duration);
}

// ===== CLIPS =====
const TRACK_CONFIGS = [
    { id: 'track-video', type: 'video', arr: null, label: 'Video' },
    { id: 'track-zoom', type: 'zoom', arr: () => state.zoomTracks, label: z => `🔍 x${z.scale.toFixed(1)}` },
    { id: 'track-text', type: 'text', arr: () => state.textTracks, label: t => `✏️ ${t.text}` },
    { id: 'track-blur', type: 'blur', arr: () => state.blurTracks, label: b => `🔲 ${b.intensity}px` },
    { id: 'track-shape', type: 'shape', arr: () => state.shapeTracks, label: s => `📐 ${s.shapeType}` },
    { id: 'track-sticker', type: 'sticker', arr: () => state.stickerTracks, label: () => '🖼️ img' },
    { id: 'track-speed', type: 'speed', arr: () => state.speedTracks, label: s => `⚡ ${s.speed}x` },
];

function renderClips() {
    TRACK_CONFIGS.forEach(cfg => {
        const track = document.getElementById(cfg.id); track.innerHTML = '';
        if (cfg.type === 'video') {
            const v = document.createElement('div'); v.className = 'clip video'; v.style.left = '0'; v.style.width = '100%'; v.textContent = 'Video'; track.appendChild(v);
            return;
        }
        cfg.arr().forEach((clip, i) => track.appendChild(createClipElement(clip, i, cfg.type, typeof cfg.label === 'function' ? cfg.label(clip) : cfg.label)));
    });
}

function createClipElement(clip, index, type, label) {
    const el = document.createElement('div');
    const isSel = state.selectedClip?.type === type && state.selectedClip?.index === index;
    el.className = 'clip ' + type + (isSel ? ' selected' : '');
    el.style.left = timeToPixel(clip.start) + 'px';
    el.style.width = Math.max(6, timeToPixel(clip.end) - timeToPixel(clip.start)) + 'px';
    el.textContent = label;

    const hl = document.createElement('div'); hl.className = 'clip-handle clip-handle-left'; el.appendChild(hl);
    const hr = document.createElement('div'); hr.className = 'clip-handle clip-handle-right'; el.appendChild(hr);

    el.addEventListener('mousedown', (e) => { if (e.target.classList.contains('clip-handle')) return; e.stopPropagation(); selectClip(type, index); startClipDrag(e, clip); });
    hl.addEventListener('mousedown', (e) => { e.stopPropagation(); selectClip(type, index); startHandleDrag(e, clip, 'left'); });
    hr.addEventListener('mousedown', (e) => { e.stopPropagation(); selectClip(type, index); startHandleDrag(e, clip, 'right'); });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); if (confirm(`Supprimer ?`)) { getTrackArray(type).splice(index, 1); deselectClip(); renderClips(); } });
    return el;
}

function getTrackArray(type) {
    return { zoom: state.zoomTracks, text: state.textTracks, blur: state.blurTracks, shape: state.shapeTracks, sticker: state.stickerTracks, speed: state.speedTracks }[type];
}

function startClipDrag(e, clip) {
    const startX = e.clientX, origS = clip.start, origE = clip.end, dur = origE - origS;
    const onMove = ev => { const dt = pixelToTime(ev.clientX - startX); let ns = origS + dt, ne = ns + dur; if (ns < 0) { ns = 0; ne = dur; } if (ne > state.duration) { ne = state.duration; ns = ne - dur; } clip.start = ns; clip.end = ne; renderClips(); showProperties(); };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
}

function startHandleDrag(e, clip, side) {
    const startX = e.clientX, orig = side === 'left' ? clip.start : clip.end;
    const onMove = ev => { const dt = pixelToTime(ev.clientX - startX); if (side === 'left') clip.start = Math.max(0, Math.min(clip.end - 0.1, orig + dt)); else clip.end = Math.max(clip.start + 0.1, Math.min(state.duration, orig + dt)); renderClips(); showProperties(); };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
}

function selectClip(type, index) { state.selectedClip = { type, index }; renderClips(); showProperties(); }
function deselectClip() { state.selectedClip = null; renderClips(); showProperties(); }
document.addEventListener('click', e => { if (state.selectedClip && !e.target.closest('.clip') && !e.target.closest('#properties-panel') && !e.target.closest('#tools-panel') && !e.target.closest('#canvas-area')) deselectClip(); });

// ===== PROPERTIES =====
function showProperties() {
    propsPanel.innerHTML = '';
    if (!state.selectedClip) {
        const p = document.createElement('p'); p.className = 'prop-placeholder'; p.textContent = 'Sélectionnez un élément';
        propsPanel.appendChild(p); return;
    }
    const { type, index } = state.selectedClip;
    const handlers = { zoom: showZoomProps, text: showTextProps, blur: showBlurProps, shape: showShapeProps, sticker: showStickerProps, speed: showSpeedProps };
    if (handlers[type]) handlers[type](index);
}

// Helper to create property rows safely
function createPropRow(label, control) {
    const row = document.createElement('div'); row.className = 'prop-row';
    if (label) { const l = document.createElement('label'); l.textContent = label; row.appendChild(l); }
    if (control) row.appendChild(control);
    return row;
}

function createInput(type, val, attrs = {}, onInput) {
    const i = document.createElement('input'); i.type = type;
    if (type === 'checkbox') i.checked = val; else i.value = val;
    for (const [k, v] of Object.entries(attrs)) i.setAttribute(k, v);
    if (onInput) i.addEventListener('input', onInput);
    return i;
}

function createSelect(options, val, onChange) {
    const s = document.createElement('select');
    options.forEach(o => { const opt = document.createElement('option'); opt.value = o.value; opt.textContent = o.label; if (o.value === val) opt.selected = true; s.appendChild(opt); });
    if (onChange) s.addEventListener('change', onChange);
    return s;
}

function createButton(text, onClick, cls = '') {
    const b = document.createElement('button'); b.textContent = text; if (cls) b.className = cls;
    if (onClick) b.addEventListener('click', onClick);
    return b;
}

function appendTimeInputs(clip) {
    const startRow = createPropRow('Début', createInput('number', clip.start.toFixed(2), { step: 0.1, min: 0, max: state.duration.toFixed(2) }, function () { clip.start = parseFloat(this.value) || 0; renderClips(); }));
    startRow.appendChild(document.createElement('span')).className = 'value-label'; startRow.lastChild.textContent = 's';
    propsPanel.appendChild(startRow);

    const endRow = createPropRow('Fin', createInput('number', clip.end.toFixed(2), { step: 0.1, min: 0, max: state.duration.toFixed(2) }, function () { clip.end = parseFloat(this.value) || 0; renderClips(); }));
    endRow.appendChild(document.createElement('span')).className = 'value-label'; endRow.lastChild.textContent = 's';
    propsPanel.appendChild(endRow);
}

function appendDeleteBtn(type, idx) {
    const div = document.createElement('div'); div.className = 'prop-actions';
    div.appendChild(createButton('Supprimer', () => { getTrackArray(type).splice(idx, 1); deselectClip(); }, 'danger'));
    propsPanel.appendChild(div);
}

function showZoomProps(idx) {
    const z = state.zoomTracks[idx]; if (!z) return;
    appendTimeInputs(z);

    const scaleRow = createPropRow('Zoom', createInput('range', z.scale, { min: 1.1, max: 5, step: 0.1 }, function () { z.scale = parseFloat(this.value); this.nextSibling.textContent = (z.scale * 100).toFixed(0) + '%'; renderClips(); }));
    const sl = document.createElement('span'); sl.className = 'value-label'; sl.textContent = (z.scale * 100).toFixed(0) + '%'; scaleRow.appendChild(sl);
    propsPanel.appendChild(scaleRow);

    ['x', 'y'].forEach(axis => {
        const r = createPropRow(axis.toUpperCase(), createInput('range', z[axis], { min: 0, max: 1, step: 0.01 }, function () { z[axis] = parseFloat(this.value); this.nextSibling.textContent = (z[axis] * 100).toFixed(0) + '%'; renderClips(); }));
        const l = document.createElement('span'); l.className = 'value-label'; l.textContent = (z[axis] * 100).toFixed(0) + '%'; r.appendChild(l);
        propsPanel.appendChild(r);
    });
    appendDeleteBtn('zoom', idx);
}

function showTextProps(idx) {
    const t = state.textTracks[idx]; if (!t) return;
    propsPanel.appendChild(createPropRow('Texte', createInput('text', t.text, {}, function () { t.text = this.value; renderClips(); })));
    appendTimeInputs(t);

    const fonts = ['Arial', 'Helvetica', 'Georgia', 'Verdana', 'Impact', 'Courier New', 'Comic Sans MS', 'Trebuchet MS'];
    propsPanel.appendChild(createPropRow('Police', createSelect(fonts.map(f => ({ value: f, label: f })), t.fontFamily, function () { t.fontFamily = this.value; renderClips(); })));

    const szRow = createPropRow('Taille', createInput('range', t.fontSize || 40, { min: 12, max: 120 }, function () { t.fontSize = parseInt(this.value); this.nextSibling.textContent = t.fontSize + 'px'; renderClips(); }));
    const szL = document.createElement('span'); szL.className = 'value-label'; szL.textContent = (t.fontSize || 40) + 'px'; szRow.appendChild(szL);
    propsPanel.appendChild(szRow);

    const colRow = createPropRow('Couleur', createInput('color', t.color || '#ffffff', {}, function () { t.color = this.value; renderClips(); }));
    const toggles = document.createElement('div'); toggles.className = 'prop-toggles';
    const bBtn = createButton('B', function () { t.bold = !t.bold; this.classList.toggle('active'); renderClips(); }, 'prop-toggle' + (t.bold ? ' active' : '')); bBtn.innerHTML = '<b>B</b>';
    const iBtn = createButton('I', function () { t.italic = !t.italic; this.classList.toggle('active'); renderClips(); }, 'prop-toggle' + (t.italic ? ' active' : '')); iBtn.innerHTML = '<i>I</i>';
    toggles.appendChild(bBtn); toggles.appendChild(iBtn);
    colRow.appendChild(toggles);
    propsPanel.appendChild(colRow);

    const strRow = createPropRow('Contour', null);
    const strTog = document.createElement('div'); strTog.className = 'prop-toggles';
    const stInput = createInput('color', t.strokeColor || '#000000', { disabled: !t.stroke }, function () { t.strokeColor = this.value; renderClips(); });
    const stBtn = createButton('On', function () { t.stroke = !t.stroke; this.classList.toggle('active'); stInput.disabled = !t.stroke; renderClips(); }, 'prop-toggle' + (t.stroke ? ' active' : ''));
    strTog.appendChild(stBtn); strRow.appendChild(strTog); strRow.appendChild(stInput);
    propsPanel.appendChild(strRow);

    ['x', 'y'].forEach(axis => {
        const r = createPropRow('Pos ' + axis.toUpperCase(), createInput('range', t[axis], { min: 0, max: 1, step: 0.01 }, function () { t[axis] = parseFloat(this.value); this.nextSibling.textContent = (t[axis] * 100).toFixed(0) + '%'; renderClips(); }));
        const l = document.createElement('span'); l.className = 'value-label'; l.textContent = (t[axis] * 100).toFixed(0) + '%'; r.appendChild(l);
        propsPanel.appendChild(r);
    });
    appendDeleteBtn('text', idx);
}

function showBlurProps(idx) {
    const b = state.blurTracks[idx]; if (!b) return;
    appendTimeInputs(b);
    const pos = getBlurPos(b, state.currentTime);
    const kfCount = b.keyframes ? b.keyframes.length : 1;

    const intRow = createPropRow('Intensité', createInput('range', b.intensity || 10, { min: 1, max: 30 }, function () { b.intensity = parseFloat(this.value); this.nextSibling.textContent = b.intensity + 'px'; renderClips(); }));
    intRow.appendChild(document.createElement('span')).className = 'value-label'; intRow.lastChild.textContent = (b.intensity || 10) + 'px';
    propsPanel.appendChild(intRow);

    // X/Y
    const xRow = createPropRow('X', createInput('range', pos.x, { min: 0, max: 1, step: 0.01 }, function () { setBlurKeyframe(b, state.currentTime, parseFloat(this.value), null); this.nextSibling.textContent = (parseFloat(this.value) * 100).toFixed(0) + '%'; renderClips(); }));
    xRow.appendChild(document.createElement('span')).className = 'value-label'; xRow.lastChild.textContent = (pos.x * 100).toFixed(0) + '%'; propsPanel.appendChild(xRow);

    const yRow = createPropRow('Y', createInput('range', pos.y, { min: 0, max: 1, step: 0.01 }, function () { setBlurKeyframe(b, state.currentTime, null, parseFloat(this.value)); this.nextSibling.textContent = (parseFloat(this.value) * 100).toFixed(0) + '%'; renderClips(); }));
    yRow.appendChild(document.createElement('span')).className = 'value-label'; yRow.lastChild.textContent = (pos.y * 100).toFixed(0) + '%'; propsPanel.appendChild(yRow);

    // W/H
    const wRow = createPropRow('Largeur', createInput('range', b.w, { min: 0.02, max: 1, step: 0.01 }, function () { b.w = parseFloat(this.value); this.nextSibling.textContent = (b.w * 100).toFixed(0) + '%'; renderClips(); }));
    wRow.appendChild(document.createElement('span')).className = 'value-label'; wRow.lastChild.textContent = (b.w * 100).toFixed(0) + '%'; propsPanel.appendChild(wRow);

    const hRow = createPropRow('Hauteur', createInput('range', b.h, { min: 0.02, max: 1, step: 0.01 }, function () { b.h = parseFloat(this.value); this.nextSibling.textContent = (b.h * 100).toFixed(0) + '%'; renderClips(); }));
    hRow.appendChild(document.createElement('span')).className = 'value-label'; hRow.lastChild.textContent = (b.h * 100).toFixed(0) + '%'; propsPanel.appendChild(hRow);

    // Keyframes
    const kfRow = createPropRow('📍 Points', null); kfRow.style.marginTop = '4px';
    const kfL = document.createElement('span'); kfL.className = 'value-label'; kfL.style.flex = 1; kfL.style.textAlign = 'left'; kfL.textContent = `${kfCount} keyframe${kfCount > 1 ? 's' : ''}`;
    kfRow.appendChild(kfL);
    const kfBtn = createButton('➕ Fixer ici', () => { const p = getBlurPos(b, state.currentTime); setBlurKeyframe(b, state.currentTime, p.x, p.y); showBlurProps(idx); });
    kfBtn.style.fontSize = '10px'; kfBtn.style.padding = '3px 8px';
    kfRow.appendChild(kfBtn);
    propsPanel.appendChild(kfRow);

    appendDeleteBtn('blur', idx);
}

function showShapeProps(idx) {
    const s = state.shapeTracks[idx]; if (!s) return;
    appendTimeInputs(s);

    propsPanel.appendChild(createPropRow('Type', createSelect([{ value: 'arrow', label: 'Flèche' }, { value: 'rect', label: 'Rectangle' }, { value: 'circle', label: 'Cercle' }], s.shapeType, function () { s.shapeType = this.value; renderClips(); })));
    propsPanel.appendChild(createPropRow('Couleur', createInput('color', s.color || '#ef4444', {}, function () { s.color = this.value; renderClips(); })));

    const wRow = createPropRow('Épaisseur', createInput('range', s.strokeWidth || 3, { min: 1, max: 10 }, function () { s.strokeWidth = parseInt(this.value); this.nextSibling.textContent = s.strokeWidth + 'px'; renderClips(); }));
    wRow.appendChild(document.createElement('span')).className = 'value-label'; wRow.lastChild.textContent = (s.strokeWidth || 3) + 'px';
    propsPanel.appendChild(wRow);

    appendDeleteBtn('shape', idx);
}

function showStickerProps(idx) {
    const s = state.stickerTracks[idx]; if (!s) return;
    appendTimeInputs(s);

    const opRow = createPropRow('Opacité', createInput('range', s.opacity ?? 1, { min: 0.1, max: 1, step: 0.05 }, function () { s.opacity = parseFloat(this.value); this.nextSibling.textContent = Math.round(s.opacity * 100) + '%'; renderClips(); }));
    opRow.appendChild(document.createElement('span')).className = 'value-label'; opRow.lastChild.textContent = Math.round((s.opacity ?? 1) * 100) + '%';
    propsPanel.appendChild(opRow);

    const szRow = createPropRow('Taille', createInput('range', s.w, { min: 0.02, max: 1, step: 0.01 }, function () { const ratio = s.h / s.w; s.w = parseFloat(this.value); s.h = s.w * ratio; this.nextSibling.textContent = (s.w * 100).toFixed(0) + '%'; renderClips(); }));
    szRow.appendChild(document.createElement('span')).className = 'value-label'; szRow.lastChild.textContent = (s.w * 100).toFixed(0) + '%';
    propsPanel.appendChild(szRow);

    appendDeleteBtn('sticker', idx);
}

function showSpeedProps(idx) {
    const s = state.speedTracks[idx]; if (!s) return;
    appendTimeInputs(s);

    const spRow = createPropRow('Vitesse', createInput('range', s.speed, { min: 0.25, max: 4, step: 0.25 }, function () { s.speed = parseFloat(this.value); this.nextSibling.textContent = s.speed + 'x'; renderClips(); }));
    spRow.appendChild(document.createElement('span')).className = 'value-label'; spRow.lastChild.textContent = s.speed + 'x';
    propsPanel.appendChild(spRow);

    appendDeleteBtn('speed', idx);
}

function escHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

// ===== TOOLS =====
function setupTools() {
    document.getElementById('tool-zoom').addEventListener('click', () => addSimpleClip('zoom'));
    document.getElementById('tool-text').addEventListener('click', () => activateTool('text-place'));
    document.getElementById('tool-blur').addEventListener('click', () => activateTool('blur-place'));
    document.getElementById('tool-speed').addEventListener('click', () => addSpeedClip());
    document.getElementById('tool-arrow').addEventListener('click', () => activateTool('shape-arrow'));
    document.getElementById('tool-rect').addEventListener('click', () => activateTool('shape-rect'));
    document.getElementById('tool-circle').addEventListener('click', () => activateTool('shape-circle'));
    document.getElementById('tool-sticker').addEventListener('click', () => document.getElementById('sticker-file-input').click());
    document.getElementById('sticker-file-input').addEventListener('change', handleStickerImport);
    document.getElementById('btn-export').addEventListener('click', exportGif);
    document.getElementById('btn-discard').addEventListener('click', () => window.close());
}

function activateTool(toolName) {
    if (state.activeTool === toolName) { deactivateTool(); return; }
    deactivateTool();
    state.activeTool = toolName;
    canvasOverlay.classList.add('active-tool');
    // Highlight correct button
    const btnMap = { 'text-place': 'tool-text', 'blur-place': 'tool-blur', 'shape-arrow': 'tool-arrow', 'shape-rect': 'tool-rect', 'shape-circle': 'tool-circle' };
    if (btnMap[toolName]) document.getElementById(btnMap[toolName])?.classList.add('active');
}

function deactivateTool() {
    state.activeTool = null;
    canvasOverlay.classList.remove('active-tool');
    document.querySelectorAll('.tool-btn.active').forEach(b => b.classList.remove('active'));
}

function addSimpleClip(type) {
    const s = state.currentTime, d = Math.min(2, state.duration - s), e = s + d;
    if (type === 'zoom') { state.zoomTracks.push({ start: s, end: e, x: 0.5, y: 0.5, scale: 2 }); selectClip('zoom', state.zoomTracks.length - 1); }
    renderClips();
}

function addSpeedClip() {
    const s = state.currentTime, d = Math.min(2, state.duration - s);
    state.speedTracks.push({ start: s, end: s + d, speed: 2 });
    selectClip('speed', state.speedTracks.length - 1); renderClips();
}

function handleStickerImport(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            const ratio = img.height / img.width;
            const w = 0.2, h = w * ratio;
            const s = state.currentTime, d = Math.min(3, state.duration - s);
            state.stickerTracks.push({ start: s, end: s + d, x: 0.4, y: 0.4, w, h, opacity: 1, _img: img, _src: ev.target.result });
            selectClip('sticker', state.stickerTracks.length - 1); renderClips();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

// ===== CANVAS INTERACTIONS =====
function setupCanvasInteractions() {
    let drawState = null, dragState = null;

    function getMouseNorm(e) {
        const r = canvas.getBoundingClientRect();
        const sx = state.width / r.width, sy = state.height / r.height;
        return { px: (e.clientX - r.left) * sx, py: (e.clientY - r.top) * sy, nx: ((e.clientX - r.left) * sx) / state.width, ny: ((e.clientY - r.top) * sy) / state.height };
    }

    // --- Overlay: tool placement (text, blur, shape drawing) ---
    canvasOverlay.addEventListener('mousedown', (e) => {
        if (!state.activeTool) return;
        const { nx, ny } = getMouseNorm(e);
        if (state.activeTool === 'text-place') {
            const s = state.currentTime, d = Math.min(3, state.duration - s);
            state.textTracks.push({ start: s, end: s + d, x: Math.max(0.05, Math.min(0.95, nx)), y: Math.max(0.05, Math.min(0.95, ny)), text: 'Texte', fontFamily: 'Arial', fontSize: 40, color: '#ffffff', bold: true, italic: false, stroke: true, strokeColor: '#000000' });
            deactivateTool(); selectClip('text', state.textTracks.length - 1); renderClips();
        } else if (state.activeTool === 'blur-place') {
            const s = state.currentTime, d = Math.min(3, state.duration - s);
            const bx = Math.max(0, nx - 0.075), by = Math.max(0, ny - 0.05);
            state.blurTracks.push({ start: s, end: s + d, w: 0.15, h: 0.1, intensity: 10, keyframes: [{ time: s, x: bx, y: by }] });
            deactivateTool(); selectClip('blur', state.blurTracks.length - 1); renderClips();
        } else if (state.activeTool?.startsWith('shape-')) {
            drawState = { shapeType: state.activeTool.replace('shape-', ''), startX: nx, startY: ny };
        }
    });
    canvasOverlay.addEventListener('mousemove', () => { });
    canvasOverlay.addEventListener('mouseup', (e) => {
        if (!drawState) return;
        const { nx, ny } = getMouseNorm(e);
        const s = state.currentTime, d = Math.min(3, state.duration - s);
        state.shapeTracks.push({ start: s, end: s + d, shapeType: drawState.shapeType, x1: drawState.startX, y1: drawState.startY, x2: nx, y2: ny, color: '#ef4444', strokeWidth: 3 });
        drawState = null; deactivateTool();
        selectClip('shape', state.shapeTracks.length - 1); renderClips();
    });

    // --- Canvas: direct manipulation (drag/resize all element types) ---
    const EDGE = 12; // resize handle size in px

    canvas.addEventListener('mousedown', (e) => {
        if (state.activeTool) return;
        const { px, py, nx, ny } = getMouseNorm(e);
        const ct = state.currentTime;

        // 1. Hit-test stickers (top-most first)
        for (let k = state.stickerTracks.length - 1; k >= 0; k--) {
            const s = state.stickerTracks[k];
            if (ct < s.start || ct > s.end) continue;
            const sx = s.x * state.width, sy = s.y * state.height, sw = s.w * state.width, sh = s.h * state.height;
            if (px >= sx - 4 && px <= sx + sw + 4 && py >= sy - 4 && py <= sy + sh + 4) {
                e.preventDefault(); selectClip('sticker', k);
                const edge = getEdge(px, py, sx, sy, sw, sh, EDGE);
                dragState = { type: 'sticker', index: k, startPx: px, startPy: py, origX: s.x, origY: s.y, origW: s.w, origH: s.h, edge }; return;
            }
        }

        // 2. Hit-test blur regions (using interpolated keyframe position)
        for (let k = state.blurTracks.length - 1; k >= 0; k--) {
            const b = state.blurTracks[k];
            if (ct < b.start || ct > b.end) continue;
            const pos = getBlurPos(b, ct);
            const bx = pos.x * state.width, by = pos.y * state.height, bw = b.w * state.width, bh = b.h * state.height;
            if (px >= bx - 4 && px <= bx + bw + 4 && py >= by - 4 && py <= by + bh + 4) {
                e.preventDefault(); selectClip('blur', k);
                const edge = getEdge(px, py, bx, by, bw, bh, EDGE);
                dragState = { type: 'blur', index: k, startPx: px, startPy: py, origX: pos.x, origY: pos.y, origW: b.w, origH: b.h, edge }; return;
            }
        }

        // 3. Hit-test shapes (bounding box)
        for (let k = state.shapeTracks.length - 1; k >= 0; k--) {
            const s = state.shapeTracks[k];
            if (ct < s.start || ct > s.end) continue;
            const sx1 = Math.min(s.x1, s.x2) * state.width, sy1 = Math.min(s.y1, s.y2) * state.height;
            const sx2 = Math.max(s.x1, s.x2) * state.width, sy2 = Math.max(s.y1, s.y2) * state.height;
            const pad = 10;
            if (px >= sx1 - pad && px <= sx2 + pad && py >= sy1 - pad && py <= sy2 + pad) {
                e.preventDefault(); selectClip('shape', k);
                // Detect if near endpoint for resize
                const d1 = Math.hypot(px - s.x1 * state.width, py - s.y1 * state.height);
                const d2 = Math.hypot(px - s.x2 * state.width, py - s.y2 * state.height);
                let handle = 'move';
                if (d1 < 15) handle = 'p1';
                else if (d2 < 15) handle = 'p2';
                dragState = { type: 'shape', index: k, startPx: px, startPy: py, origX1: s.x1, origY1: s.y1, origX2: s.x2, origY2: s.y2, handle }; return;
            }
        }

        // 4. Hit-test text
        for (let k = state.textTracks.length - 1; k >= 0; k--) {
            const t = state.textTracks[k];
            if (ct < t.start || ct > t.end) continue;
            const fs = t.fontSize || 40;
            ctx.font = `${t.italic ? 'italic' : 'normal'} ${t.bold ? 'bold' : 'normal'} ${fs}px "${t.fontFamily || 'sans-serif'}"`;
            const m = ctx.measureText(t.text), tx = t.x * state.width, ty = t.y * state.height;
            if (px >= tx - m.width / 2 - 10 && px <= tx + m.width / 2 + 10 && py >= ty - fs / 2 - 10 && py <= ty + fs / 2 + 10) {
                e.preventDefault(); selectClip('text', k);
                dragState = { type: 'text', index: k, startPx: px, startPy: py, origX: t.x, origY: t.y }; return;
            }
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragState) return;
        const { px, py } = getMouseNorm(e);
        const dx = (px - dragState.startPx) / state.width, dy = (py - dragState.startPy) / state.height;

        if (dragState.type === 'text') {
            const t = state.textTracks[dragState.index]; if (!t) return;
            t.x = clamp(dragState.origX + dx, 0.02, 0.98);
            t.y = clamp(dragState.origY + dy, 0.02, 0.98);
        } else if (dragState.type === 'blur') {
            const b = state.blurTracks[dragState.index]; if (!b) return;
            // For blur: update keyframe at current time, and also resize
            const e = dragState.edge;
            if (e === 'move') {
                const nx = clamp(dragState.origX + dx, 0, 1 - b.w);
                const ny = clamp(dragState.origY + dy, 0, 1 - b.h);
                setBlurKeyframe(b, state.currentTime, nx, ny);
            } else {
                // Resize still uses the flat w/h
                if (e.includes('e')) { b.w = clamp(dragState.origW + dx, 0.02, 1); }
                if (e.includes('s')) { b.h = clamp(dragState.origH + dy, 0.02, 1); }
                if (e.includes('w')) { const newW = clamp(dragState.origW - dx, 0.02, 1); const pos = getBlurPos(b, state.currentTime); setBlurKeyframe(b, state.currentTime, clamp(dragState.origX + dx, 0, 1), pos.y); b.w = newW; }
                if (e.includes('n')) { const newH = clamp(dragState.origH - dy, 0.02, 1); const pos = getBlurPos(b, state.currentTime); setBlurKeyframe(b, state.currentTime, pos.x, clamp(dragState.origY + dy, 0, 1)); b.h = newH; }
            }
        } else if (dragState.type === 'sticker') {
            const s = state.stickerTracks[dragState.index]; if (!s) return;
            applyRectDrag(s, dragState, dx, dy);
        } else if (dragState.type === 'shape') {
            const s = state.shapeTracks[dragState.index]; if (!s) return;
            if (dragState.handle === 'p1') { s.x1 = clamp(dragState.origX1 + dx, 0, 1); s.y1 = clamp(dragState.origY1 + dy, 0, 1); }
            else if (dragState.handle === 'p2') { s.x2 = clamp(dragState.origX2 + dx, 0, 1); s.y2 = clamp(dragState.origY2 + dy, 0, 1); }
            else { const ddx = dx, ddy = dy; s.x1 = clamp(dragState.origX1 + ddx, 0, 1); s.y1 = clamp(dragState.origY1 + ddy, 0, 1); s.x2 = clamp(dragState.origX2 + ddx, 0, 1); s.y2 = clamp(dragState.origY2 + ddy, 0, 1); }
        }
        showProperties();
    });

    document.addEventListener('mouseup', () => { dragState = null; });

    // Update cursor based on hover
    canvas.addEventListener('mousemove', (e) => {
        if (dragState || state.activeTool) return;
        const { px, py } = getMouseNorm(e);
        const ct = state.currentTime;
        let cursor = 'default';

        // Check blur/sticker edges for resize cursor
        for (const arr of [state.blurTracks, state.stickerTracks]) {
            for (let k = arr.length - 1; k >= 0; k--) {
                const item = arr[k]; if (ct < item.start || ct > item.end) continue;
                const isBlur = arr === state.blurTracks;
                const pos = isBlur ? getBlurPos(item, ct) : item;
                const ix = pos.x * state.width, iy = pos.y * state.height, iw = item.w * state.width, ih = item.h * state.height;
                if (px >= ix - 4 && px <= ix + iw + 4 && py >= iy - 4 && py <= iy + ih + 4) {
                    const edge = getEdge(px, py, ix, iy, iw, ih, EDGE);
                    if (edge === 'nw' || edge === 'se') cursor = 'nwse-resize';
                    else if (edge === 'ne' || edge === 'sw') cursor = 'nesw-resize';
                    else if (edge === 'n' || edge === 's') cursor = 'ns-resize';
                    else if (edge === 'e' || edge === 'w') cursor = 'ew-resize';
                    else cursor = 'grab';
                }
            }
        }
        // Check shape endpoints
        for (let k = state.shapeTracks.length - 1; k >= 0; k--) {
            const s = state.shapeTracks[k]; if (ct < s.start || ct > s.end) continue;
            if (Math.hypot(px - s.x1 * state.width, py - s.y1 * state.height) < 15 || Math.hypot(px - s.x2 * state.width, py - s.y2 * state.height) < 15) cursor = 'crosshair';
            else {
                const sx1 = Math.min(s.x1, s.x2) * state.width, sy1 = Math.min(s.y1, s.y2) * state.height;
                const sx2 = Math.max(s.x1, s.x2) * state.width, sy2 = Math.max(s.y1, s.y2) * state.height;
                if (px >= sx1 - 10 && px <= sx2 + 10 && py >= sy1 - 10 && py <= sy2 + 10) cursor = 'grab';
            }
        }
        canvas.style.cursor = cursor;
    });
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function getEdge(px, py, rx, ry, rw, rh, E) {
    const top = Math.abs(py - ry) < E, bot = Math.abs(py - (ry + rh)) < E;
    const left = Math.abs(px - rx) < E, right = Math.abs(px - (rx + rw)) < E;
    if (top && left) return 'nw'; if (top && right) return 'ne';
    if (bot && left) return 'sw'; if (bot && right) return 'se';
    if (top) return 'n'; if (bot) return 's'; if (left) return 'w'; if (right) return 'e';
    return 'move';
}

function applyRectDrag(item, ds, dx, dy) {
    const e = ds.edge;
    if (e === 'move') { item.x = clamp(ds.origX + dx, 0, 1 - item.w); item.y = clamp(ds.origY + dy, 0, 1 - item.h); }
    else {
        if (e.includes('w')) { item.x = clamp(ds.origX + dx, 0, ds.origX + ds.origW - 0.02); item.w = clamp(ds.origW - dx, 0.02, 1); }
        if (e.includes('e')) { item.w = clamp(ds.origW + dx, 0.02, 1 - item.x); }
        if (e.includes('n')) { item.y = clamp(ds.origY + dy, 0, ds.origY + ds.origH - 0.02); item.h = clamp(ds.origH - dy, 0.02, 1); }
        if (e.includes('s')) { item.h = clamp(ds.origH + dy, 0.02, 1 - item.y); }
    }
}

// ===== FORMAT PRESETS =====
function setupFormatPresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.cropPreset = btn.dataset.ratio;
            // Crop overlay would go here for non-free presets
        });
    });
}

// ===== EXPORT =====
async function exportGif() {
    state.videoElement.pause(); state.isPlaying = false;
    const overlay = document.getElementById('rendering-overlay');
    const bar = document.getElementById('progress-bar-fill');
    const txt = document.getElementById('progress-text');
    overlay.style.display = 'flex';

    // Determine export dimensions based on crop preset
    let expW = state.width, expH = state.height;
    if (state.cropPreset !== 'free') {
        const [rw, rh] = state.cropPreset.split(':').map(Number);
        const targetRatio = rw / rh;
        const currentRatio = state.width / state.height;
        if (currentRatio > targetRatio) { expW = Math.round(state.height * targetRatio); } else { expH = Math.round(state.width / targetRatio); }
    }

    // Use offscreen canvas for cropped export
    const expCanvas = document.createElement('canvas'); expCanvas.width = expW; expCanvas.height = expH;
    const expCtx = expCanvas.getContext('2d');

    const gif = new GIF({ workers: 4, quality: state.quality, width: expW, height: expH, workerScript: chrome.runtime.getURL('lib/gif.worker.js') });
    gif.on('progress', p => { txt.textContent = "Encodage GIF..."; bar.style.width = (50 + p * 50) + '%'; });
    gif.on('finished', blob => {
        bar.style.width = '100%'; txt.textContent = "Téléchargement...";
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `giffeur-pro-${Date.now()}.gif`; a.click();
        setTimeout(() => { overlay.style.display = 'none'; }, 1000);
    });

    const step = 1 / state.fps; let t = 0;
    const offsetX = Math.round((state.width - expW) / 2), offsetY = Math.round((state.height - expH) / 2);

    state.videoElement.addEventListener('seeked', function onSeek() {
        drawFrame();

        // Get speed for this frame
        const activeSpeed = state.speedTracks.find(s => t >= s.start && t <= s.end);
        const speed = activeSpeed ? activeSpeed.speed : 1;
        const delay = Math.round((1000 / state.fps) / speed);

        // Copy/crop to export canvas
        expCtx.clearRect(0, 0, expW, expH);
        expCtx.drawImage(canvas, offsetX, offsetY, expW, expH, 0, 0, expW, expH);
        gif.addFrame(expCtx, { copy: true, delay });

        bar.style.width = (t / state.duration * 50) + '%';
        txt.textContent = `Capture ${Math.round(t / state.duration * 100)}%`;

        t += step;
        if (t <= state.duration) { state.currentTime = t; state.videoElement.currentTime = t; }
        else { state.videoElement.removeEventListener('seeked', onSeek); gif.render(); }
    });

    state.currentTime = 0; state.videoElement.currentTime = 0;
}

// ===== IDB =====
function loadRecordingFromIDB(id) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('GiffeurDB', 2);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('recordings')) db.createObjectStore('recordings');
            if (!db.objectStoreNames.contains('gallery')) db.createObjectStore('gallery', { keyPath: 'id' });
        };
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
            const db = req.result;
            // Try gallery first if id is not 'latest'
            if (id !== 'latest' && db.objectStoreNames.contains('gallery')) {
                const tx = db.transaction('gallery', 'readonly');
                const get = tx.objectStore('gallery').get(id);
                get.onsuccess = () => { if (get.result) resolve(get.result); else fallbackLatest(db, resolve, reject); };
                get.onerror = () => fallbackLatest(db, resolve, reject);
            } else { fallbackLatest(db, resolve, reject); }
        };
    });
}

function fallbackLatest(db, resolve, reject) {
    const tx = db.transaction('recordings', 'readonly');
    const get = tx.objectStore('recordings').get('latest');
    get.onsuccess = () => resolve(get.result);
    get.onerror = () => reject(get.error);
}
