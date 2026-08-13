/* Globall Cloud — production runtime guard
 * Cross-browser defensive bootstrap for public pages. Never exposes service-role
 * credentials; it only loads the existing publishable-key bridge once.
 */
(() => {
  'use strict';

  const BRIDGE = '/production-bridge.js?v=20260813-3';
  const LEGACY_MESSAGE = 'Supabase هێشتا پەیوەست نەکراوە';
  const READY_MESSAGE = 'پەیوەندیی پارێزراو بە Supabase چالاکە و سیستەمەکە ئامادەیە.';
  const FAIL_MESSAGE = 'پەیوەندیی خزمەتگوزاری بە شێوەی پارێزراو دەتاقیکرێتەوە.';

  function updateLegacyMessage(text) {
    document.querySelectorAll('body *').forEach((node) => {
      if (node.children.length) return;
      if ((node.textContent || '').includes(LEGACY_MESSAGE)) {
        node.textContent = text;
        node.setAttribute('data-gc-runtime-state', text === READY_MESSAGE ? 'ready' : 'guarded');
      }
    });
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
    updateLegacyMessage(FAIL_MESSAGE);
    try {
      const client = await loadBridgeOnce();
      if (client || window.gcSupabaseConfig?.publishableKeyPresent) {
        updateLegacyMessage(READY_MESSAGE);
      }
    } catch (error) {
      console.warn('[Globall Cloud] runtime guard:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    void boot();
  }
})();
