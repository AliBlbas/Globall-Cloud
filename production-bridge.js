/* Globall Cloud — production integration bridge
 * Keeps the public page and internal staff surfaces on one verified
 * Supabase client/config without exposing service-role credentials.
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
  const PUBLIC_CONFIG = `${SUPABASE_URL}/functions/v1/public-config?key=usd_iqd_rate`;
  const LEGACY_MESSAGE = 'Supabase هێشتا پەیوەست نەکراوە';
  const READY_MESSAGE = 'Supabase بە سەرکەوتوویی پەیوەستە و سیستەمەکە ئامادەیە.';
  const LOADING_MESSAGE = 'پەیوەندیی پارێزراو بە Supabase لە پڕۆسەی پشکنینە.';

  const ready = () => Boolean(window.supabase && typeof window.supabase.createClient === 'function');

  const updateConnectionMessage = (connected) => {
    document.querySelectorAll('[data-gc-supabase-status]').forEach((node) => {
      node.textContent = connected ? 'Supabase connected' : 'Connecting to Supabase…';
      node.dataset.state = connected ? 'ready' : 'loading';
    });

    document.querySelectorAll('*').forEach((node) => {
      if (node.children.length) return;
      if ((node.textContent || '').trim() === LEGACY_MESSAGE) {
        node.textContent = connected ? READY_MESSAGE : LOADING_MESSAGE;
        node.setAttribute('data-gc-connection-message', connected ? 'ready' : 'loading');
      }
    });
  };

  const loadClientLibrary = () => new Promise((resolve, reject) => {
    if (ready()) return resolve();
    const existing = document.querySelector('script[data-gc-supabase-loader]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = CDN;
    script.async = true;
    script.dataset.gcSupabaseLoader = '1';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Supabase client library failed to load'));
    document.head.appendChild(script);
  });

  const ensureClient = async () => {
    await loadClientLibrary();
    if (!window.gcSupabase) {
      window.gcSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        global: { headers: { 'x-gc-client': 'web-production' } },
      });
    }
    window.sb = window.gcSupabase;
    window.gcSupabaseConfig = { url: SUPABASE_URL, publishableKeyPresent: Boolean(SUPABASE_PUBLISHABLE_KEY) };
    window.dispatchEvent(new CustomEvent('gc:supabase-ready', { detail: { client: window.gcSupabase } }));
    return window.gcSupabase;
  };

  const verifyPublicConnection = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(PUBLIC_CONFIG, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Accept: 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`Supabase public-config health ${response.status}`);
      const body = await response.json();
      if (!body || body.key !== 'usd_iqd_rate') throw new Error('Supabase public-config returned an invalid payload');
      updateConnectionMessage(true);
      return true;
    } finally {
      clearTimeout(timeout);
    }
  };

  const boot = async () => {
    updateConnectionMessage(false);
    try {
      await ensureClient();
      await verifyPublicConnection();
    } catch (error) {
      console.error('[Globall Cloud] Production bridge:', error);
      window.gcSupabaseError = String(error?.message || error);
      updateConnectionMessage(false);
    }
  };

  window.gcEnsureSupabase = ensureClient;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    void boot();
  }
})();
