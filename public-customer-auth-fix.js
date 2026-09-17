/* Globall Cloud — customer auth runtime hardening 2026-09-18
 * Reuses the existing Supabase client and existing customer auth UI.
 */
(() => {
  'use strict';
  if (window.__gcCustomerAuthFix20260918) return;
  window.__gcCustomerAuthFix20260918 = true;
  const get = (id) => document.getElementById(id);
  const setBusy = (button, busy) => {
    if (!button) return;
    button.disabled = busy;
    if (busy) {
      button.dataset.gcAuthOriginal = button.textContent || '';
      button.textContent = 'چاوەڕوان بە…';
    } else if (button.dataset.gcAuthOriginal) button.textContent = button.dataset.gcAuthOriginal;
  };
  const showError = (message) => {
    const el = get('portalSignInError');
    if (!el) return;
    el.textContent = message;
    el.style.display = message ? 'block' : 'none';
  };
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
  const showDashboard = () => {
    get('portalSignIn')?.style.setProperty('display','none','important');
    get('portalDashboard')?.style.setProperty('display','block','important');
    document.documentElement.dataset.gcCustomerAuth = 'authenticated';
  };
  const tryRefreshCustomerView = async () => {
    for (const name of ['loadPortalProfile','loadCustomerProfile','renderCustomerDashboard','refreshPortal','loadPortalData']) {
      if (typeof window[name] === 'function') {
        try { await window[name](); } catch (_) {}
        return;
      }
    }
  };
  const bind = () => {
    ensureLoginEntry();
    const form = get('portalSignInForm');
    if (!form || form.dataset.gcAuthFixBound === '1') return;
    form.dataset.gcAuthFixBound = '1';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const email = String(get('siEmail')?.value || '').trim();
      const password = String(get('siPassword')?.value || '');
      const button = get('portalSignInBtn');
      showError('');
      if (!email || !password) {
        showError('ئیمەیڵ و وشەی نهێنی پڕبکەرەوە.');
        return;
      }
      setBusy(button, true);
      try {
        let client = window.gcSupabase || window.sb || null;
        if (!client && typeof window.gcEnsureSupabase === 'function') client = await window.gcEnsureSupabase();
        if (!client) throw new Error('پەیوەندی بە Supabase ئامادە نییە. تکایە دووبارە هەوڵ بدەوە.');
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data?.session) throw new Error('Session دروست نەبوو. تکایە دووبارە هەوڵ بدەوە.');
        showDashboard();
        await tryRefreshCustomerView();
        window.dispatchEvent(new CustomEvent('gc:customer-authenticated', { detail: { session: data.session } }));
      } catch (error) {
        const raw = String(error?.message || error || 'چوونەژوورەوە سەرکەوتوو نەبوو.');
        const friendly = /email not confirmed/i.test(raw)
          ? 'تکایە یەکەم جار ئیمەیلەکەت پشتڕاست بکەرەوە، پاشان دووبارە بچۆ ژوورەوە.'
          : /invalid login credentials/i.test(raw)
            ? 'ئیمەیڵ یان وشەی نهێنی هەڵەیە.'
            : raw;
        showError(friendly);
      } finally {
        setBusy(button, false);
      }
    }, true);
  };
  const observe = () => {
    bind();
    const observer = new MutationObserver(bind);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    [400,1000,2000,3500].forEach((delay) => window.setTimeout(bind, delay));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe, { once: true });
  else observe();
})();
