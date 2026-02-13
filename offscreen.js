// ===== GIFFEUR - Offscreen Document =====
// Capture stream, record via MediaRecorder, save to IDB for Editor

let recording = {
  isRecording: false,
  mediaStream: null,
  mediaRecorder: null,
  chunks: [],
  intervalId: null,

  // Config
  fps: 15, // Actually driven by stream now
  width: 0,
  height: 0,
  quality: 10
};

// ===== MESSAGE LISTENER =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'offscreen-start-recording':
      startRecording(message);
      sendResponse({ success: true });
      break;

    case 'offscreen-stop-recording':
      stopRecording();
      sendResponse({ success: true });
      break;
  }
  return true;
});

// ===== START RECORDING =====
async function startRecording(config) {
  try {
    recording.isRecording = true;
    recording.chunks = [];
    recording.quality = config.quality || 10;
    recording.fps = config.fps || 15;

    // Use Aspect Ratio Compensation logic to get precise stream
    // Actually, MediaRecorder records the stream as is.
    // If we want to crop (Aspect Ratio), we might need to use a Canvas intermediate?
    // YES. If we just record the tab stream, we get the whole tab (including letterboxing).
    // The Editor needs to crop it? OR we crop it here?

    // To keep it simple for now: Record the stream. 
    // The Editor will crop based on parameters passed?
    // OR we use the Canvas intermediate approach BUT pipe the Canvas stream to MediaRecorder?
    // Canvas approach allows us to "burn in" the crop and shape (rounded corners).
    // If we just record the raw stream, the Editor has to handle cropping and shaping.
    // Since we already have robust Canvas logic in previous `offscreen.js`, let's Reuse it!

    // STRATEGY:
    // Keep Capture logic (Canvas drawImage with cropping).
    // BUT instead of pushing standard ImageData to array (RAM heavy),
    // pipe Canvas to MediaStream -> MediaRecorder.

    const areaW = Math.round(config.area.width);
    const areaH = Math.round(config.area.height);
    recording.width = areaW;
    recording.height = areaH;

    // 1. Get Source Stream
    const sourceStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: config.streamId,
          maxWidth: 3840,
          maxHeight: 2160,
          maxFrameRate: config.fps
        }
      }
    });

    // 2. Setup Canvas for Cropping/Shaping
    const canvas = document.createElement('canvas');
    canvas.width = areaW;
    canvas.height = areaH;
    const ctx = canvas.getContext('2d', { alpha: true }); // Alpha true for transparency

    // 3. Source Video Element
    const video = document.createElement('video');
    video.srcObject = sourceStream;
    video.autoplay = true;
    video.muted = true;
    await new Promise(r => video.onloadedmetadata = r);
    video.play();

    // 4. Canvas Drawing Loop
    // Logic from previous offscreen.js to handle Aspect Ratio & Shapes
    recording.intervalId = setInterval(() => {
      drawFrame(video, ctx, canvas, config);
    }, 1000 / recording.fps);

    // 5. Capture Canvas Stream
    const canvasStream = canvas.captureStream(recording.fps);

    // 6. Start MediaRecorder
    // Use VP9 for better compression/quality ratio? Or default.
    // mimeType: 'video/webm;codecs=vp9'
    let options = { mimeType: 'video/webm;codecs=vp9' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
    }

    recording.mediaRecorder = new MediaRecorder(canvasStream, options);

    recording.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recording.chunks.push(event.data);
      }
    };

    recording.mediaRecorder.onstop = async () => {
      // Create Blob
      const blob = new Blob(recording.chunks, { type: 'video/webm' });
      console.log(`[Offscreen] Recording finished. Blob size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

      // Save to IndexedDB
      await saveToIDB(blob, recording.width, recording.height, recording.fps);

      // Notify Background to open Editor
      chrome.runtime.sendMessage({ action: 'offscreen-recording-complete' });

      // Cleanup
      sourceStream.getTracks().forEach(t => t.stop());
      canvasStream.getTracks().forEach(t => t.stop());
      if (recording.intervalId) clearInterval(recording.intervalId);
    };

    recording.mediaRecorder.start();
    console.log('[Offscreen] MediaRecorder started');

  } catch (err) {
    console.error('[Offscreen] Start error:', err);
    chrome.runtime.sendMessage({ action: 'offscreen-recording-error', error: err.message });
  }
}

function stopRecording() {
  if (recording.mediaRecorder && recording.mediaRecorder.state !== 'inactive') {
    recording.mediaRecorder.stop();
  }
  recording.isRecording = false;
}

// ===== DRAW LOGIC (Reuse from previous robust version) =====
function drawFrame(video, ctx, canvas, config) {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  if (videoWidth === 0 || videoHeight === 0) return;

  const area = config.area;
  // Win dimensions might be passed or use video dims
  const winW = config.winW || config.tabWidth || videoWidth;
  const winH = config.winH || config.tabHeight || videoHeight;

  // Aspect Ratio Math (Letterbox detection)
  let contentWidth = videoWidth;
  let contentHeight = videoHeight;
  let offsetX = 0;
  let offsetY = 0;

  const videoRatio = videoWidth / videoHeight;
  const windowRatio = winW / winH;

  if (Math.abs(videoRatio - windowRatio) > 0.01) {
    if (videoRatio > windowRatio) {
      contentWidth = videoHeight * windowRatio;
      offsetX = (videoWidth - contentWidth) / 2;
    } else {
      contentHeight = videoWidth / windowRatio;
      offsetY = (videoHeight - contentHeight) / 2;
    }
  }

  const scaleX = contentWidth / winW;
  const scaleY = contentHeight / winH;

  const sourceX = Math.round(offsetX + (area.left * scaleX));
  const sourceY = Math.round(offsetY + (area.top * scaleY));
  const sourceWidth = Math.round(area.width * scaleX);
  const sourceHeight = Math.round(area.height * scaleY);

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Transparent clear

  ctx.save();
  ctx.beginPath();

  // Shapes
  const shape = config.shape || 'free';
  const radius = parseInt(config.borderRadius) || 0;

  if (shape === 'circle') {
    ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, Math.PI * 2);
  } else {
    // Rounded Rect
    if (ctx.roundRect) ctx.roundRect(0, 0, canvas.width, canvas.height, radius);
    else ctx.rect(0, 0, canvas.width, canvas.height);
  }
  ctx.clip();

  ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// ===== IDB HELPER =====
function saveToIDB(blob, width, height, fps) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GiffeurDB', 2);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('recordings')) {
        db.createObjectStore('recordings');
      }
      if (!db.objectStoreNames.contains('gallery')) {
        db.createObjectStore('gallery', { keyPath: 'id' });
      }
    };

    request.onsuccess = async (e) => {
      const db = e.target.result;
      const timestamp = Date.now();
      const id = 'rec-' + timestamp;

      // Generate thumbnail
      let thumbnail = '';
      try { thumbnail = await generateThumbnail(blob, width, height); } catch (err) { console.warn('Thumbnail gen failed:', err); }

      const data = { blob, width, height, fps, timestamp };
      const galleryData = { id, blob, width, height, fps, timestamp, thumbnail };

      // Save to 'latest' for backward compat
      const tx1 = db.transaction('recordings', 'readwrite');
      tx1.objectStore('recordings').put(data, 'latest');
      await new Promise((r, j) => { tx1.oncomplete = r; tx1.onerror = () => j(tx1.error); });

      // Save to gallery
      const tx2 = db.transaction('gallery', 'readwrite');
      tx2.objectStore('gallery').put(galleryData);
      await new Promise((r, j) => { tx2.oncomplete = r; tx2.onerror = () => j(tx2.error); });

      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

function generateThumbnail(blob, width, height) {
  return new Promise((resolve, reject) => {
    // Timeout fallback — don't block saving if thumbnail fails
    const timeout = setTimeout(() => {
      console.warn('[Offscreen] Thumbnail generation timed out');
      resolve('');
    }, 3000);

    try {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(blob);
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        // Only seek AFTER video data is loaded
        video.onseeked = () => {
          try {
            const c = document.createElement('canvas');
            const scale = Math.min(320 / width, 180 / height, 1);
            c.width = Math.round(width * scale);
            c.height = Math.round(height * scale);
            c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
            clearTimeout(timeout);
            resolve(c.toDataURL('image/jpeg', 0.7));
          } catch (e) {
            clearTimeout(timeout);
            resolve('');
          }
          URL.revokeObjectURL(video.src);
        };
        video.currentTime = 0.1; // Trigger seek AFTER loadeddata
      };

      video.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(video.src);
        resolve('');
      };
    } catch (e) {
      clearTimeout(timeout);
      resolve('');
    }
  });
}

