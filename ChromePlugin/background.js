/**
 * Service Worker：快捷键、页面选区保存消息、保存弹窗调度
 */
importScripts('common.js');

function normalizePendingPayload(text, meta) {
  const common = globalThis.WebClipperCommon;
  const trimmed = common.trimSnippet(text);
  if (!trimmed) {
    return {
      error: 'no-selection',
      message: '没有可保存的文字',
      meta: meta || { title: '', url: '' },
    };
  }
  return {
    error: null,
    text: trimmed,
    meta: meta || { title: '', url: '' },
    overLimit: trimmed.length > common.MAX_SNIPPET_LENGTH,
    length: trimmed.length,
  };
}

async function prepareSelectionForSave(tabId) {
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return { ok: false, code: 'no-tab', message: '无法获取当前标签页' };
  }
  let text = '';
  try {
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.getSelection().toString(),
    });
    text = (injected?.result || '').trim();
  } catch {
    return {
      ok: false,
      code: 'inject-failed',
      message: '当前页面无法读取选中内容',
      meta: { title: tab.title || '', url: tab.url || '' },
    };
  }
  const meta = { title: tab.title || '', url: tab.url || '' };
  if (!text) {
    return {
      ok: false,
      code: 'no-selection',
      message: '请先在页面选中文字',
      meta,
    };
  }
  return {
    ok: true,
    text,
    meta,
  };
}

async function openSaveDialogWindow(pending) {
  await chrome.storage.session.set({ wc_pending_save: pending });
  await chrome.windows.create({
    url: chrome.runtime.getURL('save-dialog.html'),
    type: 'popup',
    width: 400,
    height: 560,
    focused: true,
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-selection') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const prep = await prepareSelectionForSave(tab.id);
  const common = globalThis.WebClipperCommon;
  if (!prep.ok) {
    await openSaveDialogWindow({
      error: prep.code,
      message: prep.message,
      meta: prep.meta || { title: tab.title || '', url: tab.url || '' },
    });
    return;
  }
  await openSaveDialogWindow({
    error: null,
    text: prep.text,
    meta: prep.meta,
    overLimit: prep.text.length > common.MAX_SNIPPET_LENGTH,
    length: prep.text.length,
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'WC_SELECTION_SAVE') {
    const meta = {
      title: typeof msg.title === 'string' ? msg.title : '',
      url: typeof msg.url === 'string' ? msg.url : '',
    };
    if (!meta.title && sender.tab?.title) meta.title = sender.tab.title;
    if (!meta.url && sender.tab?.url) meta.url = sender.tab.url;

    (async () => {
      const pending = normalizePendingPayload(msg.text, meta);
      await openSaveDialogWindow(pending);
      sendResponse({ ok: true });
    })();
    return true;
  }
  return undefined;
});
