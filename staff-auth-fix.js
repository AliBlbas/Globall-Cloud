/* Globall Cloud — Staff OS authentication bridge */
(() => {
  'use strict';

  if (!/^\/staff(?:-os)?(?:\.html)?\/?$/.test(window.location.pathname)) return;
  if (window.__gcStaffAuthBooted) return;
  window.__gcStaffAuthBooted = true;

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';

  const waitFor = (getter, timeoutMs = 10000, intervalMs = 100) => new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      try {
        const value = getter();
        if (value) {
          clearInterval(timer);
          resolve(value);
          return;
        }
        if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error('Authentication client did not initialize in time.'));
        }
      } catch (error) {
        clearInterval(timer);
        reject(error);
      }
    }, intervalMs);
  });

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

  const loadLayer = (path, key) => {
    if (document.querySelector(`script[data-${key}="1"]`)) return;
    const script = document.createElement('script');
    script.src = `/${path}?v=20260830-1`;
    script.async = true;
    script.dataset[key] = '1';
    document.body.appendChild(script);
  };

  const getClient = async () => {
    if (typeof window.gcEnsureSupabase === 'function') {
      const client = await window.gcEnsureSupabase();
      window.sb = client;
      return client;
    }

    if (window.gcSupabase) {
      window.sb = window.gcSupabase;
      return window.gcSupabase;
    }

    const supabaseLib = await waitFor(() => window.supabase || null);
    window.gcSupabase = supabaseLib.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: { headers: { 'x-gc-client': 'staff-os' } },
    });
    window.sb = window.gcSupabase;
    return window.gcSupabase;
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

    const response = await fetch(`${SUPABASE_URL}/functions/v1/staff-auth-verify`, {
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

  const boot = async () => {
    try {
      const client = await getClient();
      const form = document.getElementById('loginForm');
      if (!form) return;

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        setMessage('');
        setBusy(true);

        try {
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
          setBusy(false);
        }
      }, { capture: true });

      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData?.session?.user?.id) {
        showGate();
        return;
      }

      try {
        const staff = await verifyStaff(client, sessionData.session.user);
        applyStaffIdentity(staff);
        showApp();
        loadStaffApp();
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
          await client.auth.signOut().catch(() => undefined);
        }
        showGate();
        setMessage(error?.message || 'پەیوەندیی ستاف پشتڕاست نەکرایەوە؛ تکایە دووبارە بچۆ ژوورەوە.');
      }

      client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user?.id) {
          window.gcStaffIdentity = null;
          showGate();
          return;
        }

        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          try {
            const staff = await verifyStaff(client, session.user);
            applyStaffIdentity(staff);
            showApp();
            loadStaffApp();
          } catch (error) {
            // Do not sign the user out on a transient server/network failure.
            if (error?.status === 401 || error?.status === 403) {
              await client.auth.signOut().catch(() => undefined);
              window.gcStaffIdentity = null;
              showGate();
              setMessage(error?.message || 'پەیوەندیی ستاف پشتڕاست نەکرایەوە؛ تکایە دووبارە بچۆ ژوورەوە.');
            } else {
              console.warn('[Globall Cloud] Temporary staff verification failure:', error);
            }
          }
        }
      });
    } catch (error) {
      console.error('[Globall Cloud] Staff auth bridge:', error);
      showGate();
      setMessage('پەیوەندیی Supabase ئامادە نەبوو. تکایە دووبارە هەوڵبدەرەوە.');
      setBusy(false);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
