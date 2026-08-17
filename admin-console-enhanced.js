/* Globall Cloud — enhanced admin workspace + auth recovery
 * Defensive layer: keeps a valid Supabase session from being mistaken for
 * a failed admin data load, and adds a polished owner/staff workspace UX.
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const API_URL = `${SUPABASE_URL}/functions/v1/account-admin`;
  let rescueClient = null;

  const qs = (id) => document.getElementById(id);
  const roleLabel = { super_admin: 'Super Admin', admin: 'Admin', accountant: 'Accountant' };

  function ensureClient() {
    if (rescueClient) return rescueClient;
    if (!window.supabase?.createClient) return null;
    rescueClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return rescueClient;
  }

  function setLoginMessage(message, good = false) {
    const el = qs('loginMsg');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = good ? 'var(--good)' : 'var(--muted)';
  }

  function setWorkspaceState(authenticated, role = '') {
    document.documentElement.dataset.gcAdminAuth = authenticated ? 'ready' : 'guest';
    const gate = qs('authGate');
    const logout = qs('logoutBtn');
    if (authenticated) {
      gate?.classList.add('hidden');
      logout?.classList.remove('hidden');
      const whoamiSub = qs('whoamiSub');
      if (whoamiSub && role) whoamiSub.textContent = `${roleLabel[role] || role} access active`;
    }
  }

  async function callAdmin(path = '/', options = {}) {
    const client = ensureClient();
    if (!client) throw new Error('Supabase client failed to initialize');
    const { data: { session } } = await client.auth.getSession();
    if (!session) throw new Error('Please sign in first');
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${session.access_token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
    return data;
  }

  function clearLegacySupabaseWarning() {
    const needles = [
      'Supabase هێشتا پەیوەست نەکراوە',
      'URL و publishable key لە کۆدەکەدا زیادبکە',
      'Supabase connection is not configured',
      'Supabase is not connected'
    ];
    document.querySelectorAll('body *').forEach((node) => {
      if (node.children.length === 0 && needles.some((needle) => (node.textContent || '').includes(needle))) {
        node.textContent = '';
        node.hidden = true;
      }
    });
  }

  async function recoverSession() {
    const client = ensureClient();
    if (!client) return false;
    const { data: { session } } = await client.auth.getSession();
    if (!session) return false;

    let role = session.user?.app_metadata?.role || session.user?.user_metadata?.role || '';
    try {
      const result = await callAdmin('/?kind=staff');
      const row = (result.items || []).find((item) => item.id === session.user.id);
      if (row?.role) role = row.role;
    } catch (error) {
      console.warn('[Globall Cloud] admin role lookup fallback:', error);
    }

    setWorkspaceState(true, role);
    const who = qs('whoami');
    if (who) who.textContent = `${session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Staff'} · ${session.user.email || ''}`;
    const sub = qs('whoamiSub');
    if (sub) sub.textContent = `${roleLabel[role] || role || 'Staff'} access active`;
    const badge = qs('roleBadge');
    if (badge) {
      badge.textContent = `${roleLabel[role] || role || 'Staff'} access`;
      badge.classList.remove('hidden');
    }

    try {
      if (typeof window.resolveCurrentRole === 'function') await window.resolveCurrentRole(session.user);
    } catch (error) {
      console.warn('[Globall Cloud] original role resolver skipped:', error);
    }
    try {
      if (typeof window.refreshAll === 'function') await window.refreshAll();
    } catch (error) {
      console.warn('[Globall Cloud] admin data refresh recovered:', error);
      const status = qs('loadStatus');
      if (status) {
        status.textContent = 'Login is active. Some management data needs a refresh.';
        status.classList.add('warn');
        status.style.display = 'inline-flex';
      }
    }
    clearLegacySupabaseWarning();
    return true;
  }

  function showLoginShell() {
    const gate = qs('authGate');
    if (gate) gate.classList.remove('hidden');
    const who = qs('whoami');
    if (who) who.textContent = 'Secure staff workspace';
    const sub = qs('whoamiSub');
    if (sub) sub.textContent = 'Sign in to open the operational control center';
    clearLegacySupabaseWarning();
  }

  function enhanceLabels() {
    const title = document.querySelector('.title');
    if (title && !title.dataset.gcEnhanced) {
      title.dataset.gcEnhanced = '1';
      title.textContent = 'Operations Command Center';
    }
    const subtitle = document.querySelector('.subtitle');
    if (subtitle && !subtitle.dataset.gcEnhanced) {
      subtitle.dataset.gcEnhanced = '1';
      subtitle.textContent = 'Customers · Shipments · Staff · Warehouses · Finance · Audit';
    }
    const chips = document.querySelectorAll('.chip');
    chips.forEach((chip) => chip.setAttribute('data-gc-admin-chip', '1'));
  }

  function installLoginRecovery() {
    const form = qs('staffLoginForm');
    if (!form || form.dataset.gcRescueInstalled) return;
    form.dataset.gcRescueInstalled = '1';

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const client = ensureClient();
      if (!client) {
        setLoginMessage('Supabase client نەکراوەتەوە. تکایە دووبارە هەوڵبدە.');
        return;
      }
      const email = qs('loginEmail')?.value.trim();
      const password = qs('loginPassword')?.value || '';
      if (!email || !password) {
        setLoginMessage('ئیمەیڵ و وشەی نهێنی پڕ بکەرەوە.');
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      submit?.classList.add('loading');
      setLoginMessage('پارێزراوەکە پەیوەندی دەکات...');
      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setLoginMessage('چوویتە ژوورەوە — Workspace دەکرێتەوە.', true);
        await recoverSession();
      } catch (error) {
        setLoginMessage(error?.message || 'Login failed');
      } finally {
        submit?.classList.remove('loading');
      }
    }, true);
  }

  function installWorkspaceShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        qs('searchBox')?.focus();
      }
      if (event.key.toLowerCase() === 'r' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (typeof window.refreshAll === 'function') window.refreshAll();
      }
    });
  }

  async function boot() {
    enhanceLabels();
    installWorkspaceShortcuts();
    installLoginRecovery();
    const client = ensureClient();
    if (!client) return;
    const { data: { session } } = await client.auth.getSession();
    if (session) {
      await recoverSession();
    } else {
      showLoginShell();
    }
    setTimeout(clearLegacySupabaseWarning, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else void boot();
})();
