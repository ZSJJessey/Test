/**
 * 共享常量与纯函数（不含 chrome API）
 */
(function (global) {
  const MAX_SNIPPET_LENGTH = 2000;
  const MAX_CATEGORY_NAME_LENGTH = 32;
  /** 禁止可能导致存储或 UI 问题的字符 */
  const CATEGORY_INVALID_PATTERN = /[\u0000-\u001f<>\\/|\"]/;

  function trimSnippet(text) {
    return String(text ?? '').replace(/^\s+|\s+$/g, '');
  }

  function clipSnippet(text, maxLen) {
    const t = String(text ?? '');
    const limit = maxLen ?? MAX_SNIPPET_LENGTH;
    if (t.length <= limit) return { text: t, clipped: false };
    return { text: t.slice(0, limit), clipped: true };
  }

  function validateCategoryName(name) {
    const n = trimSnippet(name);
    if (!n) return { ok: false, error: '分类名称不能为空' };
    if (n.length > MAX_CATEGORY_NAME_LENGTH) {
      return { ok: false, error: `分类名称不能超过 ${MAX_CATEGORY_NAME_LENGTH} 个字符` };
    }
    if (CATEGORY_INVALID_PATTERN.test(n)) {
      return { ok: false, error: '分类名称包含非法字符' };
    }
    return { ok: true, name: n };
  }

  global.WebClipperCommon = {
    MAX_SNIPPET_LENGTH,
    MAX_CATEGORY_NAME_LENGTH,
    DEFAULT_CATEGORY_ID: '__default__',
    DEFAULT_CATEGORY_NAME: '未分类',
    trimSnippet,
    clipSnippet,
    validateCategoryName,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
