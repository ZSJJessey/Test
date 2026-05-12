(function () {
  const C = globalThis.WebClipperCommon;
  const S = globalThis.WebClipperStorage;

  const elList = document.getElementById('list');
  const elFilter = document.getElementById('filter-category');
  const elSearch = document.getElementById('search-input');
  const elBadge = document.getElementById('count-badge');
  const elSavePanel = document.getElementById('save-panel');
  const elSavePreview = document.getElementById('save-preview');
  const elSaveError = document.getElementById('save-error');
  const elSaveOver = document.getElementById('save-over');
  const elClipActions = document.getElementById('clip-actions');
  const elSaveCategory = document.getElementById('save-category');
  const elNewCatName = document.getElementById('new-category-name');
  const elToast = document.getElementById('toast');

  const dlgCats = document.getElementById('dialog-categories');
  const elCatList = document.getElementById('category-list');
  const elDialogCatErr = document.getElementById('dialog-cat-error');

  const dlgDel = document.getElementById('dialog-confirm-delete');
  const elConfirmDelBody = document.getElementById('confirm-del-body');

  let allSnippets = [];
  let categories = [];
  /** @type {{ text: string, meta: { title: string, url: string } } | null} */
  let pendingSave = null;

  let deleteTargetId = null;
  let toastTimer = null;

  function showToast(msg) {
    elToast.textContent = msg;
    elToast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elToast.classList.remove('visible'), 2200);
  }

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  function categoryNameById(id) {
    const c = categories.find((x) => x.id === id);
    return c ? c.name : '未知分类';
  }

  function snippetCountForCategory(catId) {
    return allSnippets.filter((s) => s.categoryId === catId).length;
  }

  async function refreshData() {
    await S.ensureInitialized();
    categories = await S.getCategories();
    allSnippets = await S.getSnippets();
    renderFilterOptions();
    renderSaveCategoryOptions();
    renderList();
    updateBadge();
  }

  function updateBadge() {
    elBadge.textContent = `${allSnippets.length} 条`;
  }

  function renderFilterOptions() {
    const prev = elFilter.value;
    elFilter.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = '全部分类';
    elFilter.appendChild(optAll);
    categories.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      elFilter.appendChild(opt);
    });
    if ([...elFilter.options].some((o) => o.value === prev)) {
      elFilter.value = prev;
    }
  }

  function renderSaveCategoryOptions() {
    const prev = elSaveCategory.value;
    elSaveCategory.innerHTML = '';
    categories.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      elSaveCategory.appendChild(opt);
    });
    if ([...elSaveCategory.options].some((o) => o.value === prev)) {
      elSaveCategory.value = prev;
    } else if (elSaveCategory.options.length) {
      elSaveCategory.selectedIndex = 0;
    }
  }

  function filterSnippets() {
    const cat = elFilter.value;
    const q = elSearch.value.trim().toLowerCase();
    return allSnippets.filter((s) => {
      if (cat && s.categoryId !== cat) return false;
      if (!q) return true;
      const hay = `${s.text}\n${s.sourceTitle || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  function renderList() {
    const items = filterSnippets();
    elList.innerHTML = '';

    if (!allSnippets.length) {
      elList.innerHTML =
        '<div class="empty-state">暂无摘录。<br />在网页选中文字后，点击选区旁的「保存」或在本面板使用「保存当前选中」。</div>';
      return;
    }

    if (!items.length) {
      elList.innerHTML =
        '<div class="empty-state">没有匹配的摘录。<br />试试更改分类筛选或搜索关键词。</div>';
      return;
    }

    items.forEach((s) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.dataset.id = s.id;

      const body = document.createElement('div');
      body.className = 'card-body';
      body.textContent = s.text;

      const meta = document.createElement('div');
      meta.className = 'card-meta';
      const timeStr = formatTime(s.createdAt);
      const title = (s.sourceTitle || '').trim();
      const url = (s.sourceUrl || '').trim();
      meta.appendChild(document.createTextNode(timeStr));
      if (title) {
        meta.appendChild(document.createTextNode(' · '));
        const t = document.createElement('span');
        t.textContent = title.length > 40 ? `${title.slice(0, 40)}…` : title;
        meta.appendChild(t);
      }
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = '打开来源';
        a.setAttribute('aria-label', `打开来源链接 ${url}`);
        meta.appendChild(a);
      }
      if (s.clipped) {
        meta.appendChild(document.createTextNode(' · '));
        const w = document.createElement('span');
        w.textContent = '已裁剪';
        meta.appendChild(w);
      }

      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const sel = document.createElement('select');
      sel.setAttribute('aria-label', '更改摘录分类');
      categories.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (c.id === s.categoryId) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', async () => {
        try {
          await S.updateSnippetCategory(s.id, sel.value);
          await refreshData();
          showToast('已更新分类');
        } catch (e) {
          showToast(e.message || '更新失败');
          await refreshData();
        }
      });

      const btnCopy = document.createElement('button');
      btnCopy.type = 'button';
      btnCopy.className = 'btn btn-primary btn-small';
      btnCopy.textContent = '复制';
      btnCopy.setAttribute('aria-label', '复制本条摘录');
      btnCopy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(s.text);
          btnCopy.textContent = '已复制';
          setTimeout(() => {
            btnCopy.textContent = '复制';
          }, 1600);
        } catch {
          showToast('复制失败，请重试');
        }
      });

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn btn-danger btn-small';
      btnDel.textContent = '删除';
      btnDel.setAttribute('aria-label', '删除本条摘录');
      btnDel.addEventListener('click', () => {
        deleteTargetId = s.id;
        elConfirmDelBody.textContent = '删除后无法恢复。';
        dlgDel.showModal();
      });

      actions.appendChild(sel);
      actions.appendChild(btnCopy);
      actions.appendChild(btnDel);

      card.appendChild(body);
      card.appendChild(meta);
      card.appendChild(actions);
      elList.appendChild(card);
    });
  }

  function closeSavePanel() {
    pendingSave = null;
    elSavePanel.classList.add('hidden');
    elSaveError.classList.add('hidden');
    elSaveOver.classList.add('hidden');
    elClipActions.classList.add('hidden');
    elSavePreview.textContent = '';
    elNewCatName.value = '';
    document.getElementById('btn-confirm-save').disabled = false;
  }

  function openSavePanel(text, meta, errorMsg) {
    pendingSave = { text, meta: meta || { title: '', url: '' } };
    elSavePanel.classList.remove('hidden');
    elSaveError.classList.toggle('hidden', !errorMsg);
    if (errorMsg) elSaveError.textContent = errorMsg;

    const raw = text || '';
    elSavePreview.textContent = raw || '（无内容）';

    const over = raw.length > C.MAX_SNIPPET_LENGTH;
    elSaveOver.classList.toggle('hidden', !over);
    elClipActions.classList.toggle('hidden', !over);
    const btnConfirm = document.getElementById('btn-confirm-save');
    btnConfirm.disabled = Boolean(over);
    if (over) {
      elSaveOver.textContent = `正文 ${raw.length} 字，超过上限 ${C.MAX_SNIPPET_LENGTH} 字。请选择裁剪保存或取消。`;
    }

    renderSaveCategoryOptions();
  }

  async function getActiveTabSelection() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return { error: '无法获取当前标签页', text: '', meta: {} };
    }
    try {
      const [injected] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString(),
      });
      const text = C.trimSnippet(injected?.result || '');
      const meta = { title: tab.title || '', url: tab.url || '' };
      return { error: null, text, meta };
    } catch {
      return {
        error: '当前页面无法读取选中内容',
        text: '',
        meta: { title: tab.title || '', url: tab.url || '' },
      };
    }
  }

  async function onSaveSelectionClick() {
    const { error, text, meta } = await getActiveTabSelection();
    if (error) {
      openSavePanel('', meta, error);
      return;
    }
    if (!text) {
      openSavePanel('', meta, '请先在页面选中文字');
      return;
    }
    openSavePanel(text, meta, null);
  }

  async function confirmSave() {
    if (!pendingSave) return;
    const raw = pendingSave.text;
    if (raw.length > C.MAX_SNIPPET_LENGTH) {
      showToast('请先使用裁剪保存，或取消');
      return;
    }
    const categoryId = elSaveCategory.value;
    try {
      await S.addSnippet({
        text: raw,
        categoryId,
        sourceTitle: pendingSave.meta.title,
        sourceUrl: pendingSave.meta.url,
      });
      showToast('已保存');
      closeSavePanel();
      await refreshData();
    } catch (e) {
      showToast(e.message || '保存失败');
    }
  }

  async function clipAndSave() {
    if (!pendingSave) return;
    const { text: clipped, clipped: wasClipped } = C.clipSnippet(
      pendingSave.text,
      C.MAX_SNIPPET_LENGTH,
    );
    const categoryId = elSaveCategory.value;
    try {
      await S.addSnippet({
        text: clipped,
        categoryId,
        sourceTitle: pendingSave.meta.title,
        sourceUrl: pendingSave.meta.url,
      });
      showToast(wasClipped ? '已裁剪并保存' : '已保存');
      closeSavePanel();
      await refreshData();
    } catch (e) {
      showToast(e.message || '保存失败');
    }
  }

  async function addInlineCategory() {
    const name = elNewCatName.value;
    try {
      await S.addCategory(name);
      elNewCatName.value = '';
      await refreshData();
      renderSaveCategoryOptions();
      showToast('分类已添加');
    } catch (e) {
      showToast(e.message || '添加失败');
    }
  }

  function renderCategoryManagement() {
    elCatList.innerHTML = '';
    elDialogCatErr.classList.add('hidden');
    categories.forEach((c) => {
      const row = document.createElement('div');
      row.className = 'cat-row';
      row.dataset.id = c.id;

      const count = snippetCountForCategory(c.id);
      const isDefault = c.id === C.DEFAULT_CATEGORY_ID;

      if (isDefault) {
        const nameEl = document.createElement('span');
        nameEl.textContent = `${c.name}（${count} 条）`;
        row.appendChild(nameEl);
        elCatList.appendChild(row);
        return;
      }

      const label = document.createElement('span');
      label.style.flex = '1';
      label.style.minWidth = '0';
      label.textContent = `${c.name}（${count} 条）`;

      const btnRename = document.createElement('button');
      btnRename.type = 'button';
      btnRename.className = 'btn btn-ghost btn-small';
      btnRename.textContent = '重命名';
      btnRename.addEventListener('click', async () => {
        const next = window.prompt('新的分类名称', c.name);
        if (next === null) return;
        try {
          await S.renameCategory(c.id, next);
          await refreshData();
          renderCategoryManagement();
          showToast('已重命名');
        } catch (e) {
          elDialogCatErr.textContent = e.message || '重命名失败';
          elDialogCatErr.classList.remove('hidden');
        }
      });

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn btn-danger btn-small';
      btnDel.textContent = '删除';
      btnDel.addEventListener('click', async () => {
        const n = snippetCountForCategory(c.id);
        if (
          !window.confirm(
            `确定删除分类「${c.name}」？其中 ${n} 条摘录将移至「${C.DEFAULT_CATEGORY_NAME}」。`,
          )
        ) {
          return;
        }
        try {
          await S.deleteCategory(c.id);
          await refreshData();
          renderCategoryManagement();
          showToast('已删除分类');
        } catch (e) {
          elDialogCatErr.textContent = e.message || '删除失败';
          elDialogCatErr.classList.remove('hidden');
        }
      });

      row.appendChild(label);
      row.appendChild(btnRename);
      row.appendChild(btnDel);
      elCatList.appendChild(row);
    });
  }

  document.getElementById('btn-save-selection').addEventListener('click', onSaveSelectionClick);

  document.getElementById('btn-dismiss-save').addEventListener('click', closeSavePanel);
  document.getElementById('btn-cancel-save').addEventListener('click', closeSavePanel);
  document.getElementById('btn-confirm-save').addEventListener('click', confirmSave);
  document.getElementById('btn-clip-save').addEventListener('click', clipAndSave);

  document.getElementById('btn-add-category-inline').addEventListener('click', addInlineCategory);

  document.getElementById('btn-manage-cats').addEventListener('click', () => {
    renderCategoryManagement();
    dlgCats.showModal();
  });

  document.getElementById('dialog-cat-close').addEventListener('click', () => {
    dlgCats.close();
  });

  document.getElementById('dialog-add-cat').addEventListener('click', async () => {
    const input = document.getElementById('dialog-new-cat');
    elDialogCatErr.classList.add('hidden');
    try {
      await S.addCategory(input.value);
      input.value = '';
      await refreshData();
      renderCategoryManagement();
      showToast('分类已添加');
    } catch (e) {
      elDialogCatErr.textContent = e.message || '添加失败';
      elDialogCatErr.classList.remove('hidden');
    }
  });

  document.getElementById('confirm-del-cancel').addEventListener('click', () => {
    dlgDel.close();
    deleteTargetId = null;
  });

  document.getElementById('confirm-del-ok').addEventListener('click', async () => {
    if (!deleteTargetId) {
      dlgDel.close();
      return;
    }
    try {
      await S.deleteSnippet(deleteTargetId);
      deleteTargetId = null;
      dlgDel.close();
      await refreshData();
      showToast('已删除');
    } catch {
      showToast('删除失败');
    }
  });

  elFilter.addEventListener('change', renderList);
  elSearch.addEventListener('input', renderList);
  document.getElementById('btn-clear-search').addEventListener('click', () => {
    elSearch.value = '';
    renderList();
  });

  dlgCats.addEventListener('close', () => {
    renderFilterOptions();
    renderSaveCategoryOptions();
    renderList();
  });

  refreshData().catch(() => showToast('加载数据失败'));
})();
