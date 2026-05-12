/**
 * chrome.storage.local 数据访问
 */
(function (global) {
  const C = global.WebClipperCommon;
  const KEYS = {
    snippets: 'wc_snippets',
    categories: 'wc_categories',
    floatHidden: 'wc_float_hidden',
  };

  function generateId() {
    if (global.crypto?.randomUUID) return global.crypto.randomUUID();
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  async function getRaw(key, fallback) {
    const data = await chrome.storage.local.get(key);
    return data[key] !== undefined ? data[key] : fallback;
  }

  async function setRaw(key, value) {
    await chrome.storage.local.set({ [key]: value });
  }

  function defaultCategories() {
    return [{ id: C.DEFAULT_CATEGORY_ID, name: C.DEFAULT_CATEGORY_NAME }];
  }

  async function ensureInitialized() {
    let categories = await getRaw(KEYS.categories, null);
    if (!Array.isArray(categories) || categories.length === 0) {
      categories = defaultCategories();
      await setRaw(KEYS.categories, categories);
    } else {
      const hasDefault = categories.some((c) => c.id === C.DEFAULT_CATEGORY_ID);
      if (!hasDefault) {
        categories = [defaultCategories()[0], ...categories];
        await setRaw(KEYS.categories, categories);
      }
    }
    let snippets = await getRaw(KEYS.snippets, null);
    if (!Array.isArray(snippets)) {
      snippets = [];
      await setRaw(KEYS.snippets, snippets);
    }
  }

  async function getCategories() {
    await ensureInitialized();
    return getRaw(KEYS.categories, defaultCategories());
  }

  async function getSnippets() {
    await ensureInitialized();
    return getRaw(KEYS.snippets, []);
  }

  async function saveSnippets(list) {
    await setRaw(KEYS.snippets, list);
  }

  async function saveCategories(list) {
    await setRaw(KEYS.categories, list);
  }

  async function addCategory(name) {
    const v = C.validateCategoryName(name);
    if (!v.ok) throw new Error(v.error);
    const categories = await getCategories();
    if (categories.some((c) => c.name === v.name)) {
      throw new Error('已存在同名分类');
    }
    const cat = { id: generateId(), name: v.name };
    categories.push(cat);
    await saveCategories(categories);
    return cat;
  }

  async function renameCategory(categoryId, name) {
    if (categoryId === C.DEFAULT_CATEGORY_ID) {
      throw new Error('不能重命名默认分类');
    }
    const v = C.validateCategoryName(name);
    if (!v.ok) throw new Error(v.error);
    const categories = await getCategories();
    if (categories.some((c) => c.id !== categoryId && c.name === v.name)) {
      throw new Error('已存在同名分类');
    }
    const next = categories.map((c) =>
      c.id === categoryId ? { ...c, name: v.name } : c,
    );
    await saveCategories(next);
  }

  async function deleteCategory(categoryId) {
    if (categoryId === C.DEFAULT_CATEGORY_ID) {
      throw new Error('不能删除默认分类');
    }
    const categories = await getCategories();
    const exists = categories.some((c) => c.id === categoryId);
    if (!exists) throw new Error('分类不存在');
    const snippets = await getSnippets();
    const moved = snippets.map((s) =>
      s.categoryId === categoryId
        ? { ...s, categoryId: C.DEFAULT_CATEGORY_ID }
        : s,
    );
    const nextCats = categories.filter((c) => c.id !== categoryId);
    await saveSnippets(moved);
    await saveCategories(nextCats);
    return { movedCount: snippets.filter((s) => s.categoryId === categoryId).length };
  }

  async function addSnippet({ text, categoryId, sourceTitle, sourceUrl }) {
    const trimmed = C.trimSnippet(text);
    if (!trimmed) throw new Error('摘录内容不能为空');
    const { text: body, clipped } = C.clipSnippet(trimmed, C.MAX_SNIPPET_LENGTH);
    const categories = await getCategories();
    const catOk = categories.some((c) => c.id === categoryId);
    if (!catOk) throw new Error('分类不存在');
    const snippets = await getSnippets();
    const item = {
      id: generateId(),
      text: body,
      categoryId,
      createdAt: Date.now(),
      clipped: clipped || false,
      sourceTitle: sourceTitle || '',
      sourceUrl: sourceUrl || '',
    };
    snippets.unshift(item);
    await saveSnippets(snippets);
    return item;
  }

  async function deleteSnippet(id) {
    const snippets = await getSnippets();
    await saveSnippets(snippets.filter((s) => s.id !== id));
  }

  async function updateSnippetCategory(snippetId, categoryId) {
    const categories = await getCategories();
    if (!categories.some((c) => c.id === categoryId)) {
      throw new Error('分类不存在');
    }
    const snippets = await getSnippets();
    const next = snippets.map((s) =>
      s.id === snippetId ? { ...s, categoryId } : s,
    );
    await saveSnippets(next);
  }

  async function getFloatButtonHidden() {
    return Boolean(await getRaw(KEYS.floatHidden, false));
  }

  async function setFloatButtonHidden(hidden) {
    await setRaw(KEYS.floatHidden, Boolean(hidden));
  }

  global.WebClipperStorage = {
    KEYS,
    ensureInitialized,
    getCategories,
    getSnippets,
    addCategory,
    renameCategory,
    deleteCategory,
    addSnippet,
    deleteSnippet,
    updateSnippetCategory,
    getFloatButtonHidden,
    setFloatButtonHidden,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
