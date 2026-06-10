/*
 * Claude Bell – content.js
 * Watches claude.ai for the "stop generating" button to disappear,
 * which reliably signals that a response has finished streaming.
 * No user data is collected or transmitted.
 */

(function () {
  'use strict';

  let wasGenerating = false;
  let audioCtx = null;
  let settings = { enabled: true, volume: 70, sound: 'chime', notifications: true };
  let debounceTimer = null;

  // Opt-in debug logging: run `localStorage.doneChimeDebug = '1'` in the
  // claude.ai console, reload, and watch for "[Done Chime]" messages.
  const DEBUG = (() => {
    try { return localStorage.getItem('doneChimeDebug') === '1'; } catch (e) { return false; }
  })();
  function log(...args) { if (DEBUG) console.log('[Done Chime]', ...args); }

  // Load persisted settings
  chrome.storage.local.get(['enabled', 'volume', 'sound', 'notifications'], (data) => {
    if (data.enabled !== undefined)       settings.enabled       = data.enabled;
    if (data.volume !== undefined)        settings.volume        = data.volume;
    if (data.sound !== undefined)         settings.sound         = data.sound;
    if (data.notifications !== undefined) settings.notifications = data.notifications;
  });

  // Keep settings in sync if user changes them while tab is open
  chrome.storage.onChanged.addListener((changes) => {
    for (const key in changes) {
      settings[key] = changes[key].newValue;
    }
  });

  // Lazy-init AudioContext (must be after a user gesture on some browsers,
  // but MV3 content scripts are fine once the page is interacted with)
  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function tone(ac, freq, gainVal, startTime, duration) {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  function playSound() {
    try {
      const ac  = getAudioCtx();
      const vol = (settings.volume ?? 70) / 100;
      const now = ac.currentTime;

      switch (settings.sound) {
        case 'bell':
          [523.25, 659.25, 783.99].forEach((f, i) => tone(ac, f, vol * 0.45, now + i * 0.06, 1.8));
          break;
        case 'ding':
          tone(ac, 880, vol * 0.5, now, 1.2);
          break;
        case 'soft':
          tone(ac, 1046.5, vol * 0.3, now, 0.8);
          break;
        case 'chime':
        default:
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, vol * 0.4, now + i * 0.18, 1.5));
          break;
      }
    } catch (e) {
      // Silently fail – audio is non-critical
    }
  }

  /*
   * isGenerating()
   * Claude's UI has changed a few times. We use multiple independent
   * strategies so a future UI update is unlikely to break all of them.
   *
   * Strategy 0: a message element with data-is-streaming="true" (most reliable;
   *             Claude marks the in-progress response this way while it streams)
   * Strategy 1: aria-label containing "stop" (semantic stop button)
   * Strategy 2: data-testid containing "stop"
   * Strategy 3: SVG <title> text "Stop" inside a button
   * Strategy 4: Button with a square/stop icon via role heuristics
   */
  function isGenerating() {
    // Strategy 0 – streaming flag on the response element
    if (document.querySelector('[data-is-streaming="true"]')) return true;

    // Strategy 1 – aria-label
    if (document.querySelector('button[aria-label*="stop" i]')) return true;

    // Strategy 2 – data-testid
    if (document.querySelector('button[data-testid*="stop" i]')) return true;

    // Strategy 3 – SVG title inside a button
    const svgTitles = document.querySelectorAll('button svg title');
    for (const t of svgTitles) {
      if (t.textContent.trim().toLowerCase() === 'stop') return true;
    }

    // Strategy 4 – button contains a square stop-shape path (heuristic)
    // Claude renders a filled square SVG rect inside the stop button
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const rect = btn.querySelector('svg rect');
      if (rect) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const title = (btn.querySelector('title') || {}).textContent || '';
        // Only match if nothing else suggests it's a different button
        if (label === '' && title === '' && btn.querySelector('svg')) {
          // Check parent context – stop button is near the input area
          const form = btn.closest('form, [data-testid*="composer"], footer, .composer, main');
          if (form) return true;
        }
      }
    }

    return false;
  }

  function onResponseDone() {
    if (!settings.enabled) return;
    playSound();
    if (settings.notifications) {
      chrome.runtime.sendMessage({ type: 'notify' }).catch(() => {});
    }
  }

  // Debounce to avoid firing multiple times on rapid DOM churn
  function handleMutation() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const generating = isGenerating();
      if (generating !== wasGenerating) {
        log(generating ? 'generation started' : 'generation finished');
      }
      if (wasGenerating && !generating) {
        onResponseDone();
      }
      wasGenerating = generating;
    }, 120);
  }

  const observer = new MutationObserver(handleMutation);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-label', 'data-testid', 'data-is-streaming', 'disabled', 'aria-disabled']
  });

  // Unlock/resume the AudioContext on the first user interaction with the page
  // so the chime can play even when the tab is later in the background.
  ['pointerdown', 'keydown'].forEach((ev) => {
    window.addEventListener(ev, () => { try { getAudioCtx(); } catch (e) {} }, { once: true, capture: true });
  });

  log('content script loaded; debug logging on');
})();
