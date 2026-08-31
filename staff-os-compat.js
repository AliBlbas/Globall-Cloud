(() => {
  'use strict';

  const originalFetch = window.fetch.bind(window);
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const STAFF_VERIFY = `${SUPABASE_URL}/functions/v1/staff-auth-verify`;
  const STAFF_OS_PATH = /^\/staff-os(?:\.html)?\/?$/;

  const showGate = (message = '') => {
    const gate = document.getElementById('loginGate');
    const app = document.getElementById('app');
    gate?.classList.remove('hidden');
    app?.classList.add('hidden');
    const error = document.getElementById('loginError');
    if (error) error.textContent = message;
  };

  const setLoginBusy = (busy) => {
    const form = document.getElementById('loginForm');
    const button = form?.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
    button.textContent = busy ? 'چاوەڕوان بە…' : 'چوونەژوورەوە بۆ Staff OS →';
  };

  async function verifyCurrentStaff(client, session) {
    if (!session?.access_token || !session?.user?.id) return null;
    const response = await originalFetch(STAFF_VERIFY, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_KEY,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.authorized !== true || !payload?.staff?.id) return null;
    return payload.staff;
  }

  const installAuthLifecycleGuard = (client) => {
    if (!client?.auth || client.auth.__gcStaffLifecycleGuard) return;
    const originalOnAuthStateChange = client.auth.onAuthStateChange.bind(client.auth);
    client.auth.onAuthStateChange = (callback) => {
      const callbackText = String(callback || '');
      return originalOnAuthStateChange((event, session) => {
        if (!session && callbackText.includes('location.reload')) {
          const staffOs = window.GCStaffOS;
          if (staffOs?.state) {
            staffOs.state.session = null;
            staffOs.state.user = null;
            staffOs.state.staff = null;
          }
          showGate(event === 'SIGNED_OUT' ? 'لە سیستەمەکە چوویتەدەرەوە؛ تکایە دووبارە login بکە.' : 'پەیوەندیی session نوێ دەکرێتەوە؛ تکایە دووبارە login بکە.');
          return;
        }
        return callback(event, session);
      });
    };
    client.auth.__gcStaffLifecycleGuard = true;
  };

  const ensureSharedClient = () => {
    if (!window.supabase?.createClient) return window.gcSupabase || null;
    if (!window.gcSupabase?.auth) {
      window.gcSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
        global: { headers: { 'x-gc-client': 'staff-os' } },
      });
    }
    window.sb = window.gcSupabase;
    installAuthLifecycleGuard(window.gcSupabase);
    return window.gcSupabase;
  };

  const getAalState = async (client) => {
    try {
      const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) return null;
      return data || null;
    } catch {
      return null;
    }
  };

  const mfaView = () => {
    let panel = document.getElementById('gcStaffMfa');
    if (panel) return panel;
    const form = document.getElementById('loginForm');
    if (!form) return null;
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
    return panel;
  };

  async function finishStaffLogin(client, session) {
    const staff = await verifyCurrentStaff(client, session);
    if (!staff) {
      await client.auth.signOut().catch(() => undefined);
      throw new Error('ئەم هەژمارەیە ڕێگەی Staff OS نییە.');
    }
    const aal = await getAalState(client);
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
      const factors = await client.auth.mfa.listFactors();
      const factor = (factors?.data?.totp || []).find((item) => item.status === 'verified') || (factors?.data?.totp || [])[0];
      if (!factor) throw new Error('2FA بۆ ئەم هەژمارە چالاکە، بەڵام فاکتەری پشتڕاستکراو نەدۆزرایەوە.');
      const panel = mfaView();
      const button = document.getElementById('gcStaffMfaBtn');
      const codeInput = document.getElementById('gcStaffMfaCode');
      const error = document.getElementById('gcStaffMfaError');
      if (!panel || !button || !codeInput || !error) throw new Error('پەڕەی 2FA ئامادە نەکرا.');
      button.disabled = false;
      button.onclick = async () => {
        const code = String(codeInput.value || '').trim();
        error.textContent = '';
        if (!/^\d{6}$/.test(code)) {
          error.textContent = 'کۆدی ٦ ژمارەیی بنووسە.';
          return;
        }
        button.disabled = true;
        try {
          const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: factor.id });
          if (challengeError) throw challengeError;
          const { error: verifyError } = await client.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code });
          if (verifyError) throw verifyError;
          const { data: refreshed } = await client.auth.getSession();
          const verifiedStaff = await verifyCurrentStaff(client, refreshed?.session);
          if (!verifiedStaff) throw new Error('دوای 2FA هەژماری ستاف پشتڕاست نەکرایەوە.');
          sessionStorage.setItem('gc-staff-auth-ready', '1');
          window.location.replace('/staff-os?gc_auth=1');
        } catch (errorValue) {
          error.textContent = /factor|code|otp|challenge/i.test(String(errorValue?.message || ''))
            ? 'کۆدی 2FA هەڵەیە یان بەسەرچووە.'
            : String(errorValue?.message || 'پشتڕاستکردنەوەی 2FA سەرکەوتوو نەبوو.');
          button.disabled = false;
        }
      };
      codeInput.focus();
      return { mfaPending: true, staff };
    }
    return { mfaPending: false, staff };
  }

  const bindStaffLogin = (client) => {
    if (!STAFF_OS_PATH.test(window.location.pathname)) return;
    const form = document.getElementById('loginForm');
    if (!form || form.dataset.gcStaffLoginBound === '1') return;
    form.dataset.gcStaffLoginBound = '1';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setLoginBusy(true);
      const error = document.getElementById('loginError');
      if (error) error.textContent = '';
      try {
        const email = String(document.getElementById('email')?.value || '').trim().toLowerCase();
        const password = String(document.getElementById('password')?.value || '');
        if (!email || !password) throw new Error('ئیمەیڵ و وشەی نهێنی پڕبکەرەوە.');
        const { data, error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        const session = data?.session || (await client.auth.getSession()).data?.session;
        const result = await finishStaffLogin(client, session);
        if (result.mfaPending) return;
        sessionStorage.setItem('gc-staff-auth-ready', '1');
        window.location.replace('/staff-os?gc_auth=1');
      } catch (errorValue) {
        console.error('[Globall Cloud] Staff OS login:', errorValue);
        const raw = String(errorValue?.message || '');
        const message = /invalid login credentials/i.test(raw)
          ? 'ئیمەیڵ یان وشەی نهێنی هەڵەیە.'
          : raw || 'نەتوانرا login بکرێت.';
        showGate(message);
      } finally {
        const mfa = document.getElementById('gcStaffMfa');
        if (!mfa || !mfa.querySelector('#gcStaffMfaBtn')?.disabled) setLoginBusy(false);
      }
    }, { capture: true });
  };

  const originalFetchState = { installed: false };

  const installLegacyStaffApiBridge = (client) => {
    if (originalFetchState.installed) return;
    originalFetchState.installed = true;

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

        const staff = await verifyCurrentStaff(client, session);
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

  const boot = () => {
    const client = ensureSharedClient();
    if (!client) return;
    installLegacyStaffApiBridge(client);
    bindStaffLogin(client);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
