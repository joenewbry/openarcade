/**
 * OpenArcade Game Rating Widget
 *
 * Drop-in: add <script src="../rating.js"></script> to any game page.
 * Detects game-over state, shows a non-obtrusive 5-star rating bar.
 * If user rates, expands to optional text feedback.
 * Sends data to POST /api/events/rating on the ingest hub.
 * Does NOT block game restart — widget sits outside the overlay.
 */
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────
  var RATING_URL = '/api/events/rating';
  var SHOW_DELAY_MS = 800; // delay after game-over before showing widget

  // ── State ───────────────────────────────────────────────
  var gameName = detectGameName();
  var visitorId = localStorage.getItem('arcade_collector_id') || 'anon';
  var sessionRated = false;
  var widget = null;
  var currentRating = 0;

  function detectGameName() {
    var path = window.location.pathname;
    var parts = path.split('/').filter(Boolean);
    // e.g. /tetris/index.html -> tetris
    for (var i = parts.length - 1; i >= 0; i--) {
      if (parts[i] !== 'index.html' && parts[i] !== 'keypad.html') return parts[i];
    }
    return 'unknown';
  }

  // ── Build widget DOM ────────────────────────────────────
  function createWidget() {
    var container = document.createElement('div');
    container.id = 'arcade-rating';
    container.innerHTML =
      '<div class="ar-prompt">Rate this game</div>' +
      '<div class="ar-stars">' +
        '<span class="ar-star" data-v="1">&#9733;</span>' +
        '<span class="ar-star" data-v="2">&#9733;</span>' +
        '<span class="ar-star" data-v="3">&#9733;</span>' +
        '<span class="ar-star" data-v="4">&#9733;</span>' +
        '<span class="ar-star" data-v="5">&#9733;</span>' +
      '</div>' +
      '<div class="ar-feedback" style="display:none;">' +
        '<textarea class="ar-textarea" placeholder="Any feedback? (optional)" rows="2" maxlength="500"></textarea>' +
        '<button class="ar-submit">Send</button>' +
      '</div>' +
      '<div class="ar-thanks" style="display:none;">Thanks!</div>' +
      '<button class="ar-dismiss">&times;</button>';

    // Inject styles
    var style = document.createElement('style');
    style.textContent =
      '#arcade-rating {' +
        'position: fixed; bottom: 20px; right: 20px; z-index: 9999;' +
        'background: #16213e; border: 1px solid #0f3460; border-radius: 12px;' +
        'padding: 14px 18px; font-family: "Courier New", monospace;' +
        'box-shadow: 0 4px 24px rgba(0,0,0,0.5); max-width: 260px;' +
        'opacity: 0; transform: translateY(20px);' +
        'transition: opacity 0.3s, transform 0.3s;' +
      '}' +
      '#arcade-rating.ar-visible { opacity: 1; transform: translateY(0); }' +
      '#arcade-rating.ar-hidden { display: none; }' +
      '.ar-prompt { color: #888; font-size: 0.8rem; margin-bottom: 6px; }' +
      '.ar-stars { display: flex; gap: 4px; }' +
      '.ar-star {' +
        'font-size: 1.6rem; color: #333; cursor: pointer;' +
        'transition: color 0.15s, transform 0.15s;' +
      '}' +
      '.ar-star:hover, .ar-star.ar-hover { color: #fd0; transform: scale(1.15); }' +
      '.ar-star.ar-active { color: #fd0; }' +
      '.ar-feedback { margin-top: 10px; }' +
      '.ar-textarea {' +
        'width: 100%; background: #0d1a33; border: 1px solid #0f3460;' +
        'border-radius: 6px; color: #e0e0e0; padding: 8px; font-size: 0.8rem;' +
        'font-family: "Courier New", monospace; resize: none; outline: none;' +
      '}' +
      '.ar-textarea:focus { border-color: #0ff; }' +
      '.ar-submit {' +
        'margin-top: 6px; padding: 6px 16px; background: rgba(0,255,255,0.1);' +
        'border: 1px solid #0ff; border-radius: 6px; color: #0ff;' +
        'font-family: "Courier New", monospace; font-size: 0.8rem;' +
        'cursor: pointer; transition: background 0.2s;' +
      '}' +
      '.ar-submit:hover { background: rgba(0,255,255,0.2); }' +
      '.ar-thanks { color: #0f8; font-size: 0.9rem; margin-top: 8px; }' +
      '.ar-dismiss {' +
        'position: absolute; top: 6px; right: 8px; background: none;' +
        'border: none; color: #555; font-size: 1.1rem; cursor: pointer;' +
        'line-height: 1; padding: 2px 4px;' +
      '}' +
      '.ar-dismiss:hover { color: #aaa; }';
    document.head.appendChild(style);
    document.body.appendChild(container);

    // Block ALL keyboard events from reaching the game while widget is visible
    ['keydown', 'keyup', 'keypress'].forEach(function (evt) {
      container.addEventListener(evt, function (e) {
        e.stopPropagation();
      });
    });

    // Wire up stars
    var stars = container.querySelectorAll('.ar-star');
    stars.forEach(function (star) {
      star.addEventListener('mouseenter', function () {
        var v = parseInt(star.getAttribute('data-v'));
        stars.forEach(function (s) {
          s.classList.toggle('ar-hover', parseInt(s.getAttribute('data-v')) <= v);
        });
      });
      star.addEventListener('mouseleave', function () {
        stars.forEach(function (s) { s.classList.remove('ar-hover'); });
      });
      star.addEventListener('click', function () {
        currentRating = parseInt(star.getAttribute('data-v'));
        stars.forEach(function (s) {
          s.classList.toggle('ar-active', parseInt(s.getAttribute('data-v')) <= currentRating);
        });
        // Show feedback area
        container.querySelector('.ar-feedback').style.display = 'block';
        sendRating(currentRating, '');
      });
    });

    // Wire up submit feedback
    container.querySelector('.ar-submit').addEventListener('click', function () {
      var feedback = container.querySelector('.ar-textarea').value.trim();
      if (feedback) {
        sendRating(currentRating, feedback);
      }
      container.querySelector('.ar-feedback').style.display = 'none';
      container.querySelector('.ar-thanks').style.display = 'block';
      sessionRated = true;
      setTimeout(function () { hideWidget(); }, 1500);
    });

    // Wire up dismiss
    container.querySelector('.ar-dismiss').addEventListener('click', function () {
      hideWidget();
      sessionRated = true; // don't show again this session
    });

    return container;
  }

  function showWidget() {
    if (sessionRated) return;
    if (!widget) widget = createWidget();
    widget.classList.remove('ar-hidden');
    // Reset state
    currentRating = 0;
    widget.querySelectorAll('.ar-star').forEach(function (s) { s.classList.remove('ar-active'); });
    widget.querySelector('.ar-feedback').style.display = 'none';
    widget.querySelector('.ar-thanks').style.display = 'none';
    // Trigger animation
    requestAnimationFrame(function () {
      widget.classList.add('ar-visible');
    });
  }

  function hideWidget() {
    if (!widget) return;
    widget.classList.remove('ar-visible');
    setTimeout(function () { widget.classList.add('ar-hidden'); }, 300);
  }

  function sendRating(rating, feedback) {
    var payload = {
      event: 'game_rating',
      game: gameName,
      rating: rating,
      feedback: feedback || '',
      visitor_id: visitorId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent
    };
    try {
      navigator.sendBeacon(RATING_URL, JSON.stringify(payload));
    } catch (e) { /* silent */ }
  }

  // ── Detect game-over via overlay visibility ─────────────
  // All OpenArcade games show the #overlay div on game-over
  function watchForGameOver() {
    var overlay = document.getElementById('overlay');
    if (!overlay) return;

    var lastState = overlay.style.display;
    var observer = new MutationObserver(function () {
      var nowVisible = overlay.style.display === 'flex';
      var wasHidden = lastState !== 'flex';
      lastState = overlay.style.display;

      if (nowVisible && wasHidden) {
        // Check if it's game-over (not the initial waiting screen)
        var title = overlay.querySelector('#overlayTitle');
        if (title && /game over|you (win|lose|died|crashed)|time.?s up|final|score/i.test(title.textContent)) {
          setTimeout(showWidget, SHOW_DELAY_MS);
        }
      } else if (!nowVisible) {
        // Game restarted — hide widget
        hideWidget();
      }
    });

    observer.observe(overlay, { attributes: true, attributeFilter: ['style'] });
  }

  // ── Init ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchForGameOver);
  } else {
    watchForGameOver();
  }

})();
