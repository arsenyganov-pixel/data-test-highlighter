# Privacy Policy — data-test highlighter

Last updated: 2026-05-10

## Overview

`data-test highlighter` is a Chrome extension that highlights page elements by attribute name/value for QA and debugging workflows.

## Data collection and usage

- The extension does **not** collect personal data.
- The extension does **not** transmit data to external servers.
- The extension does **not** use analytics, advertising SDKs, or trackers.
- The extension does **not** sell or share user data.

## Local storage

The extension stores only user-provided UI settings in `chrome.storage.local`:

- attribute name
- attribute value
- highlight color
- enabled/disabled state
- theme preference

These settings are stored on the user device and are used only to make extension behavior persistent between sessions.

## Network activity

The extension does not perform outbound network requests.

## Permissions

- `storage`: required to save extension settings.
- Content script access is limited to `http://*/*` and `https://*/*` pages where highlighting is applied.

## Contact

Project repository owner: `@rcgunoff`
