// ===== GIFFEUR GALLERY =====
const grid = document.getElementById('gallery-grid');
const emptyState = document.getElementById('empty-state');
const countLabel = document.getElementById('count-label');

document.addEventListener('DOMContentLoaded', loadGallery);
document.getElementById('btn-clear-all').addEventListener('click', clearAll);

async function loadGallery() {
    try {
        const items = await getAllRecordings();
        if (items.length === 0) { grid.style.display = 'none'; emptyState.style.display = 'flex'; countLabel.textContent = '0 enregistrements'; return; }
        grid.style.display = 'grid'; emptyState.style.display = 'none';
        countLabel.textContent = items.length + ' enregistrement' + (items.length > 1 ? 's' : '');
        grid.innerHTML = '';
        items.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        items.forEach(item => grid.appendChild(createCard(item)));
    } catch (e) { console.error('Gallery load error:', e); }
}

function createCard(item) {
    const card = document.createElement('div');
    card.className = 'gallery-card';

    const thumb = document.createElement('img');
    thumb.className = 'card-thumb';
    thumb.src = item.thumbnail || '';
    thumb.alt = 'Recording thumbnail';
    thumb.onerror = () => { thumb.style.background = '#1e293b'; };

    const info = document.createElement('div');
    info.className = 'card-info';

    const date = document.createElement('div');
    date.className = 'card-date';
    date.textContent = item.timestamp ? new Date(item.timestamp).toLocaleString('fr-FR') : 'Date inconnue';

    const meta = document.createElement('div');
    meta.className = 'card-meta';

    const resSpan = document.createElement('span');
    resSpan.textContent = `${item.width || '?'}×${item.height || '?'}`;
    meta.appendChild(resSpan);

    const fpsSpan = document.createElement('span');
    fpsSpan.textContent = `${item.fps || '?'} FPS`;
    meta.appendChild(fpsSpan);

    if (item.blob) {
        const sizeSpan = document.createElement('span');
        sizeSpan.textContent = `${(item.blob.size / 1024 / 1024).toFixed(1)} MB`;
        meta.appendChild(sizeSpan);
    }

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️ Éditer';
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); openInEditor(item.id); });

    const delBtn = document.createElement('button');
    delBtn.className = 'danger';
    delBtn.textContent = '🗑️ Supprimer';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteRecording(item.id); });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    info.appendChild(date);
    info.appendChild(meta);
    info.appendChild(actions);
    card.appendChild(thumb);
    card.appendChild(info);
    card.addEventListener('click', () => openInEditor(item.id));
    return card;
}

function openInEditor(id) {
    chrome.tabs.create({ url: chrome.runtime.getURL('editor.html') + '?id=' + encodeURIComponent(id) });
}

async function deleteRecording(id) {
    if (!confirm('Supprimer cet enregistrement ?')) return;
    const db = await openDB();
    const tx = db.transaction('gallery', 'readwrite');
    tx.objectStore('gallery').delete(id);
    await new Promise((r, j) => { tx.oncomplete = r; tx.onerror = () => j(tx.error); });
    loadGallery();
}

async function clearAll() {
    if (!confirm('Supprimer tous les enregistrements ?')) return;
    const db = await openDB();
    const tx = db.transaction('gallery', 'readwrite');
    tx.objectStore('gallery').clear();
    await new Promise((r, j) => { tx.oncomplete = r; tx.onerror = () => j(tx.error); });
    loadGallery();
}

async function getAllRecordings() {
    const db = await openDB();
    if (!db.objectStoreNames.contains('gallery')) return [];
    const tx = db.transaction('gallery', 'readonly');
    const req = tx.objectStore('gallery').getAll();
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('GiffeurDB', 2);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('recordings')) db.createObjectStore('recordings');
            if (!db.objectStoreNames.contains('gallery')) db.createObjectStore('gallery', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
