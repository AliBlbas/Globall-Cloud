(() => {
  'use strict';
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const PROFILE_URL = `${SUPABASE_URL}/functions/v1/account-self-profile`;
  const PASSWORD_URL = `${SUPABASE_URL}/functions/v1/account-self-password`;
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

  const $ = (id) => document.getElementById(id);
  const setStatus = (id, text, good = false) => { const el = $(id); el.textContent = text || ''; el.className = `status${good ? ' good' : ''}${text && !good ? ' bad' : ''}`; };
  const authHeaders = async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.access_token) throw new Error('Session نەدۆزرایەوە.');
    return { Authorization: `Bearer ${session.access_token}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  };

  async function loadProfile() {
    const headers = await authHeaders();
    const response = await fetch(PROFILE_URL, { method: 'GET', headers: { Authorization: headers.Authorization, Accept: 'application/json' }, credentials: 'omit', cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || 'Profile could not be loaded.');
    const profile = body.profile || {};
    $('profileName').textContent = profile.full_name || '—';
    $('profileEmail').textContent = profile.email || '—';
    $('profileGc').textContent = profile.gc_code || profile.code || '—';
    $('roleBadge').textContent = profile.role === 'staff' || profile.kind === 'staff' ? `Staff · ${profile.role || 'staff'}` : 'Customer';
    $('authPanel').classList.add('hidden');
    $('accountPanel').classList.remove('hidden');
  }

  $('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('loginStatus', 'لە چوونەژوورەوە...');
    try {
      const email = $('email').value.trim();
      const password = $('password').value;
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setStatus('loginStatus', 'سەرکەوتوو بوو.', true);
      await loadProfile();
    } catch (error) {
      setStatus('loginStatus', error?.message || 'Login سەرکەوتوو نەبوو.');
    }
  });

  $('passwordForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('passwordStatus', '');
    const password = $('newPassword').value;
    const confirm = $('confirmPassword').value;
    if (password.length < 12) return setStatus('passwordStatus', 'پاسۆرد دەبێت لانیکەم 12 کاراکتر بێت.');
    if (password !== confirm) return setStatus('passwordStatus', 'دوو پاسۆردەکە یەکسان نین.');
    try {
      setStatus('passwordStatus', 'پاسۆرد دەگۆڕدرێت...');
      const headers = await authHeaders();
      const response = await fetch(PASSWORD_URL, { method: 'POST', headers, credentials: 'omit', cache: 'no-store', body: JSON.stringify({ password }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Password change failed.');
      $('passwordForm').reset();
      setStatus('passwordStatus', 'پاسۆرد بە سەرکەوتوویی نوێکرایەوە.', true);
    } catch (error) {
      setStatus('passwordStatus', error?.message || 'گۆڕینی پاسۆرد سەرکەوتوو نەبوو.');
    }
  });

  $('backBtn').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else window.location.href = '/';
  });

  sb.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      $('authPanel').classList.remove('hidden');
      $('accountPanel').classList.add('hidden');
    }
  });

  (async () => {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session) await loadProfile();
    } catch (error) {
      console.error('[Globall Cloud] Account security:', error);
    }
  })();
})();
