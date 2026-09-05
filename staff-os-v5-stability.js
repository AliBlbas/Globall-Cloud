(() => {
  'use strict';
  if (window.__gcStaffV5Stability) return;
  window.__gcStaffV5Stability = true;

  const FUNCTION_PREFIXES = ['https://ahslifnthiwfkmaswjno.supabase.co/functions/v1/'];

  const safeError = (value) => {
    if (value == null) return 'Unknown error';
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.message || 'Unknown error';
    if (typeof value === 'object') {
      for (const key of ['message', 'error', 'details', 'hint', 'msg', 'description']) {
        const v = value?.[key];
        if (typeof v === 'string' && v.trim()) return v.trim();
      }
      try {
        const json = JSON.stringify(value);
        if (json && json !== '{}') return json;
      } catch {}
    }
    return String(value);
  };

  const isFunctionUrl = (url) => FUNCTION_PREFIXES.some((prefix) => String(url || '').startsWith(prefix));

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const response = await nativeFetch(input, init);
    if (!isFunctionUrl(url)) return response;
    if (!(response.headers.get('content-type') || '').includes('application/json')) return response;

    try {
      const payload = await response.clone().json();
      if (!response.ok && payload && typeof payload === 'object') {
        const message = safeError(payload.error ?? payload.message ?? payload);
        const normalized = { ...payload, error: message, error_message: message };
        const headers = new Headers(response.headers);
        headers.set('Content-Type', 'application/json; charset=utf-8');
        headers.set('Cache-Control', 'no-store');
        return new Response(JSON.stringify(normalized), {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      }
    } catch {}
    return response;
  };

  window.gcSafeError = safeError;

  const scrubObjectErrors = () => {
    const root = document.getElementById('view') || document.body;
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    for (const textNode of nodes) {
      if (!textNode.nodeValue?.includes('[object Object]')) continue;
      if (/^(SCRIPT|STYLE)$/i.test(textNode.parentElement?.tagName || '')) continue;
      textNode.nodeValue = textNode.nodeValue.replace(/\[object Object\]/g, 'هەڵەی data service بە شێوەی نادیار ڕوویدا. تکایە دووبارە هەوڵ بدەوە.');
    }
  };

  const injectMobilePolish = () => {
    if (document.getElementById('gcStaffStabilityStyle')) return;
    const style = document.createElement('style');
    style.id = 'gcStaffStabilityStyle';
    style.textContent = `
      @media (max-width: 780px) {
        .gc-side { padding: 10px; }
        .nav {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px !important;
          overflow: visible !important;
        }
        .nav-btn {
          width: 100% !important;
          min-width: 0 !important;
          justify-content: flex-start;
          padding: 9px 10px !important;
          line-height: 1.25;
        }
        .nav-btn span:not(.nav-icon) {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .nav-icon { flex: 0 0 24px; }
        .topbar { gap: 8px; }
        .status { flex: 1 1 100%; text-align: center; }
        .top-actions { gap: 6px; }
        .top-actions > * { min-width: 0; }
        .view { min-height: calc(100vh - 120px); }
        .section-head { gap: 8px; }
        .section-head .actions { width: 100%; }
        .section-head .actions .btn,
        .section-head .actions a { flex: 1 1 140px; text-align: center; }
        .modal-backdrop { padding: 8px; }
        .modal { max-height: 94vh; padding: 12px; border-radius: 18px; }
        .table-wrap { -webkit-overflow-scrolling: touch; }
        .toast { inset-inline: 10px; bottom: 10px; text-align: center; }
      }
      @media (max-width: 480px) {
        .nav { grid-template-columns: 1fr 1fr !important; }
        .nav-btn { font-size: 11px; }
        .grid-kpi { gap: 6px !important; }
        .kpi { padding: 11px !important; }
      }
      .gc-runtime-error {
        margin-top: 10px;
        border: 1px solid rgba(255,113,128,.22);
        background: rgba(255,113,128,.06);
        color: #ffd7dc;
        border-radius: 14px;
        padding: 10px 12px;
        font-size: 10px;
        line-height: 1.7;
      }
    `;
    document.head.appendChild(style);
  };

  const boot = () => {
    try {
      injectMobilePolish();
      scrubObjectErrors();
      const observer = new MutationObserver(() => scrubObjectErrors());
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {
      console.error('[Globall Cloud] stability init:', e);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
