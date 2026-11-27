(() => {
  'use strict';
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const STORAGE_KEY = 'gc-staff-os-auth-v5-ahslifnthiwfkmaswjno';
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const message = document.getElementById('loginMsg');
  const button = document.getElementById('loginBtn');
  let client = null;
  let busy = false;

  const show = (value) => { if (message) message.textContent = String(value || ''); };
  const setBusy = (value, label) => {
    busy = Boolean(value);
    if (button) { button.disabled = busy; button.textContent = label || (busy ? 'پەیوەندی بە سیستەمەوە…' : 'چوونەژوورەوە'); }
  };
  const waitForSdk = async () => {
    const start = Date.now();
    while (!window.supabase?.createClient && Date.now() - start < 10000) {
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    if (!window.supabase?.createClient) throw new Error('پەیوەندی Supabase ئامادە نییە. تکایە پەڕەکە نوێ بکەرەوە.');
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, storageKey:STORAGE_KEY }
    });
  };
  const verifyStaff = async (session) => {
    if (!session?.access_token || !session?.user?.id) throw new Error('Session ـی هەژمار بەردەست نییە.');
    const response = await fetch(SUPABASE_URL + '/functions/v1/account-admin/?kind=staff', {
      method:'GET',
      headers:{ apikey:SUPABASE_KEY, Authorization:'Bearer ' + session.access_token, Accept:'application/json' },
      cache:'no-store'
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || payload.message || 'پشکنینی دەستگەیشتنی Staff سەرکەوتوو نەبوو.');
    const staff = (Array.isArray(payload.items) ? payload.items : []).find(row =>
      String(row.id) === String(session.user.id) && row.is_active === true
    );
    if (!staff) throw new Error('ئەم هەژمارە مافی چوونەژوورەوەی Staff OS ـی نییە یان چالاک نییە.');
    return staff;
  };
  const openConsole = () => {
    location.replace('/staff-os-v5?staff_login=success');
  };
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const email = String(emailInput?.value || '').trim().toLowerCase();
    const password = String(passwordInput?.value || '');
    if (!email) { show('تکایە ئیمەیلی هەژماری Staff بنووسە.'); emailInput?.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { show('فۆرماتی ئیمەیل دروست نییە.'); emailInput?.focus(); return; }
    if (!password) { show('تکایە وشەی نهێنی بنووسە.'); passwordInput?.focus(); return; }
    setBusy(true);
    show('چوونەژوورەوە پشکنین دەکرێت…');
    try {
      if (!client) await waitForSdk();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const session = data?.session || (await client.auth.getSession()).data?.session;
      await verifyStaff(session);
      openConsole();
    } catch (error) {
      const raw = String(error?.message || '');
      if (/invalid login credentials/i.test(raw)) show('ئیمەیل یان وشەی نهێنی هەڵەیە.');
      else if (/email not confirmed/i.test(raw)) show('ئیمەیلی هەژمارەکەت پشتڕاست نەکراوەتەوە.');
      else if (/too many requests|rate limit/i.test(raw)) show('هەوڵی زۆر دراوە؛ کەمێک چاوەڕێ بکە.');
      else if (/failed to fetch|network|load failed/i.test(raw)) show('پەیوەندی ئینتەرنێت یان Supabase کێشەی هەیە.');
      else show(raw || 'چوونەژوورەوە سەرکەوتوو نەبوو.');
      try { if (client) await client.auth.signOut({ scope:'local' }); } catch {}
      setBusy(false);
    }
  });

  // Do not auto-restore an old session on page load. The old V5 entry used to
  // redirect immediately to its legacy login when a stale browser session existed.
  // Keep the isolated login visible until the user explicitly submits credentials.
  waitForSdk()
    .then(() => show('ئامادەی چوونەژوورەوە. ئیمەیل و وشەی نهێنی بنووسە.'))
    .catch(error => show(error.message || 'Supabase ئامادە نییە.'));
})();
