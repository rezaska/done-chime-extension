/*
 * Claude Bell – popup.js
 */
(function () {
  'use strict';

  const enabledToggle = document.getElementById('enabledToggle');
  const enabledLabel  = document.getElementById('enabledLabel');
  const soundSelect   = document.getElementById('soundSelect');
  const volSlider     = document.getElementById('volSlider');
  const volVal        = document.getElementById('volVal');
  const notifToggle   = document.getElementById('notifToggle');
  const previewBtn    = document.getElementById('previewBtn');
  const statusEl      = document.getElementById('status');

  let statusTimer = null;

  function setStatus(msg) {
    clearTimeout(statusTimer);
    statusEl.textContent = msg;
    statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 2200);
  }

  function updateLabel() {
    enabledLabel.textContent = enabledToggle.checked ? 'On' : 'Off';
  }

  // Load saved settings
  chrome.storage.local.get(['enabled', 'volume', 'sound', 'notifications'], (data) => {
    if (data.enabled !== undefined)       enabledToggle.checked = data.enabled;
    if (data.volume !== undefined)        { volSlider.value = data.volume; volVal.textContent = data.volume + '%'; }
    if (data.sound !== undefined)         soundSelect.value = data.sound;
    if (data.notifications !== undefined) notifToggle.checked = data.notifications;
    updateLabel();
  });

  enabledToggle.addEventListener('change', () => {
    chrome.storage.local.set({ enabled: enabledToggle.checked });
    updateLabel();
  });

  soundSelect.addEventListener('change', () => {
    chrome.storage.local.set({ sound: soundSelect.value });
  });

  volSlider.addEventListener('input', () => {
    const v = parseInt(volSlider.value, 10);
    volVal.textContent = v + '%';
    volSlider.setAttribute('aria-valuetext', v + ' percent');
    chrome.storage.local.set({ volume: v });
  });

  notifToggle.addEventListener('change', () => {
    chrome.storage.local.set({ notifications: notifToggle.checked });
  });

  previewBtn.addEventListener('click', () => {
    playPreview(soundSelect.value, parseInt(volSlider.value, 10));
    setStatus('Playing…');
  });

  // ── Audio preview (runs in popup context, separate from content script) ──
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

  function playPreview(type, vol) {
    try {
      const ac  = new (window.AudioContext || window.webkitAudioContext)();
      const v   = vol / 100;
      const now = ac.currentTime;

      switch (type) {
        case 'bell':
          [523.25, 659.25, 783.99].forEach((f, i) => tone(ac, f, v * 0.45, now + i * 0.06, 1.8));
          break;
        case 'ding':
          tone(ac, 880, v * 0.5, now, 1.2);
          break;
        case 'soft':
          tone(ac, 1046.5, v * 0.3, now, 0.8);
          break;
        case 'chime':
        default:
          [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ac, f, v * 0.4, now + i * 0.18, 1.5));
          break;
      }
    } catch (e) {
      setStatus('Audio error – try again');
    }
  }
})();
