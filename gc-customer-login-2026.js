/* Globall Cloud — real customer sign-in surface + homepage service icons. */
(() => {
  'use strict';
  if (window.__gcCustomerLogin20260918) return;
  window.__gcCustomerLogin20260918 = true;

  const SVG = {
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c.8-4 3-6 7-6s6.2 2 7 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg>',
    air: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 14 7-2 5-8 2 1-2 8 6 2v2l-7-1-2 5-2-1 .5-4.5L3 16v-2Z"/></svg>',
    sea: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17h16l-2 3H6l-2-3Z"/><path d="M6 17V7h12v10M9 7V4h6v3M3 14l9 2 9-2"/></svg>',
    land: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>',
    customs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V5h16v15M4 9h16M8 5V3h8v2M8 13h8M8 17h5"/></svg>'
  };

  const getClient = async () => {
    if (window.gcSupabase?.auth) return window.gcSupabase;
    if (typeof window.gcEnsureSupabase === 'function') {
      try { return await window.gcEnsureSupabase(); } catch (_) {}
    }
    if (!window.supabase?.createClient) {
      await new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-gc-login-supabase]');
        if (existing) { existing.addEventListener('load', resolve, { once:true }); existing.addEventListener('error', reject, { once:true }); return; }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.defer = true;
        script.dataset.gcLoginSupabase = '1';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    if (!window.supabase?.createClient) return null;
    const url = 'https://ahslifnthiwfkmaswjno.supabase.co';
    const key = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
    const client = window.supabase.createClient(url, key, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } });
    window.gcSupabase = client;
    window.sb = client;
    return client;
  };

  const close = () => {
    const modal = document.getElementById('gcCustomerLoginModal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('gc-login-open');
  };

  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(form.elements.email?.value || '').trim();
    const password = String(form.elements.password?.value || '');
    const button = form.querySelector('button[type="submit"]');
    const error = form.querySelector('[data-gc-login-error]');
    if (error) error.textContent = '';
    if (!email || !password) { if (error) error.textContent = 'ئیمەیڵ و وشەی نهێنی پڕبکەرەوە.'; return; }
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span>چاوەڕوان بە…</span>';
    try {
      const client = await getClient();
      if (!client?.auth) throw new Error('پەیوەندیی چوونەژوورەوە بەردەست نییە.');
      const { data, error: authError } = await client.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (!data?.session) throw new Error('Session دروست نەبوو.');
      document.documentElement.dataset.gcCustomerAuth = 'authenticated';
      close();
      window.location.href = '/dashboard';
    } catch (err) {
      const raw = String(err?.message || err || 'چوونەژوورەوە سەرکەوتوو نەبوو.');
      const message = /invalid login credentials/i.test(raw) ? 'ئیمەیڵ یان وشەی نهێنی هەڵەیە.' : /email not confirmed/i.test(raw) ? 'پێویستە سەرەتا ئیمەیلەکەت پشتڕاست بکەیتەوە.' : raw;
      if (error) error.textContent = message;
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  };

  const open = async () => {
    let modal = document.getElementById('gcCustomerLoginModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'gcCustomerLoginModal';
      modal.className = 'gc-customer-login-modal';
      modal.hidden = true;
      modal.innerHTML = `<div class="gc-customer-login-card" role="dialog" aria-modal="true" aria-labelledby="gcLoginTitle"><div class="gc-login-top"><div class="gc-login-mark">${SVG.lock}</div><button type="button" class="gc-btn gc-btn-ghost gc-login-close" data-gc-login-close aria-label="داخستن">×</button></div><div class="gc-login-title" id="gcLoginTitle">چوونەژوورەوەی کڕیار</div><div class="gc-login-subtitle">CUSTOMER PORTAL • SECURE ACCESS</div><form class="gc-login-form" data-gc-customer-login-form><label>ئیمەیڵ<input name="email" type="email" autocomplete="email" inputmode="email" required placeholder="name@example.com"></label><label>وشەی نهێنی<input name="password" type="password" autocomplete="current-password" required placeholder="••••••••"></label><div class="gc-login-error" data-gc-login-error role="alert"></div><button class="gc-btn gc-btn-primary gc-login-submit" type="submit">${SVG.user}<span>چوونەژوورەوە</span></button><p class="gc-login-help">دوای چوونەژوورەوە shipment، invoice، بەڵگە و ئاگادارییەکانت دەبینیت.</p></form></div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
      modal.querySelector('[data-gc-login-close]').addEventListener('click', close);
      modal.querySelector('[data-gc-customer-login-form]').addEventListener('submit', submit);
    }
    modal.hidden = false;
    document.body.classList.add('gc-login-open');
    try {
      const client = await getClient();
      const session = client?.auth ? (await client.auth.getSession()).data.session : null;
      if (session) { window.location.href = '/dashboard'; return; }
    } catch (_) {}
    window.setTimeout(() => modal.querySelector('input[name="email"]')?.focus(), 40);
  };

  const bind = () => {
    document.querySelectorAll('[data-gc-customer-login]').forEach((el) => {
      if (el.dataset.gcLoginBound === '1') return;
      el.dataset.gcLoginBound = '1';
      el.addEventListener('click', (event) => { event.preventDefault(); void open(); });
    });
  };

  const ensureEntry = () => {
    const actions = document.querySelector('.gc-nav-actions');
    if (actions && !actions.querySelector('[data-gc-customer-login]')) {
      const a = document.createElement('a');
      a.href = '/dashboard';
      a.className = 'gc-btn gc-btn-ghost gc-customer-login';
      a.dataset.gcCustomerLogin = '1';
      a.textContent = 'چوونەژوورەوەی کڕیار';
      actions.insertBefore(a, actions.querySelector('.gc-staff') || actions.firstChild);
    }
    const mobile = document.querySelector('.gc-mobile-menu');
    if (mobile && !mobile.querySelector('[data-gc-customer-login]')) {
      const a = document.createElement('a');
      a.href = '/dashboard';
      a.dataset.gcCustomerLogin = '1';
      a.textContent = '◉ چوونەژوورەوەی کڕیار';
      mobile.insertBefore(a, mobile.firstChild);
    }
    bind();
  };

  const polishIcons = () => {
    const map = { '✈️':SVG.air,'🚢':SVG.sea,'🚚':SVG.land,'🛃':SVG.customs };
    document.querySelectorAll('.gc-service b').forEach((label) => {
      if (label.dataset.gcPremiumIcon === '1') return;
      const emoji = Object.keys(map).find((key) => label.textContent.trim().startsWith(key));
      if (!emoji) return;
      label.dataset.gcPremiumIcon = '1';
      const icon = document.createElement('span');
      icon.className = 'gc-icon';
      icon.innerHTML = map[emoji];
      label.textContent = label.textContent.trim().slice(emoji.length).trim();
      label.prepend(icon);
    });
  };

  const boot = () => { ensureEntry(); polishIcons(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
  new MutationObserver(() => { ensureEntry(); polishIcons(); }).observe(document.documentElement, { childList:true, subtree:true });
})();
