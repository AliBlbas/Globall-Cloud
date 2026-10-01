(() => {
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const LOGIN_URL = `${SUPABASE_URL}/functions/v1/customer-gc-login`;
  const REGISTER_URL = `${SUPABASE_URL}/functions/v1/customer-register`;
  const $ = (id) => document.getElementById(id);
  const message = (text, type = '') => { const el = $('message'); if (el) { el.textContent = text; el.className = `auth-message ${type}`; } };
  const setBusy = (busy) => { document.querySelectorAll('button[type="submit"]').forEach((button) => { button.disabled = busy; button.textContent = busy ? 'تکایە چاوەڕێ بکە…' : button.dataset.label; }); };
  const post = async (url, body) => {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'هەڵەیەک ڕوویدا.');
    return data;
  };
  const normalizeCode = (value) => String(value || '').trim().toUpperCase();
  const login = async (event) => {
    event.preventDefault(); setBusy(true); message('لە پشکنینی زانیارییەکانتین…');
    try {
      const data = await post(LOGIN_URL, { code: normalizeCode($('code').value), password: $('password').value });
      const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
      await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      location.href = '/customer-portal.html';
    } catch (error) { message(error.message, 'error'); setBusy(false); }
  };
  const register = async (event) => {
    event.preventDefault(); setBusy(true); message('هەژمارەکەت دروست دەکرێت…');
    try {
      const data = await post(REGISTER_URL, { name: $('name').value.trim(), phone: $('phone').value.trim(), password: $('password').value, confirm_password: $('confirmPassword').value });
      message(`هەژمارەکەت دروست بوو. کۆدی تۆ ${data.gc_code} ـە. ئێستا دەچیتە ناو پۆرتاڵ.`, 'success');
      sessionStorage.setItem('gc-new-code', data.gc_code);
      const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
      await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      setTimeout(() => { location.href = '/customer-portal.html'; }, 800);
    } catch (error) { message(error.message, 'error'); setBusy(false); }
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('button[type="submit"]').forEach((button) => { button.dataset.label = button.textContent; });
    $('authForm')?.addEventListener('submit', location.pathname.endsWith('register.html') ? register : login);
    const stored = sessionStorage.getItem('gc-new-code'); if (stored && $('code')) $('code').value = stored;
  });
})();
