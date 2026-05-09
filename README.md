# data-test highlighter

<p align="center">
  <img src="./data-test%20highlighter%20demo.png" alt="data-test highlighter ui" width="860" />
</p>

<p align="center"><em>data-test highlighter UI: highlighting and navigating UI elements by data-test attributes</em></p>

## What it does

Chrome extension for QA engineers who rely on `data-test` markers in UI testing workflows. It helps quickly inspect whether test attributes are present and correctly assigned on real pages, reduces time spent searching elements in DevTools, and speeds up selector validation during manual checks and automated test debugging.

The extension finds elements on the active page by:

- attribute name (required)
- attribute value (optional)

Then it highlights matching elements with your selected color and lets you navigate through matched elements with built-in focus controls.

It supports **live mode**: new matching elements added to DOM are highlighted automatically via `MutationObserver`.

**[Download the packaged Chrome extension file](./data-test-highlighter.crx)**

Quick install:

- **Chrome**: open `chrome://extensions` → enable **Developer mode** → drag and drop the `.crx` file (or use **Load unpacked** for source folder).
- **Firefox**: open `about:debugging#/runtime/this-firefox` → click **Load Temporary Add-on** → select extension manifest file (`manifest.json`) from the project folder.

## Chrome Web Store readiness

This extension is prepared for Chrome Web Store upload according to Google extension preparation guidance.

### Single purpose

- The extension has one clear purpose: highlight elements by custom test attributes on web pages.
- There is no analytics, advertising, affiliate tracking, remote code loading, or user data collection.

### Permissions rationale

- `storage` — saves extension settings (`attributeName`, `attributeValue`, `highlightColor`, and toggle state).
- Content script matches are limited to `http://*/*` and `https://*/*` only.
- The extension does not request restricted permissions such as cookies, history, downloads, identity, or webRequest.

### User data & privacy

- No personal data is collected, transmitted, sold, or shared.
- All settings stay locally in `chrome.storage.local` on the user device.
- The extension does not make external network requests.

Privacy details for store listing: see **[PRIVACY.md](./PRIVACY.md)**.

## Run locally

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder (`test-tagger`)
5. Open any HTTP/HTTPS page and use the extension popup

## Notes

- Pages like `chrome://*` are restricted by Chrome APIs; content scripts cannot run there.
- Settings are stored in `chrome.storage.local` and restored when popup opens.
- On tab reload, background worker reapplies active settings automatically.
