const DEFAULT_SETTINGS = {
  attributeName: '',
  attributeValue: '',
  highlightColor: '#ffeb3b',
  enabled: false,
  theme: 'light',
};

const els = {
  attributeName: document.getElementById('attributeName'),
  attributeValue: document.getElementById('attributeValue'),
  highlightColor: document.getElementById('highlightColor'),
  toggleButton: document.getElementById('toggleButton'),
  themeToggle: document.getElementById('themeToggle'),
  focusPrev: document.getElementById('focusPrev'),
  focusNext: document.getElementById('focusNext'),
  status: document.getElementById('status'),
};

let currentSettings = { ...DEFAULT_SETTINGS };
let systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');
let highlightedCount = 0;
let autoFocusedAttributeValue = '';

function renderFocusControls() {
  const enabled = currentSettings.enabled && highlightedCount > 0;
  els.focusPrev.disabled = !enabled;
  els.focusNext.disabled = !enabled;
}

function syncPopupAccentColor(color) {
  document.documentElement.style.setProperty('--popup-accent', color || '#ffeb3b');
}

function getSystemTheme() {
  return systemPrefersDark.matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.body.classList.toggle('theme-dark', theme === 'dark');
}

function renderThemeButton() {
  const isDark = currentSettings.theme === 'dark';
  els.themeToggle.classList.toggle('is-dark', isDark);
  els.themeToggle.setAttribute('aria-checked', String(isDark));
}

function isValidAttributeName(name) {
  return /^[^\s"'<>\/=]+$/.test(name);
}

function setStatus(message) {
  els.status.textContent = message;
}

function formatHighlightedStatus(total, focusedIndex = null, focusedAttributeValue = '') {
  if (typeof total !== 'number') {
    return 'Highlighted: 0';
  }

  const suffix = focusedAttributeValue ? `  |  value: ${focusedAttributeValue}` : '';

  if (focusedIndex === null) {
    return `Highlighted: ${total}${suffix}`;
  }

  const totalText = String(total);
  const currentText = String(focusedIndex + 1);
  return `Highlighted: ${total} (${currentText}/${totalText})${suffix}`;
}

function renderToggle(enabled) {
  els.toggleButton.classList.toggle('on', enabled);
  els.toggleButton.classList.toggle('off', !enabled);
  els.toggleButton.textContent = enabled ? 'Disable' : 'Enable';
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function sendSettingsToActiveTab() {
  const tabId = await getActiveTabId();
  if (!tabId) {
    highlightedCount = 0;
    renderFocusControls();
    setStatus('No active tab found.');
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'APPLY_HIGHLIGHT_SETTINGS',
      payload: currentSettings,
    });

    if (!response?.ok) {
      highlightedCount = 0;
      renderFocusControls();
      setStatus(response?.error || 'Failed to apply settings.');
      return;
    }

    if (!currentSettings.enabled) {
      highlightedCount = 0;
      renderFocusControls();
      setStatus('Highlight is disabled.');
      return;
    }

    highlightedCount = response.matchCount || 0;
    renderFocusControls();
    const userHasValue = Boolean(els.attributeValue.value.trim());
    if (userHasValue) {
      autoFocusedAttributeValue = '';
    }
    setStatus(formatHighlightedStatus(highlightedCount, null, autoFocusedAttributeValue));
  } catch (error) {
    highlightedCount = 0;
    renderFocusControls();
    setStatus('Please refresh the page and try again.');
  }
}

async function persistSettings() {
  await chrome.storage.local.set({ attributeHighlighterSettings: currentSettings });
}

function readSettingsFromInputs() {
  return {
    ...currentSettings,
    attributeName: els.attributeName.value.trim(),
    attributeValue: els.attributeValue.value,
    highlightColor: els.highlightColor.value,
  };
}

async function handleInputChange() {
  currentSettings = readSettingsFromInputs();
  autoFocusedAttributeValue = '';
  syncPopupAccentColor(currentSettings.highlightColor);
  await persistSettings();
  if (currentSettings.enabled) {
    await sendSettingsToActiveTab();
  }
}

async function handleToggle() {
  const draft = readSettingsFromInputs();

  if (!draft.enabled && !draft.attributeName) {
    setStatus('Attribute name is required to enable.');
    return;
  }

  if (!draft.enabled && !isValidAttributeName(draft.attributeName)) {
    setStatus('Invalid attribute name.');
    return;
  }

  currentSettings = {
    ...draft,
    enabled: !draft.enabled,
  };

  renderToggle(currentSettings.enabled);
  await persistSettings();
  await sendSettingsToActiveTab();
}

async function handleThemeToggle() {
  currentSettings = {
    ...currentSettings,
    theme: currentSettings.theme === 'dark' ? 'light' : 'dark',
  };

  applyTheme(currentSettings.theme);
  renderThemeButton();
  await persistSettings();
}

async function focusHighlighted(direction) {
  if (!currentSettings.enabled || highlightedCount < 1) {
    return;
  }

  const tabId = await getActiveTabId();
  if (!tabId) {
    return;
  }

  try {
    let response = await chrome.tabs.sendMessage(tabId, {
      type: 'FOCUS_HIGHLIGHTED_ELEMENT',
      payload: { direction },
    });

    if (!response) {
      await sendSettingsToActiveTab();
      response = await chrome.tabs.sendMessage(tabId, {
        type: 'FOCUS_HIGHLIGHTED_ELEMENT',
        payload: { direction },
      });
    }

    if (!response?.ok) {
      setStatus(response?.error || 'Cannot focus highlighted element. Reload extension and page.');
      return;
    }

    const userHasValue = Boolean(els.attributeValue.value.trim());
    autoFocusedAttributeValue = userHasValue ? '' : response.focusedAttributeValue || '';

    highlightedCount = response.total || highlightedCount;
    renderFocusControls();
    setStatus(formatHighlightedStatus(response.total, response.currentIndex, autoFocusedAttributeValue));
  } catch {
    setStatus('Please refresh the page and try again.');
  }
}

async function handleFocusPrev() {
  await focusHighlighted('prev');
}

async function handleFocusNext() {
  await focusHighlighted('next');
}

async function init() {
  const data = await chrome.storage.local.get('attributeHighlighterSettings');
  currentSettings = {
    ...DEFAULT_SETTINGS,
    ...(data.attributeHighlighterSettings || {}),
  };

  if (!data.attributeHighlighterSettings?.theme) {
    currentSettings.theme = getSystemTheme();
    await persistSettings();
  }

  els.attributeName.value = currentSettings.attributeName;
  els.attributeValue.value = currentSettings.attributeValue;
  els.highlightColor.value = currentSettings.highlightColor;
  syncPopupAccentColor(currentSettings.highlightColor);
  applyTheme(currentSettings.theme || 'light');
  renderToggle(currentSettings.enabled);
  renderThemeButton();
  renderFocusControls();
  setStatus(currentSettings.enabled ? 'Highlight is active.' : 'Highlight is disabled.');

  els.attributeName.addEventListener('input', handleInputChange);
  els.attributeValue.addEventListener('input', handleInputChange);
  els.highlightColor.addEventListener('input', handleInputChange);
  els.toggleButton.addEventListener('click', handleToggle);
  els.themeToggle.addEventListener('click', handleThemeToggle);
  els.focusPrev.addEventListener('click', handleFocusPrev);
  els.focusNext.addEventListener('click', handleFocusNext);

  if (currentSettings.enabled) {
    await sendSettingsToActiveTab();
  }
}

init();
