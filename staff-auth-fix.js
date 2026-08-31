/* Globall Cloud — Staff OS authentication bridge */
(() => {
  'use strict';

  if (!/^\/staff(?:-os)?(?:\.html)?\/?$/.test(window.location.pathname)) return;
  if (window.__gcStaffAuthBooted) return;
  window.__gcStaffAuthBooted = true;

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
  const STAFF_VERIFY_URL = `${SUPABASE_URL}/functions/v1/staff-auth-verify`;
  const state = { client: null, binding: false, bridgeInstalled: false };

  const setMessage = (text, tone = 'error') => {
    const node = document.getElementById('loginError') || document.getElementById('loginMsg');
    if (!node) return;
    node.textContent = text || '';
    node.style.color = tone === 'success' ? '#9ff3d0' : '#ffb9c0';
  };

  const setBusy = (busy) => {
    const form = document.getElementById('loginForm');
    const button = form?.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
    button.textContent = busy ? 'چاوەڕوان بە…' : 'چوونەژوورەوە بۆ Staff OS →';
  };

  const showApp = () => {
    const gate = document.getElementById('loginGate') || document.getElementById('gate');
    const app = document.getElementById('app');
    gate?.classList.add('hidden');
    app?.classList.remove('hidden');
  };

  const showGate = () => {
    const gate = document.getElementById('loginGate') || document.getElementById('gate');
    const app = document.getElementById('app');
    app?.classList.add('hidden');
    gate?.classList.remove('hidden');
  };

  const loadScript = (src, dataKey) => new Promise((resolve, reject) => {
    const selector = dataKey ? `script[data-${dataKey}="1"]` : `script[src="${src}"]`;
    const existing = document.querySelector(selector);
    if (existing) {
      if (existing.dataset.gcLoaded === '1') { resolve(); return; }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    if (dataKey) script.dataset[dataKey] = '1';
    script.addEventListener('load', () => { script.dataset.gcLoaded = '1'; resolve(); }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });

  const loadLayer = (path, key) => {
    if (document.querySelector(`script[data-${key}="1"]`)) return;
    const script = document.createElement('script');
    script.src = `/${path}?v=20260831-2`;
    script.async = true;
    script.dataset[key] = '1';
    document.body.appendChild(script);
  };

  const getClient = async () => {
    if (state.client) return state.client;

    if (typeof window.gcEnsureSupabase === 'function') {
      try {
        state.client = await window.gcEnsureSupabase();
        window.sb = state.client;
        return state.client;
      } catch (_) {
        // Continue with a direct bootstrap below.
      }
    }

    if (window.gcSupabase?.auth) {
      state.client = window.gcSupabase;
      window.sb = state.client;
      return state.client;
    }

    if (!window.supabase?.createClient) {
      try {
        await loadScript('/production-bridge.js?v=20260831-2', 'gc-production-bridge');
      } catch (_) {
        // Shared bridge is optional for Staff OS; load the SDK directly.
      }
    }

    if (!window.supabase?.createClient) {
      await loadScript(SUPABASE_CDN, 'gc-supabase-cdn');
    }

    if (!window.supabase?.createClient) throw new Error('Supabase client failed to load.');

    state.client = window.gcSupabase || window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: { headers: { 'x-gc-client': 'staff-os' } },
    });

    window.gcSupabase = state.client;
    window.sb = state.client;
    return state.client;
  };

  const verifyStaff = async (client, user) => {
    if (!user?.id || !user?.email) {
      const error = new Error('Session ـی دروست نەدۆزرایەوە.');
      error.status = 401;
      throw error;
    }

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (sessionError || !accessToken) {
      const error = new Error('Session ـی دروست نەدۆزرایەوە.');
      error.status = 401;
      throw error;
    }

    const response = await fetch(STAFF_VERIFY_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const raw = await response.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }

    if (!response.ok || payload?.authorized !== true || !payload?.staff?.id) {
      const error = new Error(
        response.status === 401
          ? 'Session ـی دروست نەدۆزرایەوە.'
          : response.status === 403
            ? 'ئەم هەژمارەیە ڕێگەی Staff OS نییە.'
            : payload?.error || 'پەیوەندیی ستاف پشتڕاست نەکرایەوە.'
      );
      error.status = response.status || 500;
      throw error;
    }

    return payload.staff;
  };

  const installLegacyStaffApiBridge = (client) => {
    if (state.bridgeInstalled) return;
    state.bridgeInstalled = true;

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      const isStaffList = url.includes('/functions/v1/account-admin')
        && /[?&]kind=staff(?:&|$)/.test(url)
        && !/[?&]action=/.test(url);

      if (!isStaffList) return originalFetch(input, init);

      const response = await originalFetch(input, init);
      if (response.ok || response.status !== 403) return response;

      try {
        const session = (await client.auth.getSession()).data?.session;
        if (!session?.access_token || !session?.user?.id) return response;

        const verifyResponse = await originalFetch(STAFF_VERIFY_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Accept: 'application/json',
          },
          cache: 'no-store',
        });
        if (!verifyResponse.ok) return response;

        const payload = await verifyResponse.json().catch(() => null);
        const staff = payload?.authorized === true ? payload.staff : null;
        if (!staff || String(staff.id) !== String(session.user.id)) return response;

        return new Response(
          JSON.stringify({ items: [staff], kind: 'staff', self_only: true }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          },
        );
      } catch {
        return response;
      }
    };
  };

  const applyStaffIdentity = (staff) => {
    window.gcStaffIdentity = {
      id: staff.id,
      email: staff.email || '',
      role: staff.role || '',
      branch: staff.branch || 'all',
      fullName: staff.full_name || '',
    };
  };

  const loadStaffApp = () => {
    loadLayer('staff-os-production-layer.js', 'gc-production-layer');
    loadLayer('staff-os-enterprise.js', 'gc-enterprise-layer');
  };

  const ensureClientAndRestore = async () => {
    const client = await getClient();
    installLegacyStaffApiBridge(client);

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData?.session?.user?.id) return false;

    try {
      const staff = await verifyStaff(client, sessionData.session.user);
      applyStaffIdentity(staff);
      showApp();
      loadStaffApp();
      return true;
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        await client.auth.signOut().catch(() => undefined);
        showGate();
        setMessage(error?.message || 'پەیوەندیی ستاف پشتڕاست نەکرایەوە؛ تکایە دووبارە بچۆ ژوورەوە.');
      } else {
        throw error;
      }
      return false;
    }
  };

  const bindLogin = () => {
    const form = document.getElementById('loginForm');
    if (!form || state.binding) return;
    state.binding = true;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setMessage('');
      setBusy(true);

      try {
        const client = await getClient();
        installLegacyStaffApiBridge(client);

        const email = String(document.getElementById('email')?.value || '').trim().toLowerCase();
        const password = String(document.getElementById('password')?.value || '');
        if (!email || !password) throw new Error('ئیمەیڵ و وشەی نهێنی پڕبکەرەوە.');

        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const staff = await verifyStaff(client, data?.user);
        applyStaffIdentity(staff);
        showApp();
        loadStaffApp();
        setMessage('بە سەرکەوتوویی چوویتە ناو Staff OS.', 'success');
      } catch (error) {
        console.error('[Globall Cloud] Staff login:', error);
        const message = /invalid login credentials/i.test(error?.message || '')
          ? 'ئیمەیڵ یان وشەی نهێنی هەڵەیە.'
          : error?.message || 'نەتوانرا login بکرێت.';
        setMessage(message);
      } finally {
        setBusy(false);
      }
    }, { capture: true });
  };

  const boot = async () => {
    showGate();
    bindLogin();

    try {
      await ensureClientAndRestore();
    } catch (error) {
      console.error('[Globall Cloud] Staff auth bridge:', error);
      showGate();
      setMessage('پەیوەندیی سەرەتایی ئامادە نییە؛ دووبارە هەوڵبدەرەوە یان login بکە.');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void boot(), { once: true });
  } else {
    void boot();
  }
})();
