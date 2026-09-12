(() => {
  'use strict';

  const SUPABASE_URL = 'https://ahslifnthiwfkmaswjno.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_M4UtzEbCLwMCd9LanFWw5g_5b7-fWda';
  const app = document.getElementById('app');
  if (!app) return;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'
  }[c]));

  const render = (mode = 'loading', message = '') => {
    if (document.querySelector('.gc-shell, .gc-rescue-shell')) return;
    if (mode === 'loading') {
      app.innerHTML = `
        <main class="gc-rescue-shell" dir="rtl">
          <section class="gc-rescue-card">
            <div class="gc-rescue-mark">GC</div>
            <div class="gc-rescue-eyebrow">STAFF OPERATING SYSTEM · V5</div>
            <h1>سیستەمی ستاف بار دەکرێت…</h1>
            <p>تکایە چاوەڕوان بە. پەیوەندییەکانی سیستەم و پاراستن خەریکی پشکنینن.</p>
            <div class="gc-rescue-loader"><span></span><span></span><span></span></div>
          </section>
        </main>`;
      return;
    }

    app.innerHTML = `
      <main class="gc-rescue-shell" dir="rtl">
        <section class="gc-rescue-card gc-rescue-error">
          <div class="gc-rescue-mark">GC</div>
          <div class="gc-rescue-eyebrow">STAFF RECOVERY</div>
          <h1>Staff OS بە دروستی نەکراوە</h1>
          <p>${escapeHtml(message || 'کێشەیەکی نەخوازراو ڕوویدا.')}</p>
          <div class="gc-rescue-actions">
            <button type="button" id="gcRescueRetry">دووبارە هەوڵدانەوە</button>
            <button type="button" id="gcRescueReload" class="secondary">نوێکردنەوەی پەڕە</button>
          </div>
          <div class="gc-rescue-hint">ئەگەر login ـت هەیە، دووبارە نوێکردنەوە هەمان session ـەکەت بەکاردێنێت.</div>
        </section>
      </main>`;

    document.getElementById('gcRescueReload')?.addEventListener('click', () => location.reload());
    document.getElementById('gcRescueRetry')?.addEventListener('click', () => {
      location.assign('/staff-os-v5.html?recovery=1');
    });
  };

  const addStyles = () => {
    if (document.getElementById('gc-rescue-style')) return;
    const style = document.createElement('style');
    style.id = 'gc-rescue-style';
    style.textContent = `
      .gc-rescue-shell{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 15% 0%,rgba(0,194,217,.15),transparent 45%),#03101f;color:#f5f9fd;font-family:Vazirmatn,Noto Sans Arabic,system-ui,sans-serif}
      .gc-rescue-card{width:min(560px,100%);padding:34px;border:1px solid rgba(111,145,180,.35);border-radius:24px;background:rgba(8,24,44,.94);box-shadow:0 24px 80px rgba(0,0,0,.4);text-align:center}
      .gc-rescue-mark{width:64px;height:64px;margin:0 auto 16px;display:grid;place-items:center;border-radius:18px;background:linear-gradient(135deg,#4fe3f0,#00a8bd);color:#03101f;font-weight:900;letter-spacing:.5px;font-size:20px}
      .gc-rescue-eyebrow{font:700 11px/1.4 JetBrains Mono,monospace;letter-spacing:1.5px;color:#4fe3f0;margin-bottom:10px}
      .gc-rescue-card h1{margin:0 0 10px;font-size:clamp(23px,4vw,32px)}
      .gc-rescue-card p{margin:0;color:#9bb2d0;line-height:1.8}
      .gc-rescue-loader{display:flex;justify-content:center;gap:7px;margin-top:22px}
      .gc-rescue-loader span{width:9px;height:9px;border-radius:50%;background:#4fe3f0;animation:gc-rescue-pulse 1s infinite ease-in-out}
      .gc-rescue-loader span:nth-child(2){animation-delay:.12s}.gc-rescue-loader span:nth-child(3){animation-delay:.24s}
      @keyframes gc-rescue-pulse{0%,80%,100%{transform:scale(.7);opacity:.45}40%{transform:scale(1);opacity:1}}
      .gc-rescue-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:22px}
      .gc-rescue-actions button{border:0;border-radius:12px;padding:12px 18px;font:800 14px Vazirmatn,sans-serif;cursor:pointer;background:#4fe3f0;color:#03101f}
      .gc-rescue-actions button.secondary{background:#102b48;color:#f5f9fd;border:1px solid #2a4d78}
      .gc-rescue-hint{margin-top:14px;color:#6d88a8;font-size:12px}
    `;
    document.head.appendChild(style);
  };

  const registerFreshServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register('/sw-v98.js?v=20260912-4', { scope: '/' });
      await registration.update();
    } catch (_) {}
  };

  registerFreshServiceWorker();
  addStyles();
  render('loading');

  const startedAt = Date.now();
  const mainReady = () => Boolean(document.querySelector('.gc-shell') || document.querySelector('.login'));

  const showFailure = (reason) => {
    if (mainReady()) return;
    render('error', reason);
  };

  window.addEventListener('error', (event) => {
    if (String(event?.filename || '').includes('staff-os-v5.js')) {
      showFailure(event.message || 'هەڵەی JavaScript لە Staff OS.');
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason?.message || event?.reason;
    if (reason) showFailure(reason);
  });

  const timer = setInterval(() => {
    if (mainReady()) {
      clearInterval(timer);
      return;
    }
    if (Date.now() - startedAt >= 7000) {
      clearInterval(timer);
      showFailure('Staff OS لە کاتی داناندا وەستاوە. ئەمە زۆرجار بەهۆی cache، deployment یان script loading ـەوەیە.');
    }
  }, 250);

  window.__gcStaffRescue = {
    renderFailure: showFailure,
    reload: () => location.reload(),
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
  };
})();
