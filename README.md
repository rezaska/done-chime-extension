# Done Chime for Claude

A lightweight Chrome extension that plays a chime and shows a desktop notification when [Claude](https://claude.ai) finishes a response — so you can multitask freely without watching the tab.

**[Install from the Chrome Web Store →](https://chromewebstore.google.com/detail/done-chime-for-claude/onhjfjdemcplbcgdjibgjnlfgcjcioec)**

## Features

- **Audible chime** when Claude finishes generating a response
- **Desktop notification** that focuses the Claude tab when clicked
- **Four built-in sounds** — Chime, Bell, Ding, and Soft — all generated with the Web Audio API (no audio files, no network calls)
- **Adjustable volume** with a live preview button
- **Toggle sound and notifications** independently
- **Fully private** — no data is collected, stored externally, or transmitted

## How it works

Claude streams its responses, showing a **Stop** button while generating. A content script watches the page for that button to disappear, which reliably signals the response has finished. To stay resilient against UI changes, it uses several independent detection strategies (`aria-label`, `data-testid`, SVG titles, and icon-shape heuristics).

When a response completes, the extension plays your selected sound and — if enabled — fires a notification via the service worker. Clicking the notification brings the Claude tab back into focus.

## Installation

The easiest way is to install directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/done-chime-for-claude/onhjfjdemcplbcgdjibgjnlfgcjcioec).

### From source

1. Clone or download this repository:
   ```bash
   git clone https://github.com/rezaska/done-chime-extension.git
   ```
2. Open `chrome://extensions` in Chrome (or any Chromium-based browser).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the cloned folder.
5. Open [claude.ai](https://claude.ai) — the extension activates automatically.

Click the extension icon to open the settings popup and customize sound, volume, and notifications.

## Privacy

This extension does **not** collect, store, or transmit any user data. All settings live in your browser's local storage, and all sounds are synthesized locally. See the [privacy policy](https://www.rezasoleimani.ca/morning/privacy/) for details.
