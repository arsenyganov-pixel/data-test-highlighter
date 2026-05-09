const DEFAULT_SETTINGS = {
  attributeName: '',
  attributeValue: '',
  highlightColor: '#ffeb3b',
  enabled: false,
};

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get('attributeHighlighterSettings');
  if (!data.attributeHighlighterSettings) {
    await chrome.storage.local.set({
      attributeHighlighterSettings: DEFAULT_SETTINGS,
    });
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') {
    return;
  }

  const data = await chrome.storage.local.get('attributeHighlighterSettings');
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(data.attributeHighlighterSettings || {}),
  };

  if (!settings.enabled) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'APPLY_HIGHLIGHT_SETTINGS',
      payload: settings,
    });
  } catch {
    // Ignore pages where content script is unavailable
    // (e.g., chrome:// pages or restricted Chrome surfaces).
  }
});
