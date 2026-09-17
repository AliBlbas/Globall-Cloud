/* Globall Cloud — customer auth runtime hardening 2026-09-18
 * Makes the real Supabase client available before the existing customer auth flow runs.
 * Does not replace the existing sign-in/profile/data handlers.
 */
(() => {
  'use strict';
  if (window.__gcCustomerAuthFix20260918) return;
  window.__gcCustomerAuthFix20260918 = true;

  const get = (id) => document.getElementById(id);
  const goPortal = (event) => {
    event?.preventDefault();
    if (typeof window.route === 'function') {
      try { window.route('portal'); return; } catch (_) {}
    }
    window.location.href = '/dashboard';
  };

  const ensureLoginEntry = () => {
    const navActions = document.querySelector('.gc-nav-actions');
    if (navActions && !navActions.querySelector('[data-gc-customer-login]')) {
      const link = document.createElement('a');
      link.href = '/dashboard';
      link.textContent = 'چوونەژوورەوەی کڕیار';
      link.dataset.gcCustomerLogin = '1';
      link.className = 'gc-btn gc-btn-ghost gc-customer-login';
      link.addEventListener('click', goPortal);
      navActions.insertBefore(link, navActions.querySelector('.gc-staff') || navActions.firstChild);
    }
    const mobile = document.querySelector('.gc-mobile-menu');
    if (mobile && !mobile.querySelector('[data-gc-customer-login]')) {
      const link = document.createElement('a');
      link.href = '/dashboard';
      link.textContent = '◉ چوونەژوورەوەی کڕیار';
      link.dataset.gcCustomerLogin = '1';
      link.className = 'gc-customer-login-mobile';
      link.addEventListener('click', goPortal);
      mobile.insertBefore(link, mobile.firstChild);
    }
  };

  const ensureClient = () => {
    if (window.gcSupabase?.auth) {
      window.sb = window.gcSupabase;
      return Promise.resolve(window.gcSupabase);
    }
    if (typeof window.gcEnsureSupabase === 'function') {
      return window.gcEnsureSupabase().then((client) => {
        window.sb = client;
        return client;
      }).catch(() => null);
    }
    return Promise.resolve(null);
  };

  const syncAuthState = async () => {
    const client = await ensureClient();
    if (!client?.auth) return;
    try {
      const { data } = await client.auth.getSession();
      document.documentElement.dataset.gcCustomerAuth = data?.session ? 'authenticated' : 'guest';
    } catch (_) {}
  };

  const boot = () => {
    ensureLoginEntry();
    void ensureClient();
    void syncAuthState();
    window.setTimeout(ensureLoginEntry, 400);
    window.setTimeout(ensureLoginEntry, 1200);
    window.setTimeout(ensureLoginEntry, 2500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
