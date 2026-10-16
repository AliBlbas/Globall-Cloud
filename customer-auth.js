(() => {
  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const LOGIN_URL = `${SUPABASE_URL}/functions/v1/customer-gc-login`;
  const REGISTER_URL = `${SUPABASE_URL}/functions/v1/customer-gc-register`;
  const $ = (id) => document.getElementById(id);
  const message = (text, type = '') => {
    const el = $('message');
    if (el) {
      el.textContent = text;
      el.className = `auth-message ${type}`;
    }
  };
  const setBusy = (busy) => {
    document.querySelectorAll('button[type="submit"]').forEach((button) => {
      button.disabled = busy;
      button.textContent = busy ? 'تکایە چاوەڕێ بکە…' : button.dataset.label;
    });
  };
  const post = async (url, body) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'هەڵەیەک ڕوویدا.');
    return data;
  };
  const normalizeCode = (value) => String(value || '').normalize('NFKC').trim().toUpperCase().replace(/[–—−]/g, '-').replace(/\s+/g, '');

  const login = async (event) => {
    event.preventDefault();
    setBusy(true);
    message('لە پشکنینی زانیارییەکانتین…');
    try {
      const data = await post(LOGIN_URL, {
        code: normalizeCode($('code').value),
        password: $('password').value
      });
      const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      const { data: signedIn, error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
      if (sessionError) throw new Error('کۆدی GC و وشەی نهێنی پشتڕاست بوونەوە، بەڵام session دروست نەبوو؛ جارێکی تر هەوڵ بدەوە.');
      if (!signedIn?.session?.access_token) throw new Error('هەژمارەکەت بەڕاستی نەچووە ژوورەوە؛ تکایە جارێکی تر هەوڵ بدەوە.');
      sessionStorage.removeItem('gc-new-code');
      sessionStorage.removeItem('gc-registration-email');
      location.href = '/customer-portal.html';
    } catch (error) {
      const raw = String(error?.message || error || '');
      const friendly = /invalid gc code or password|invalid login credentials/i.test(raw)
        ? 'کۆدی GC یان وشەی نهێنی هەڵەیە؛ دڵنیابە هەردووکیان بە دروستی نووسراون.'
        : /too many login attempts|rate limit/i.test(raw)
          ? 'زۆر هەوڵی چوونەژوورەوەت داوە؛ تکایە ١٠ خولەک چاوەڕێ بکە پاشان هەوڵ بدەوە.'
          : /customer account is not ready|account is not ready/i.test(raw)
            ? 'هەژماری GC ـەکەت هێشتا تەواو ئامادە نییە؛ تکایە پەیوەندی بە ستافی Globall Cloud بکە.'
            : /failed to fetch|networkerror|load failed/i.test(raw)
              ? 'پەیوەندی ئینتەرنێت یان سێرڤەر کێشەی هەیە؛ ئینتەرنێتەکەت بپشکنە و دووبارە هەوڵ بدەوە.'
              : raw || 'چوونەژوورەوە سەرکەوتوو نەبوو.';
      message(friendly, 'error');
      setBusy(false);
    }
  };

  const register = async (event) => {
    event.preventDefault();
    setBusy(true);
    message('هەژمارەکەت دروست دەکرێت…');
    const password = $('password').value;
    const confirmation = $('confirmPassword').value;
    const email = $('email').value.trim().toLowerCase();
    if (password !== confirmation) {
      message('وشەکانی نهێنی یەکسان نین.', 'error');
      setBusy(false);
      return;
    }
    try {
      const data = await post(REGISTER_URL, {
        name: $('name').value.trim(),
        email,
        phone: $('phone').value.trim(),
        password
      });
      const gcCode = data.customer?.gc_code || data.gc_code;
      if (!gcCode) throw new Error('کۆدی GC ـی هەژمارەکە وەرنەگیرا.');
      sessionStorage.setItem('gc-new-code', gcCode);
      sessionStorage.setItem('gc-registration-email', email);
      message(
        `هەژمارەکەت بە سەرکەوتوویی دروست بوو. کۆدی GC ـی تۆ ${gcCode} ـە. ئێستا دەچیتە login.`,
        'success'
      );
      setTimeout(() => { location.href = '/login.html'; }, 900);
    } catch (error) {
      message(error.message, 'error');
      setBusy(false);
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('button[type="submit"]').forEach((button) => {
      button.dataset.label = button.textContent;
    });
    $('authForm')?.addEventListener(
      'submit',
      location.pathname.endsWith('register.html') ? register : login
    );
    const stored = sessionStorage.getItem('gc-new-code');
    if (stored && $('code')) $('code').value = stored;
  });
})();