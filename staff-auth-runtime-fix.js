(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const VERIFY_URL = `${SUPABASE_URL}/functions/v1/staff-auth-verify`;
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 30 * 1000;
  const runtime = { client: null, mfaFactorId: null, bound: false };

  const el = (id) => document.getElementById(id);
  const setError = (message) => {
    const node = el('staffLoginError');
    if (node) { node.textContent = message; node.style.display = message ? 'block' : 'none'; }
  };
  const setMfaError = (message) => {
    const node = el('mfaChallengeError');
    if (node) { node.textContent = message; node.style.display = message ? 'block' : 'none'; }
  };
  const getClient = () => {
    if (runtime.client?.auth) return runtime.client;
    if (window.gcSupabase?.auth) runtime.client = window.gcSupabase;
    else if (window.sb?.auth) runtime.client = window.sb;
    else if (window.supabase?.createClient) {
      runtime.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
      });
      window.gcSupabase = runtime.client;
    }
    return runtime.client;
  };
  const getLockout = () => {
    try { return Number(localStorage.getItem('staffLockoutUntil') || 0); } catch { return 0; }
  };
  const getAttempts = () => {
    try { return Number(localStorage.getItem('staffFailedAttempts') || 0); } catch { return 0; }
  };
  const setAttempts = (n) => { try { localStorage.setItem('staffFailedAttempts', String(n)); } catch {} };
  const setLockout = (ms) => { try { localStorage.setItem('staffLockoutUntil', String(Date.now() + ms)); } catch {} };
  const showLockout = () => {
    const remaining = Math.ceil((getLockout() - Date.now()) / 1000);
    const node = el('staffLoginLockout');
    if (remaining <= 0) { if (node) node.style.display = 'none'; return false; }
    if (node) { node.textContent = `زۆر هەوڵی نادروست درا. تکایە ${remaining} چرکە چاوەڕێبە.`; node.style.display = 'block'; }
    return true;
  };
  const verifyStaff = async (session) => {
    if (!session?.access_token || !session?.user?.id) return null;
    const response = await fetch(VERIFY_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, Accept: 'application/json' },
      cache: 'no-store'
    });
    const body = await response.json().catch(() => null);
    return response.ok && body?.authorized === true && body?.staff?.id ? body.staff : null;
  };
  const revealStaffConsole = async (client) => {
    const renderer = window.renderAdminGate;
    if (typeof renderer === 'function') {
      await renderer();
    }
    const page = el('page-admin');
    page?.classList.add('active');
    const loginView = el('adminLoginView');
    const dashView = el('adminDashboardView') || el('adminDashView');
    if (loginView && dashView) {
      loginView.style.display = 'none';
      dashView.style.display = 'block';
    }
    document.getElementById('staffEmail')?.blur();
    document.getElementById('staffPassword')?.blur();
    window.scrollTo({ top: Math.max(0, (page?.getBoundingClientRect().top || 0) + window.scrollY - 20), behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent('gc:staff-login-complete', { detail: { client } }));
  };
  const showMfa = async (client) => {
    const view = el('adminMfaView');
    const loginView = el('adminLoginView');
    if (!view) throw new Error('بەشی 2FA نەدۆزرایەوە.');
    const { data, error } = await client.auth.mfa.listFactors();
    if (error) throw error;
    const factor = (data?.totp || []).find((item) => item.status === 'verified') || (data?.totp || [])[0];
    if (!factor) throw new Error('فاکتەری 2FA ـی پشتڕاستکراو نەدۆزرایەوە.');
    runtime.mfaFactorId = factor.id;
    if (loginView) loginView.style.display = 'none';
    view.style.display = 'grid';
    setMfaError('');
    el('mfaChallengeCode')?.focus();
  };
  const finishLogin = async (client, session) => {
    const staff = await verifyStaff(session);
    if (!staff || staff.is_active === false || !['admin', 'super_admin', 'accountant'].includes(String(staff.role))) {
      await client.auth.signOut().catch(() => undefined);
      throw new Error('ئەم هەژمارە ڕێگەی چوونەژوورەوەی Staff ـی نییە.');
    }
    const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel().catch(() => ({ data: null }));
    if (aal?.nextLevel === 'aal2' && aal.currentLevel !== aal.nextLevel) {
      await showMfa(client);
      return false;
    }
    await revealStaffConsole(client);
    return true;
  };
  const handleLogin = async (event) => {
    const form = event.target?.closest?.('form');
    if (!form || !form.querySelector('#staffEmail') || !form.querySelector('#staffPassword')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (showLockout()) return;
    const client = getClient();
    if (!client) { setError('Supabase ئامادە نییە.'); return; }
    const email = String(el('staffEmail')?.value || '').trim().toLowerCase();
    const password = String(el('staffPassword')?.value || '');
    if (!email || !password) { setError('ئیمەیل و وشەی نهێنی پڕبکەرەوە.'); return; }
    const btn = el('staffLoginBtn');
    const btnText = el('staffLoginBtnText');
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'چاوەڕوان بە…';
    setError('');
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAttempts(0);
      try { localStorage.removeItem('staffLockoutUntil'); } catch {}
      const session = data?.session || (await client.auth.getSession()).data?.session;
      await finishLogin(client, session);
    } catch (errorValue) {
      const attempts = getAttempts() + 1;
      setAttempts(attempts >= MAX_ATTEMPTS ? 0 : attempts);
      if (attempts >= MAX_ATTEMPTS) setLockout(LOCKOUT_MS);
      const raw = String(errorValue?.message || '');
      setError(/invalid login credentials/i.test(raw) ? 'ئیمەیل یان وشەی نهێنی هەڵەیە.' : raw || 'نەتوانرا login بکرێت.');
      if (attempts >= MAX_ATTEMPTS) showLockout();
    } finally {
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'چوونەژوورەوە';
    }
  };
  const handleMfa = async (event) => {
    if (event.target?.id !== 'mfaChallengeBtn') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const client = getClient();
    const code = String(el('mfaChallengeCode')?.value || '').trim();
    if (!client || !runtime.mfaFactorId) { setMfaError('فاکتەری 2FA ئامادە نییە.'); return; }
    if (!/^\d{6}$/.test(code)) { setMfaError('کۆدی ٦ ژمارەیی بنووسە.'); return; }
    const button = el('mfaChallengeBtn');
    if (button) button.disabled = true;
    setMfaError('');
    try {
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: runtime.mfaFactorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await client.auth.mfa.verify({ factorId: runtime.mfaFactorId, challengeId: challenge.id, code });
      if (verifyError) throw verifyError;
      const session = (await client.auth.getSession()).data?.session;
      const staff = await verifyStaff(session);
      if (!staff || staff.is_active === false || !['admin', 'super_admin', 'accountant'].includes(String(staff.role))) {
        throw new Error('دوای 2FA هەژماری Staff پشتڕاست نەکرایەوە.');
      }
      await revealStaffConsole(client);
    } catch (errorValue) {
      setMfaError(/code|otp|challenge|factor/i.test(String(errorValue?.message || '')) ? 'کۆدی 2FA هەڵەیە یان بەسەرچووە.' : String(errorValue?.message || '2FA سەرکەوتوو نەبوو.'));
    } finally {
      if (button) button.disabled = false;
    }
  };
  const bind = () => {
    if (runtime.bound) return;
    runtime.bound = true;
    document.addEventListener('submit', handleLogin, true);
    document.addEventListener('click', handleMfa, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
