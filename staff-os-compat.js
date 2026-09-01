(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const STAFF_VERIFY = `${SUPABASE_URL}/functions/v1/staff-auth-verify`;
  const STAFF_TABLE = `${SUPABASE_URL}/rest/v1/staff`;
  const STAFF_OS_PATH = /^\/staff-os(?:\.html)?\/?$/;
  const nativeFetch = window.fetch.bind(window);

  const getClient = async () => {
    if (typeof window.gcEnsureSupabase === 'function') {
      try {
        const client = await window.gcEnsureSupabase();
        if (client?.auth) return client;
      } catch (_) {}
    }
    if (window.gcSupabase?.auth) return window.gcSupabase;
    if (window.supabase?.createClient) {
      window.gcSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
        global: { headers: { 'x-gc-client': 'staff-os' } },
      });
      window.sb = window.gcSupabase;
      return window.gcSupabase;
    }
    return null;
  };

  const showGate = (message = '') => {
    document.getElementById('loginGate')?.classList.remove('hidden');
    document.getElementById('app')?.classList.add('hidden');
    const error = document.getElementById('loginError');
    if (error) error.textContent = message;
  };

  const showApp = () => {
    document.getElementById('loginGate')?.classList.add('hidden');
    document.getElementById('app')?.classList.remove('hidden');
  };

  const setBusy = (busy) => {
    const form = document.getElementById('loginForm');
    const button = form?.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
    button.textContent = busy ? 'چاوەڕوان بە…' : 'چوونەژوورەوە بۆ Staff OS →';
  };

  const setError = (message = '') => {
    const error = document.getElementById('loginError');
    if (error) error.textContent = message;
  };

  const buildStaffResponse = async (req, client) => {
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(JSON.stringify({ authorized: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ authorized: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    const url = `${STAFF_TABLE}?id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=id,full_name,role,branch,is_active,email&limit=1`;
    const response = await nativeFetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const rows = response.ok ? await response.json().catch(() => []) : [];
    const staff = Array.isArray(rows) ? rows[0] : null;
    if (!staff?.id) {
      return new Response(JSON.stringify({ authorized: false, error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    return new Response(JSON.stringify({ authorized: true, staff }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  };

  const installStaffVerifyBridge = (client) => {
    if (window.__gcStaffVerifyBridgeInstalled) return;
    window.__gcStaffVerifyBridgeInstalled = true;

    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      if (url.startsWith(STAFF_VERIFY)) {
        try {
          return await buildStaffResponse(new Request(url, init), client);
        } catch (_) {
          return new Response(JSON.stringify({ authorized: false, error: 'Staff verification unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
          });
        }
      }
      return nativeFetch(input, init);
    };
  };

  const verifyStaff = async (client, session) => {
    if (!session?.access_token || !session?.user?.id) return null;
    const response = await buildStaffResponse(
      new Request(STAFF_VERIFY, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }),
      client,
    );
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return payload?.authorized === true && payload?.staff?.id ? payload.staff : null;
  };

  const publishAuthReady = (session, user, staff) => {
    window.gcStaffIdentity = {
      id: staff.id,
      email: staff.email || user?.email || '',
      role: staff.role || '',
      branch: staff.branch || 'all',
      fullName: staff.full_name || '',
    };
    sessionStorage.setItem('gc-staff-auth-ready', '1');
    showApp();
    window.dispatchEvent(new CustomEvent('gc:staff-auth-ready', {
      detail: { session, user, staff },
    }));
  };

  const getMfaState = async (client) => {
    try {
      const { data } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      return data || null;
    } catch (_) {
      return null;
    }
  };

  const renderMfa = (client, session, staff) => {
    const form = document.getElementById('loginForm');
    if (!form) return;
    let panel = document.getElementById('gcStaffMfa');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'gcStaffMfa';
      panel.style.cssText = 'margin-top:14px;padding:14px;border:1px solid rgba(79,227,240,.28);border-radius:14px;background:rgba(6,20,40,.55);';
      panel.innerHTML = `
        <div style="font-weight:800;margin-bottom:8px;">2FA پشتڕاست بکەرەوە</div>
        <div style="font-size:12px;opacity:.75;margin-bottom:10px;">کۆدی ٦ ژمارەیی Google Authenticator بنووسە.</div>
        <input id="gcStaffMfaCode" class="field" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" style="text-align:center;letter-spacing:6px;font-size:20px;">
        <button id="gcStaffMfaBtn" class="btn primary" type="button" style="width:100%;margin-top:10px;">پشتڕاستکردنەوەی 2FA</button>
        <div id="gcStaffMfaError" style="margin-top:8px;color:#ffb9c0;font-size:12px;min-height:18px;"></div>`;
      form.appendChild(panel);
    }
    const button = document.getElementById('gcStaffMfaBtn');
    const codeInput = document.getElementById('gcStaffMfaCode');
    const error = document.getElementById('gcStaffMfaError');
    if (!button || !codeInput || !error) return;
    button.disabled = false;
    button.onclick = async () => {
      error.textContent = '';
      const code = String(codeInput.value || '').trim();
      if (!/^\d{6}$/.test(code)) {
        error.textContent = 'کۆدی ٦ ژمارەیی بنووسە.';
        return;
      }
      button.disabled = true;
      try {
        const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: (await client.auth.mfa.listFactors()).data?.totp?.find((f) => f.status === 'verified')?.id || '' });
        if (challengeError || !challenge?.id) throw challengeError || new Error('2FA challenge failed');
        const factorId = (await client.auth.mfa.listFactors()).data?.totp?.find((f) => f.status === 'verified')?.id;
        if (!factorId) throw new Error('2FA factor not found');
        const { error: verifyError } = await client.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
        if (verifyError) throw verifyError;
        const refreshed = await client.auth.getSession();
        const verifiedStaff = await verifyStaff(client, refreshed.data?.session);
        if (!verifiedStaff) throw new Error('Staff verification failed after MFA');
        publishAuthReady(refreshed.data.session, refreshed.data.session?.user, verifiedStaff);
      } catch (e) {
        error.textContent = /factor|code|otp|challenge/i.test(String(e?.message || ''))
          ? 'کۆدی 2FA هەڵەیە یان بەسەرچووە.'
          : 'پشتڕاستکردنەوەی 2FA سەرکەوتوو نەبوو.';
        button.disabled = false;
      }
    };
    codeInput.focus();
  };

  const completeLogin = async (client, session) => {
    const staff = await verifyStaff(client, session);
    if (!staff) {
      await client.auth.signOut().catch(() => undefined);
      throw new Error('ئەم هەژمارەیە ڕێگەی Staff OS نییە.');
    }

    const aal = await getMfaState(client);
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      renderMfa(client, session, staff);
      throw { mfaPending: true };
    }

    publishAuthReady(session, session.user, staff);
    return { mfaPending: false };
  };

  const bindLogin = (client) => {
    if (!STAFF_OS_PATH.test(window.location.pathname)) return;
    const form = document.getElementById('loginForm');
    if (!form || form.dataset.gcStaffLoginBound === '1') return;
    form.dataset.gcStaffLoginBound = '1';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setBusy(true);
      setError('');
      try {
        const email = String(document.getElementById('email')?.value || '').trim().toLowerCase();
        const password = String(document.getElementById('password')?.value || '');
        if (!email || !password) throw new Error('ئیمەڵ و وشەی نهێنی پڕبکەرەوە.');

        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const session = data?.session || (await client.auth.getSession()).data?.session;
        if (!session) throw new Error('Session دروست نەبوو.');

        const result = await completeLogin(client, session);
        if (result?.mfaPending) return;
      } catch (e) {
        if (e?.mfaPending) return;
        console.error('[Globall Cloud] Staff OS login:', e?.message || e);
        const raw = String(e?.message || '');
        setError(/invalid login credentials/i.test(raw)
          ? 'ئیمەیل یان وشەی نهێنی هەڵەیە.'
          : raw || 'نەتوانرا login بکرێت.');
      } finally {
        const mfaButton = document.getElementById('gcStaffMfaBtn');
        if (!mfaButton || !mfaButton.disabled) setBusy(false);
      }
    }, { capture: true });
  };

  const restore = async (client) => {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data?.session) {
      showGate('');
      return;
    }
    const staff = await verifyStaff(client, data.session);
    if (!staff) {
      await client.auth.signOut().catch(() => undefined);
      sessionStorage.removeItem('gc-staff-auth-ready');
      showGate('ئەم هەژمارەیە ڕێگەی Staff OS نییە.');
      return;
    }
    publishAuthReady(data.session, data.session.user, staff);
  };

  const boot = async () => {
    if (!STAFF_OS_PATH.test(window.location.pathname)) return;
    const client = await getClient();
    if (!client) {
      showGate('پەیوەندیی Supabase ئامادە نییە.');
      return;
    }
    installStaffVerifyBridge(client);
    bindLogin(client);
    await restore(client);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void boot(), { once: true });
  } else {
    void boot();
  }
})();
