(function () {
  const C = globalThis.WebClipperCommon;
  const S = globalThis.WebClipperStorage;

  const elErr = document.getElementById('sd-error');
  const elPreview = document.getElementById('sd-preview');
  const elOver = document.getElementById('sd-over');
  const elClip = document.getElementById('sd-clip');
  const elFields = document.getElementById('sd-fields');
  const elBtnSave = document.getElementById('sd-btn-save');
  const elCat = document.getElementById('sd-category');
  const elNewCat = document.getElementById('sd-new-cat');
  const elToast = document.getElementById('toast');

  /** @type {{ text?: string, meta?: object, error?: string|null } | null} */
  let pending = null;
  let toastTimer = null;

  function showToast(msg) {
    elToast.textContent = msg;
    elToast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elToast.classList.remove('visible'), 2000);
  }

  async function closeWindow() {
    await chrome.storage.session.remove('wc_pending_save');
    window.close();
  }

  async function init() {
    await S.ensureInitialized();
    await renderCategoriesFromAwait();

    const session = await chrome.storage.session.get('wc_pending_save');
    pending = session.wc_pending_save || null;

    elBtnSave.classList.remove('hidden');
    elBtnSave.disabled = false;
    elFields.classList.remove('hidden');

    if (!pending) {
      elErr.classList.remove('hidden');
      elErr.textContent = '没有待保存的内容。';
      elPreview.textContent = '';
      elFields.classList.add('hidden');
      elBtnSave.classList.add('hidden');
      elClip.classList.add('hidden');
      elOver.classList.add('hidden');
      return;
    }

    if (pending.error) {
      elErr.classList.remove('hidden');
      elErr.textContent = pending.message || '无法保存';
      elPreview.textContent = '';
      elFields.classList.add('hidden');
      elBtnSave.classList.add('hidden');
      elClip.classList.add('hidden');
      elOver.classList.add('hidden');
      return;
    }

    elErr.classList.add('hidden');
    const text = pending.text || '';
    elPreview.textContent = text || '（无内容）';

    const over = text.length > C.MAX_SNIPPET_LENGTH;
    elOver.classList.toggle('hidden', !over);
    elClip.classList.toggle('hidden', !over);
    if (over) {
      elOver.textContent = `正文 ${text.length} 字，超过上限 ${C.MAX_SNIPPET_LENGTH} 字。请选择裁剪保存或取消。`;
      elBtnSave.disabled = true;
    } else {
      elBtnSave.disabled = false;
    }
  }

  async function renderCategoriesFromAwait() {
    const cats = await S.getCategories();
    elCat.innerHTML = '';
    cats.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      elCat.appendChild(opt);
    });
  }

  async function saveNormal() {
    if (!pending || pending.error || !pending.text) return;
    if (pending.text.length > C.MAX_SNIPPET_LENGTH) {
      showToast('请先裁剪保存');
      return;
    }
    try {
      await S.addSnippet({
        text: pending.text,
        categoryId: elCat.value,
        sourceTitle: pending.meta?.title || '',
        sourceUrl: pending.meta?.url || '',
      });
      showToast('已保存');
      setTimeout(closeWindow, 350);
    } catch (e) {
      showToast(e.message || '保存失败');
    }
  }

  async function saveClip() {
    if (!pending || pending.error || !pending.text) return;
    const { text: clipped } = C.clipSnippet(pending.text, C.MAX_SNIPPET_LENGTH);
    try {
      await S.addSnippet({
        text: clipped,
        categoryId: elCat.value,
        sourceTitle: pending.meta?.title || '',
        sourceUrl: pending.meta?.url || '',
      });
      showToast('已裁剪并保存');
      setTimeout(closeWindow, 350);
    } catch (e) {
      showToast(e.message || '保存失败');
    }
  }

  async function addCat() {
    try {
      await S.addCategory(elNewCat.value);
      elNewCat.value = '';
      await renderCategoriesFromAwait();
      showToast('分类已添加');
    } catch (e) {
      showToast(e.message || '添加失败');
    }
  }

  elBtnSave.addEventListener('click', saveNormal);
  document.getElementById('sd-btn-clip').addEventListener('click', saveClip);
  document.getElementById('sd-btn-cancel').addEventListener('click', closeWindow);
  document.getElementById('sd-btn-close').addEventListener('click', closeWindow);
  document.getElementById('sd-add-cat').addEventListener('click', addCat);

  init().catch(() => showToast('加载失败'));
})();
