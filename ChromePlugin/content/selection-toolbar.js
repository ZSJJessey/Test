/**
 * 选中文字后在选区附近显示小型「保存」按钮（替代右键菜单触发）
 */
(function () {
  if (window.top !== window.self) return;

  let host = null;
  let shadowRoot = null;
  let btnEl = null;
  /** 最近一次有效选中的文本，避免点击按钮时选区已丢失 */
  let pendingText = '';

  let debounceTimer = 0;
  let raf = 0;

  function hideToolbar() {
    pendingText = '';
    if (host) host.style.display = 'none';
  }

  function ensureHost() {
    if (host) return;

    host = document.createElement('div');
    host.id = 'wc-selection-toolbar-host';
    host.setAttribute(
      'style',
      [
        'all:initial',
        'position:fixed',
        'z-index:2147483647',
        'display:none',
        'pointer-events:auto',
      ].join(';'),
    );

    shadowRoot = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 14px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        background: #2563eb;
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.22);
        white-space: nowrap;
      }
      .btn:hover { filter: brightness(1.06); }
      .btn:active { transform: scale(0.98); }
      .btn:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.85);
        outline-offset: 2px;
      }
    `;

    btnEl = document.createElement('button');
    btnEl.type = 'button';
    btnEl.className = 'btn';
    btnEl.textContent = '保存';
    btnEl.title = '保存选中内容到摘录';
    btnEl.setAttribute('aria-label', '保存选中内容到摘录');

    btnEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    btnEl.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = pendingText;
      hideToolbar();
      if (!text) return;
      chrome.runtime.sendMessage(
        {
          type: 'WC_SELECTION_SAVE',
          text,
          title: document.title || '',
          url: typeof location.href === 'string' ? location.href : '',
        },
        () => void chrome.runtime.lastError,
      );
    });

    shadowRoot.appendChild(style);
    shadowRoot.appendChild(btnEl);
    (document.documentElement || document.body).appendChild(host);
  }

  function positionToolbar(rect) {
    const gap = 8;
    const approxW = 76;
    const approxH = 36;

    let top = rect.bottom + gap;
    let left = rect.left + rect.width / 2 - approxW / 2;

    if (top + approxH > window.innerHeight - 8) {
      top = rect.top - approxH - gap;
    }
    if (top < 8) {
      top = Math.min(rect.bottom + gap, window.innerHeight - approxH - 8);
    }

    left = Math.max(8, Math.min(left, window.innerWidth - approxW - 8));

    host.style.left = `${left}px`;
    host.style.top = `${top}px`;
  }

  function updateToolbar() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      hideToolbar();
      return;
    }

    let raw = '';
    try {
      raw = sel.toString();
    } catch {
      hideToolbar();
      return;
    }

    const text = raw.replace(/^\s+|\s+$/g, '');
    if (!text) {
      hideToolbar();
      return;
    }

    let range;
    try {
      range = sel.getRangeAt(0);
    } catch {
      hideToolbar();
      return;
    }

    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      hideToolbar();
      return;
    }

    pendingText = text;
    ensureHost();
    positionToolbar(rect);
    host.style.display = 'block';
  }

  function scheduleUpdate() {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateToolbar);
    }, 50);
  }

  document.addEventListener('mouseup', scheduleUpdate, true);
  document.addEventListener('selectionchange', scheduleUpdate);
  window.addEventListener(
    'scroll',
    () => {
      hideToolbar();
    },
    true,
  );
  window.addEventListener('resize', scheduleUpdate);
})();
