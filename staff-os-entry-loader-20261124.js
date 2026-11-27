/* Globall Cloud — deterministic Staff OS V5 entry loader.
 * Loads Supabase first, then the protected V5 controller. Independent of optional
 * deferred enhancements so a slow addon cannot strand the entry page on loading.
 */
(() => {
  'use strict';
  if (window.__gcStaffEntryLoaderV1) return;
  window.__gcStaffEntryLoaderV1 = true;
  const root = document.getElementById('app');
  if (!root) return;

  // Pin browser loading to the SDK's explicit UMD bundle. Keep a second CDN and
  // the documented package-root URL as fallbacks for restrictive mobile browsers.
  const SDK_SOURCES = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
  ];
  const CONTROLLER = '/staff-os-v5-20261017.js?v=20261127-login-keyboard-4';
  const hasSdk = () => Boolean(window.supabase && typeof window.supabase.createClient === 'function');
  const hasSurface = () => Boolean(root.querySelector('.gc-shell, .login, .login-card'));

  const style = document.createElement('style');
  style.textContent = [
    '#app .gc-entry-state{min-height:100dvh;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 50% 0%,rgba(0,184,212,.13),transparent 42%),#03101f;color:#f5f9fd;font-family:Vazirmatn,Noto Sans Arabic,system-ui,sans-serif}',
    '#app .gc-entry-card{width:min(620px,100%);padding:clamp(22px,5vw,38px);border:1px solid rgba(111,145,180,.35);border-radius:24px;background:rgba(8,24,44,.96);box-shadow:0 24px 80px rgba(0,0,0,.38);text-align:center}',
    '#app .gc-entry-mark{width:64px;height:64px;margin:0 auto 16px;display:grid;place-items:center;border-radius:18px;background:linear-gradient(135deg,#4fe3f0,#00a8bd);color:#03101f;font-weight:900;font-size:20px}',
    '#app .gc-entry-eyebrow{font:800 11px/1.5 JetBrains Mono,monospace;letter-spacing:1.2px;color:#4fe3f0;margin-bottom:12px}',
    '#app .gc-entry-card h1{font-size:clamp(22px,5vw,30px);line-height:1.65;margin:0 0 10px}',
    '#app .gc-entry-card p{color:#a8bdd5;line-height:1.9;margin:0}',
    '#app .gc-entry-loader{display:flex;justify-content:center;gap:8px;margin-top:22px}',
    '#app .gc-entry-loader i{width:9px;height:9px;border-radius:50%;background:#4fe3f0;animation:gc-entry-pulse 1s infinite ease-in-out}',
    '#app .gc-entry-loader i:nth-child(2){animation-delay:.12s}#app .gc-entry-loader i:nth-child(3){animation-delay:.24s}',
    '#app .gc-entry-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:22px}',
    '#app .gc-entry-actions a,#app .gc-entry-actions button{min-height:46px;padding:11px 18px;border-radius:12px;border:1px solid #294d71;background:#102b48;color:#f5f9fd;text-decoration:none;font:800 13px Vazirmatn,system-ui,sans-serif;cursor:pointer}',
    '#app .gc-entry-actions button{background:linear-gradient(135deg,#4fe3f0,#00a8bd);border-color:transparent;color:#03101f}',
    '#app .gc-entry-detail{display:block;margin-top:16px!important;font-size:12px;color:#a8bdd5!important;overflow-wrap:anywhere}',
    '@keyframes gc-entry-pulse{0%,80%,100%{transform:scale(.7);opacity:.45}40%{transform:scale(1);opacity:1}}'
  ].join('');
  document.head.appendChild(style);

  const render = (mode, message) => {
    if (hasSurface()) return;
    if (mode === 'loading') {
      root.innerHTML = '<main class="gc-entry-state" dir="rtl"><section class="gc-entry-card"><div class="gc-entry-mark">GC</div><div class="gc-entry-eyebrow">STAFF OPERATING SYSTEM · V5</div><h1>کۆنسۆڵی ستاف بە شێوەیەکی پارێزراو دەکرێتەوە</h1><p>سەرەتا پەیوەندیی پاراستن و پاشان کۆنسۆڵ بار دەکرێت.</p><p class="gc-entry-step" aria-live="polite">پەیوەندی بە خزمەتگوزاری پاراستن...</p><div class="gc-entry-loader"><i></i><i></i><i></i></div></section></main>';
      if (message) { const step = root.querySelector('.gc-entry-step'); if (step) step.textContent = String(message).slice(0, 160); }
      return;
    }
    root.innerHTML = '<main class="gc-entry-state" dir="rtl"><section class="gc-entry-card"><div class="gc-entry-mark">GC</div><div class="gc-entry-eyebrow">STAFF OS · RECOVERY</div><h1>کۆنسۆڵی ستاف نەیتوانی باربکرێت</h1><p>پەیوەندیی چوونەژوورەوە یان فایلێکی سەرەکی وەڵامی نەدا. دەتوانیت دووبارە هەوڵ بدەیتەوە.</p><p class="gc-entry-detail" role="alert"></p><div class="gc-entry-actions"><button type="button" id="gcStaffEntryRetry">دووبارە هەوڵدانەوە</button><a href="/management.html">کردنەوەی Staff Gateway</a></div></section></main>';
    const detail = root.querySelector('.gc-entry-detail');
    if (detail) detail.textContent = String(message || 'هەڵەیەک لە بارکردنی سیستەمی ستاف ڕوویدا.').slice(0, 260);
    root.querySelector('#gcStaffEntryRetry')?.addEventListener('click', () => {
      const next = new URL(location.href);
      next.searchParams.set('staff_retry', String(Date.now()));
      location.replace(next.toString());
    }, { once: true });
  };

  const loadScript = (src, timeoutMs, checkReady) => new Promise((resolve, reject) => {
    if (checkReady && checkReady()) return resolve(true);
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.gcStaffEntryDependency = '1';
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        reject(error);
      } else {
        resolve(true);
      }
    };
    const timer = setTimeout(() => finish(new Error('کاتی بارکردنی فایل تەواو بوو: ' + src)), timeoutMs);
    script.onload = () => finish(checkReady && !checkReady()
      ? new Error('فایل بارکرا بەڵام خزمەتگوزاری چالاک نەبوو: ' + src)
      : null);
    script.onerror = () => finish(new Error('نەتوانرا فایل باربکرێت: ' + src));
    document.head.appendChild(script);
  });

  const waitForSurface = (timeoutMs) => new Promise((resolve) => {
    if (hasSurface()) return resolve(true);
    let done = false;
    const observer = new MutationObserver(() => {
      if (hasSurface()) finish(true);
    });
    const timer = setTimeout(() => finish(false), timeoutMs);
    function finish(value) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      observer.disconnect();
      resolve(value);
    }
    observer.observe(root, { childList: true, subtree: true });
  });

  const loadSdk = async () => {
    if (hasSdk()) return;
    let lastError = null;
    for (const src of SDK_SOURCES) {
      try {
        await loadScript(src, 7000, hasSdk);
        if (hasSdk()) return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Supabase SDK بەردەست نییە.');
  };

  const boot = async () => {
    render('loading', '١/٣ · بەستەری Supabase ئامادە دەکرێت...');
    let settled = false;
    const failSafe = window.setTimeout(() => {
      if (settled || hasSurface()) return;
      const message = 'کۆنسۆڵ لە کاتی دیاریکراودا بار نەبوو. براوزەرەکە نوێ بکەرەوە یان لە Safari بکەرەوە.';
      console.error('[Globall Cloud] Staff entry boot timeout.');
      render('error', message);
    }, 40000);
    try {
      await loadSdk();
      render('loading', '٢/٣ · پەیوەندی بە داتابەیسی پارێزراو دروست دەکرێت...');
      await loadScript(CONTROLLER, 10000, null);
      render('loading', '٣/٣ · پەڕەی چوونەژوورەوە ئامادە دەکرێت...');
      const ready = await waitForSurface(12000);
      if (!ready) throw new Error('کۆنتڕۆڵەری ستاف بارکرا، بەڵام پەڕەی چوونەژوورەوە دروست نەبوو.');
    } catch (error) {
      console.error('[Globall Cloud] Staff entry boot failed:', error);
      render('error', error && error.message ? error.message : String(error));
    } finally {
      settled = true;
      window.clearTimeout(failSafe);
    }
  };

  window.addEventListener('error', (event) => {
    const filename = String(event && event.filename || '');
    if (filename.includes('staff-os-v5-20261017.js') && !hasSurface()) {
      render('error', event.message || 'هەڵەی JavaScript لە Staff OS.');
    }
  });
  void boot();
})();
