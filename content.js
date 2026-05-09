const HIGHLIGHT_CLASS = 'data-test-highlighter-mark';
const FOCUS_CLASS = 'data-test-highlighter-focused';
const STYLE_ELEMENT_ID = 'data-test-highlighter-style';

const state = {
  enabled: false,
  attributeName: '',
  attributeValue: '',
  highlightColor: '#ffeb3b',
  observer: null,
  highlighted: new Set(),
  focusedIndex: -1,
};

function escapeAttrValue(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
}

function ensureStyle(color) {
  const focusedColor = getFocusedColor(color);
  let style = document.getElementById(STYLE_ELEMENT_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    document.documentElement.appendChild(style);
  }

  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 2px solid ${color} !important;
      outline-offset: 1px !important;
      background-color: color-mix(in srgb, ${color} 25%, transparent) !important;
      transition: outline-color 120ms ease;
    }

    .${FOCUS_CLASS} {
      outline: 3px solid ${focusedColor} !important;
      outline-offset: 2px !important;
      background-color: color-mix(in srgb, ${focusedColor} 60%, transparent) !important;
      box-shadow: 0 0 0 2px color-mix(in srgb, ${focusedColor} 50%, transparent) !important;
    }
  `;
}

function getFocusedColor(color) {
  const match = /^#?([0-9a-f]{6})$/i.exec(color || '');
  if (!match) {
    return color || '#ffb300';
  }

  const hex = match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta > 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r / 255) {
      h = ((g / 255 - b / 255) / delta) % 6;
    } else if (max === g / 255) {
      h = (b / 255 - r / 255) / delta + 2;
    } else {
      h = (r / 255 - g / 255) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) {
      h += 360;
    }
  }

  const boostedS = Math.min(1, s + 0.38);
  const boostedL = Math.max(0.22, Math.min(0.5, l - 0.16));

  const c = (1 - Math.abs(2 * boostedL - 1)) * boostedS;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = boostedL - c / 2;

  let rr = 0;
  let gg = 0;
  let bb = 0;

  if (h < 60) {
    rr = c;
    gg = x;
  } else if (h < 120) {
    rr = x;
    gg = c;
  } else if (h < 180) {
    gg = c;
    bb = x;
  } else if (h < 240) {
    gg = x;
    bb = c;
  } else if (h < 300) {
    rr = x;
    bb = c;
  } else {
    rr = c;
    bb = x;
  }

  const toHex = (value) => Math.round((value + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
}

function clearHighlight() {
  for (const element of state.highlighted) {
    element.classList.remove(HIGHLIGHT_CLASS);
    element.classList.remove(FOCUS_CLASS);
  }
  state.highlighted.clear();
}

function clearFocusedElement() {
  document.querySelectorAll(`.${FOCUS_CLASS}`).forEach((element) => {
    element.classList.remove(FOCUS_CLASS);
  });
}

function stopObserver() {
  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }
}

function buildSelector(attributeName, attributeValue) {
  if (!attributeName) {
    return null;
  }

  if (!attributeValue) {
    return `[${attributeName}]`;
  }

  return `[${attributeName}="${escapeAttrValue(attributeValue)}"]`;
}

function matchesCriteria(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  if (!element.hasAttribute(state.attributeName)) {
    return false;
  }

  if (!state.attributeValue) {
    return true;
  }

  return element.getAttribute(state.attributeName) === state.attributeValue;
}

function markElement(element) {
  if (!matchesCriteria(element)) {
    return;
  }

  element.classList.add(HIGHLIGHT_CLASS);
  state.highlighted.add(element);
}

function scanAndHighlight() {
  clearHighlight();

  const selector = buildSelector(state.attributeName, state.attributeValue);
  if (!selector) {
    return 0;
  }

  let matches = [];
  try {
    matches = document.querySelectorAll(selector);
  } catch {
    return -1;
  }

  matches.forEach((element) => {
    element.classList.add(HIGHLIGHT_CLASS);
    state.highlighted.add(element);
  });

  return state.highlighted.size;
}

function observeLiveUpdates() {
  stopObserver();

  state.observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.target instanceof Element) {
        const target = mutation.target;
        if (matchesCriteria(target)) {
          target.classList.add(HIGHLIGHT_CLASS);
          state.highlighted.add(target);
        } else if (state.highlighted.has(target)) {
          target.classList.remove(HIGHLIGHT_CLASS);
          state.highlighted.delete(target);
        }
      }

      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) {
          continue;
        }

        markElement(node);
        node.querySelectorAll('*').forEach(markElement);
      }

      for (const node of mutation.removedNodes) {
        if (!(node instanceof Element)) {
          continue;
        }

        if (state.highlighted.has(node)) {
          state.highlighted.delete(node);
        }

        node.querySelectorAll('*').forEach((child) => {
          if (state.highlighted.has(child)) {
            state.highlighted.delete(child);
          }
        });
      }
    }
  });

  state.observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: state.attributeName ? [state.attributeName] : undefined,
  });
}

function validateAttributeName(name) {
  return /^[^\s"'<>\/=]+$/.test(name);
}

function getHighlightedElements() {
  return Array.from(document.querySelectorAll(`.${HIGHLIGHT_CLASS}`)).filter((element) => element.isConnected);
}

function focusHighlightedElement(direction) {
  const highlightedElements = getHighlightedElements();
  const total = highlightedElements.length;

  if (!total) {
    state.focusedIndex = -1;
    return { ok: false, error: 'No highlighted elements.' };
  }

  if (direction === 'prev') {
    state.focusedIndex = state.focusedIndex < 0 ? total - 1 : (state.focusedIndex - 1 + total) % total;
  } else {
    state.focusedIndex = state.focusedIndex < 0 ? 0 : (state.focusedIndex + 1) % total;
  }

  const target = highlightedElements[state.focusedIndex];
  clearFocusedElement();
  target.classList.add(FOCUS_CLASS);
  try {
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  } catch {
    target.scrollIntoView();
  }

  if (target instanceof HTMLElement) {
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }

    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus();
    }
  }

  return {
    ok: true,
    total,
    currentIndex: state.focusedIndex,
    focusedAttributeValue: target.getAttribute(state.attributeName) || '',
  };
}

function disableHighlighter() {
  state.enabled = false;
  state.focusedIndex = -1;
  stopObserver();
  clearHighlight();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'FOCUS_HIGHLIGHTED_ELEMENT') {
    try {
      if (!state.enabled) {
        sendResponse({ ok: false, error: 'Highlight is disabled.' });
        return;
      }

      const direction = message?.payload?.direction === 'prev' ? 'prev' : 'next';
      sendResponse(focusHighlightedElement(direction));
    } catch (error) {
      sendResponse({ ok: false, error: 'Failed to focus highlighted element.' });
    }
    return;
  }

  if (message?.type !== 'APPLY_HIGHLIGHT_SETTINGS') {
    return;
  }

  const payload = message.payload || {};
  const attributeName = (payload.attributeName || '').trim();
  const attributeValue = payload.attributeValue || '';
  const highlightColor = payload.highlightColor || '#ffeb3b';
  const enabled = Boolean(payload.enabled);

  if (!enabled) {
    disableHighlighter();
    sendResponse({ ok: true, matchCount: 0 });
    return;
  }

  if (!attributeName) {
    disableHighlighter();
    sendResponse({ ok: false, error: 'Attribute name is required.' });
    return;
  }

  if (!validateAttributeName(attributeName)) {
    disableHighlighter();
    sendResponse({ ok: false, error: 'Invalid attribute name.' });
    return;
  }

  state.enabled = true;
  state.attributeName = attributeName;
  state.attributeValue = attributeValue;
  state.highlightColor = highlightColor;

  ensureStyle(highlightColor);
  const count = scanAndHighlight();
  state.focusedIndex = -1;
  if (count < 0) {
    disableHighlighter();
    sendResponse({ ok: false, error: 'Cannot build selector from input.' });
    return;
  }

  observeLiveUpdates();
  sendResponse({ ok: true, matchCount: count });
});
