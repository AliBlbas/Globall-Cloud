/* Globall Cloud — production runtime guard
 * Cross-browser defensive bootstrap for public pages. Never exposes service-role
 * credentials; it only loads the existing publishable-key bridge once.
 */
(() => {
  'use strict';

  const BRIDGE = '/production-bridge.js?v=20260815-2';
  const LEGACY_MESSAGE = 'Supabase هێشتا پەیوەست نەکراوە';
  const READY_MESSAGE = 'پەیوەندیی پارێزراو بە Supabase چالاکە و سیستەمەکە ئامادەیە.';
  const FAIL_MESSAGE = 'پەیوەندیی خزمەتگوزاری بە شێوەی پارێزراو دەتاقیکرێتەوە.';

  function isReady(client) {
    return Boolean(client || window.gcSupabaseConfig?.publishableKeyPresent);
  }

  function replaceLegacyLeafText(text) {
    document.querySelectorAll('body *').forEach((node) => {
      if (node.children.length) return;
      const current = (node.textContent || '').trim();
      if (!current.includes(LEGACY_MESSAGE)) return;
      node.textContent = text;
      node.setAttribute('data-gc-runtime-state', text === READY_MESSAGE ? 'ready' : 'guarded');
    });
  }

  function updateConnectionNotice(text) {
    const notice = document.getElementById('adminNotConfigured');
    if (notice) {
      notice.textContent = text;
      notice.dataset.gcRuntimeState = text === READY_MESSAGE ? 'ready' : 'guarded';
      notice.hidden = text === READY_MESSAGE;
      notice.setAttribute('aria-live', 'polite');
    }
    replaceLegacyLeafText(text);
  }

  function startLegacyTextGuard() {
    replaceLegacyLeafText(FAIL_MESSAGE);
    const observer = new MutationObserver(() => replaceLegacyLeafText(FAIL_MESSAGE));
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }

  function loadBridgeOnce() {
    if (typeof window.gcEnsureSupabase === 'function' || window.gcSupabase) {
      return Promise.resolve(window.gcSupabase);
    }

    const existing = document.querySelector('script[data-gc-runtime-bridge], script[src*="production-bridge.js"]');
    if (existing) {
      return new Promise((resolve) => {
        const finish = () => resolve(window.gcSupabase || null);
        window.addEventListener('gc:supabase-ready', finish, { once: true });
        setTimeout(finish, 7000);
      });
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = BRIDGE;
      script.async = true;
      script.defer = true;
      script.dataset.gcRuntimeBridge = '1';

      const finish = () => resolve(window.gcSupabase || null);
      script.addEventListener('error', finish, { once: true });
      window.addEventListener('gc:supabase-ready', finish, { once: true });
      setTimeout(finish, 8000);
      document.head.appendChild(script);
    });
  }

  async function boot() {
    startLegacyTextGuard();
    updateConnectionNotice(FAIL_MESSAGE);
    try {
      const client = await loadBridgeOnce();
      updateConnectionNotice(isReady(client) ? READY_MESSAGE : FAIL_MESSAGE);
    } catch (error) {
      console.warn('[Globall Cloud] runtime guard:', error);
      updateConnectionNotice(FAIL_MESSAGE);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    void boot();
  }
})();
