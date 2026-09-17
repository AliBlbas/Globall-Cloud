/* Globall Cloud — customer portal auth repair 2026-09-18 */
(() => {
  'use strict';
  if (window.__gcCustomerAuthRepair20260918) return;
  window.__gcCustomerAuthRepair20260918 = true;

  const byId = (id) => document.getElementById(id);
  const errorBox = () => byId('portalSignInError');
  const showError = (message) => {
    const el = errorBox();
    if (!el) return;
    el.textContent = message || '';
    el.style.display = message ? 'block' : 'none';
  };
  const setBusy = (button, busy) => {
    if (!button) return;
    if (busy) {
      button.disabled = true;
      button.dataset.gcOriginalText = button.textContent || '';
      button.textContent = 'چاوەڕوان بە…';
    } else {
      button.disabled = false;
      if (button.dataset.gcOriginalText) button.textContent = button.dataset.gcOriginalText;
    }
  };

  const loadStyles = () => {
    if (document.querySelector('link[data-gc-reference-ui="1"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/gc-reference-inspired-2026.css?v=20260918-2';
    link.dataset.gcReferenceUi = '1';
    document.head.appendChild(link);
  };

  const getClient = async () => {
    if (window.gcSupabase?.auth) return window.gcSupabase;
    if (window.sb?.auth) return window.sb;
    if (typeof window.gcEnsureSupabase === 'function') return window.gcEnsureSupabase();
    if (window.supabase?.createClient) {
      const url = 'https://ahslifnthiwfkmaswjno.supabase.co';
      const key = 'sb_publishable_X9rQzP7m2nV4cL8kJ1hF6dS3pA0eB5nM';
      return window.supabase.createClient(url, key);
    }
    return null;
  };

  const ensurePortalVisible = () => {
    const login = byId('portalSignIn');
    const dash = byId('portalDashboard');
    if (login) login.style.display = 'none';
    if (dash) dash.style.display = 'block';
    document.documentElement.dataset.gcCustomerAuth = 'authenticated';
  };

  const refreshPortal = async () => {
    for (const name of ['loadPortalProfile','loadCustomerProfile','renderCustomerDashboard','refreshPortal','loadPortalData']) {
      if (typeof window[name] !== 'function') continue;
      try { await window[name](); } catch (_) {}
      return;
    }
  };

  const redirectToPortal = () => {
    if (window.location.pathname === '/dashboard' || window.location.pathname === '/customer-portal.html') return;
    window.location.href = '/dashboard';
  };

  const bindLogin = () => {
    const form = byId('portalSignInForm');
    if (!form || form.dataset.gcRealAuthBound === '1') return;
    form.dataset.gcRealAuthBound = '1';

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const email = String(byId('siEmail')?.value || '').trim();
      const password = String(byId('siPassword')?.value || '');
      const button = byId('portalSignInBtn');
      showError('');
      if (!email || !password) {
        showError('تکایە ئیمەیڵ و وشەی نهێنی پڕبکەرەوە.');
        return;
      }
      setBusy(button, true);
      try {
        const client = await getClient();
        if (!client?.auth?.signInWithPassword) throw new Error('پەیوەندی Supabase ئامادە نییە.');
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data?.session) throw new Error('Session دروست نەبوو.');
        window.sb = client;
        ensurePortalVisible();
        document.documentElement.dataset.gcCustomerAuth = 'authenticated';
        window.dispatchEvent(new CustomEvent('gc:customer-authenticated', { detail: data.session }));
        await refreshPortal();
        window.setTimeout(redirectToPortal, 80);
      } catch (err) {
        const raw = String(err?.message || err || 'چوونەژوورەوە سەرکەوتوو نەبوو.');
        const message = /invalid login credentials/i.test(raw)
          ? 'ئیمەیڵ یان وشەی نهێنی هەڵەیە.'
          : /email not confirmed/i.test(raw)
            ? 'تکایە ئیمەیلەکەت پشتڕاست بکەرەوە، پاشان دووبارە هەوڵ بدەوە.'
            : raw;
        showError(message);
      } finally {
        setBusy(button, false);
      }
    }, true);
  };

  const syncSession = async () => {
    try {
      const client = await getClient();
      if (!client?.auth) return;
      window.sb = client;
      const { data } = await client.auth.getSession();
      if (data?.session) {
        document.documentElement.dataset.gcCustomerAuth = 'authenticated';
        ensurePortalVisible();
      } else {
        document.documentElement.dataset.gcCustomerAuth = 'guest';
      }
    } catch (_) {}
  };

  const boot = () => {
    loadStyles();
    bindLogin();
    void syncSession();
    window.setTimeout(bindLogin, 250);
    window.setTimeout(bindLogin, 750);
    window.setTimeout(bindLogin, 1500);
    window.setTimeout(bindLogin, 3000);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
