/**
 * OpenArcade Gameplay Recorder
 *
 * Captures canvas frames (2fps JPEG), ALL keyboard events, and mouse
 * input (position, clicks, scroll) during gameplay, then uploads them
 * to the SSD ingest hub for training data.
 *
 * Drop-in: add <script src="../recorder.js"></script> to any game page.
 * Always on, no toggle. Silently discards on upload failure.
 */
(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────
  const CAPTURE_INTERVAL_MS = 500;   // 2 fps
  const JPEG_QUALITY = 0.7;
  const SEGMENT_DURATION_MS = 60000; // upload every 60 s
  const INGEST_URL = '/api/ingest/browser';
  const STATE_POLL_MS = 200;
  const MOUSE_THROTTLE_MS = 33;      // ~30 Hz mousemove cap

  // ── State ─────────────────────────────────────────────────────────────
  let canvas = null;
  let collectorId = null;
  let sessionId = null;
  let segmentNum = 0;
  let frames = [];      // [{blob, timestamp_ms}]
  let events = [];      // [{timestamp_ms, type, ...}] — keys, mouse, wheel
  let lastMouseMoveTime = 0;
  let sessionStartTime = null;
  let captureTimer = null;
  let segmentTimer = null;
  let isCapturing = false;
  let gameName = 'unknown';

  // ── Utilities ─────────────────────────────────────────────────────────
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function getCollectorId() {
    var id = null;
    try { id = localStorage.getItem('arcade_collector_id'); } catch (e) { /* private browsing */ }
    if (!id) {
      id = 'browser-' + uuid();
      try { localStorage.setItem('arcade_collector_id', id); } catch (e) {}
    }
    return id;
  }

  function detectGameName() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] !== 'index.html' && parts[i] !== 'keypad.html' && parts[i] !== 'autoplay.html') {
        return parts[i];
      }
    }
    return 'unknown';
  }

  // Detect game state — try JS variable first, fall back to DOM overlay
  function getGameState() {
    // Method 1: direct variable access (works if let is in global lexical scope)
    try { var gs = gameState; if (typeof gs === 'string') return gs; } catch (e) {}

    // Method 2: DOM-based detection from overlay element (all games use this pattern)
    var overlay = document.querySelector('.overlay, #overlay');
    if (!overlay) return null;
    var display = overlay.style.display;
    if (display === 'none') return 'playing';
    var title = overlay.querySelector('h2');
    if (title && /game.over|you.(?:lose|died|crashed)/i.test(title.textContent)) return 'over';
    return 'waiting';
  }

  function getScore() {
    try { if (typeof score !== 'undefined') return score; } catch (e) {}
    try { if (typeof playerScore !== 'undefined') return playerScore; } catch (e) {}
    // Fallback: read from score display element
    var el = document.getElementById('score') || document.querySelector('.score-bar span');
    if (el) { var n = parseInt(el.textContent, 10); if (!isNaN(n)) return n; }
    return 0;
  }

  // ── Frame capture ─────────────────────────────────────────────────────
  function captureFrame() {
    if (!canvas || !isCapturing) return;
    try {
      canvas.toBlob(function (blob) {
        if (blob) frames.push({ blob: blob, timestamp_ms: Date.now() });
      }, 'image/jpeg', JPEG_QUALITY);
    } catch (e) { /* cross-origin or detached canvas — skip */ }
  }

  // ── Session lifecycle ─────────────────────────────────────────────────
  function startSession() {
    if (isCapturing) return;
    isCapturing = true;
    var now = new Date();
    sessionId = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 15);
    sessionStartTime = Date.now();
    segmentNum = 0;
    frames = [];
    events = [];

    captureTimer = setInterval(captureFrame, CAPTURE_INTERVAL_MS);
    scheduleSegment();
  }

  function scheduleSegment() {
    segmentTimer = setTimeout(function () {
      if (!isCapturing) return;
      uploadSegment(false);
      scheduleSegment();
    }, SEGMENT_DURATION_MS);
  }

  function endSession() {
    if (!isCapturing) return;
    isCapturing = false;
    clearInterval(captureTimer);
    clearTimeout(segmentTimer);
    captureTimer = null;
    segmentTimer = null;
    uploadSegment(true);
  }

  // ── Upload ────────────────────────────────────────────────────────────
  function uploadSegment(isFinal) {
    var segFrames = frames.splice(0);
    var segEvents = events.splice(0);
    if (segFrames.length === 0 && segEvents.length === 0) return;

    var currentSeg = segmentNum++;

    // Build concatenated JPEG blob + index
    var blobPromises = segFrames.map(function (f) { return f.blob.arrayBuffer(); });

    Promise.all(blobPromises).then(function (buffers) {
      var totalLen = 0;
      for (var i = 0; i < buffers.length; i++) totalLen += buffers[i].byteLength;

      var combined = new Uint8Array(totalLen);
      var frameIndex = [];
      var offset = 0;
      for (var i = 0; i < buffers.length; i++) {
        combined.set(new Uint8Array(buffers[i]), offset);
        frameIndex.push({
          offset: offset,
          length: buffers[i].byteLength,
          timestamp_ms: segFrames[i].timestamp_ms
        });
        offset += buffers[i].byteLength;
      }

      var metadata = {
        game: gameName,
        session_id: sessionId,
        collector_id: collectorId,
        segment_num: currentSeg,
        is_final: isFinal,
        canvas_width: canvas.width,
        canvas_height: canvas.height,
        duration_ms: Date.now() - sessionStartTime,
        score: getScore(),
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };

      var formData = new FormData();
      formData.append('metadata', JSON.stringify(metadata));
      formData.append('frames', new Blob([combined], { type: 'application/octet-stream' }));
      formData.append('frame_index', JSON.stringify(frameIndex));
      formData.append('events', JSON.stringify(segEvents));

      fetch(INGEST_URL, { method: 'POST', body: formData })
        .then(function (r) { if (r.ok) updateBadge('UPLOADED'); })
        .catch(function () {});
    }).catch(function () {});
  }

  // ── Game state watcher ────────────────────────────────────────────────
  function watchGameState() {
    setInterval(function () {
      var state = getGameState();
      // Update badge with live status
      if (isCapturing) {
        updateBadge('REC ' + frames.length + 'f ' + events.length + 'e');
      } else if (state) {
        updateBadge('TRAINING AI');
      }

      if (state === null) return;

      if (state === 'playing' && !isCapturing) {
        startSession();
      } else if (state === 'over' && isCapturing) {
        endSession();
      }
    }, STATE_POLL_MS);
  }

  // ── Canvas-relative mouse coordinates ────────────────────────────────
  function canvasXY(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top)
    };
  }

  function isInsideCanvas(e) {
    var rect = canvas.getBoundingClientRect();
    return e.clientX >= rect.left && e.clientX <= rect.right &&
           e.clientY >= rect.top  && e.clientY <= rect.bottom;
  }

  // ── Input event listeners (passive, alongside game's own) ──────────
  function setupInputListeners() {
    // Keyboard — capture ALL keys
    document.addEventListener('keydown', function (e) {
      if (!isCapturing) return;
      events.push({ timestamp_ms: Date.now(), type: 'keydown', key: e.key, keyCode: e.keyCode });
    });

    document.addEventListener('keyup', function (e) {
      if (!isCapturing) return;
      events.push({ timestamp_ms: Date.now(), type: 'keyup', key: e.key, keyCode: e.keyCode });
    });

    // Mouse move — throttled to ~30 Hz, canvas-relative, only inside canvas
    document.addEventListener('mousemove', function (e) {
      if (!isCapturing || !isInsideCanvas(e)) return;
      var now = Date.now();
      if (now - lastMouseMoveTime < MOUSE_THROTTLE_MS) return;
      lastMouseMoveTime = now;
      var pos = canvasXY(e);
      events.push({ timestamp_ms: now, type: 'mousemove', x: pos.x, y: pos.y });
    });

    // Mouse buttons — canvas-relative
    document.addEventListener('mousedown', function (e) {
      if (!isCapturing || !isInsideCanvas(e)) return;
      var pos = canvasXY(e);
      events.push({ timestamp_ms: Date.now(), type: 'mousedown', button: e.button, x: pos.x, y: pos.y });
    });

    document.addEventListener('mouseup', function (e) {
      if (!isCapturing || !isInsideCanvas(e)) return;
      var pos = canvasXY(e);
      events.push({ timestamp_ms: Date.now(), type: 'mouseup', button: e.button, x: pos.x, y: pos.y });
    });

    document.addEventListener('click', function (e) {
      if (!isCapturing || !isInsideCanvas(e)) return;
      var pos = canvasXY(e);
      events.push({ timestamp_ms: Date.now(), type: 'click', button: e.button, x: pos.x, y: pos.y });
    });

    // Scroll wheel — canvas-relative
    document.addEventListener('wheel', function (e) {
      if (!isCapturing || !isInsideCanvas(e)) return;
      var pos = canvasXY(e);
      events.push({ timestamp_ms: Date.now(), type: 'wheel', deltaX: e.deltaX, deltaY: e.deltaY, x: pos.x, y: pos.y });
    }, { passive: true });
  }

  // ── Heartbeat (tracks online presence) ───────────────────────────────
  var HEARTBEAT_URL = '/api/events/heartbeat';
  var HEARTBEAT_INTERVAL_MS = 30000; // 30s

  function startHeartbeat() {
    sendHeartbeat(); // send immediately
    setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }

  function sendHeartbeat() {
    try {
      navigator.sendBeacon(HEARTBEAT_URL, JSON.stringify({
        game: gameName,
        visitor_id: collectorId,
        timestamp: new Date().toISOString()
      }));
    } catch (e) { /* silent */ }
  }

  // ── Page unload handler ───────────────────────────────────────────────
  function setupUnloadHandler() {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && isCapturing) {
        endSession();
      }
    });
  }

  // ── Training badge ────────────────────────────────────────────────────
  var badgeEl = null;

  function showTrainingBadge() {
    badgeEl = document.createElement('div');
    badgeEl.textContent = 'TRAINING AI';
    badgeEl.style.cssText = [
      'position:fixed',
      'bottom:12px',
      'right:12px',
      'background:rgba(0,255,136,0.12)',
      'border:1px solid rgba(0,255,136,0.35)',
      'color:#0f8',
      "font-family:'Courier New',monospace",
      'font-size:10px',
      'font-weight:bold',
      'padding:4px 10px',
      'border-radius:4px',
      'letter-spacing:2px',
      'z-index:9999',
      'pointer-events:none',
      'user-select:none'
    ].join(';');
    document.body.appendChild(badgeEl);
  }

  function updateBadge(text) {
    if (badgeEl) badgeEl.textContent = text;
  }

  // ── Init ──────────────────────────────────────────────────────────────
  function init() {
    canvas = document.querySelector('canvas#game') || document.querySelector('canvas');
    if (!canvas) return;

    gameName = detectGameName();
    collectorId = getCollectorId();

    setupInputListeners();
    setupUnloadHandler();
    showTrainingBadge();
    startHeartbeat();
    watchGameState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
