const DEFAULT_SETTINGS = {
  attributeName: '',
  attributeValue: '',
  highlightColor: '#ffeb3b',
  enabled: false,
};

function getActionIconPath(enabled) {
  if (enabled) {
    return {
      16: 'data-test highlighter 16.png',
      32: 'data-test highlighter 32.png',
    };
  }

  return {
    16: 'data-test highlighter grey 16.png',
    32: 'data-test highlighter grey 32.png',
  };
}

async function updateActionIcon(enabled) {
  await chrome.action.setIcon({
    path: getActionIconPath(Boolean(enabled)),
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get('attributeHighlighterSettings');
  if (!data.attributeHighlighterSettings) {
    await chrome.storage.local.set({
      attributeHighlighterSettings: DEFAULT_SETTINGS,
    });
    await updateActionIcon(false);
    return;
  }

  await updateActionIcon(data.attributeHighlighterSettings.enabled);
});

chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get('attributeHighlighterSettings');
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(data.attributeHighlighterSettings || {}),
  };

  await updateActionIcon(settings.enabled);
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'local' || !changes.attributeHighlighterSettings) {
    return;
  }

  const nextSettings = {
    ...DEFAULT_SETTINGS,
    ...(changes.attributeHighlighterSettings.newValue || {}),
  };

  await updateActionIcon(nextSettings.enabled);
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
