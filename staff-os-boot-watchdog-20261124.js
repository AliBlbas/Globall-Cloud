/* Globall Cloud — independent Staff OS boot watchdog.
   Loads asynchronously so a slow third-party deferred script cannot block recovery. */
(() => {
  'use strict';
  const app = document.getElementById('app');
  if (!app) return;

  const hasRealStaffApp = () => Boolean(app.querySelector('.gc-shell, .login-card, .login'));
  const hasRecovery = () => Boolean(app.querySelector('.gc-rescue-error, .gc-blank-state, .gc-boot-watchdog'));

  const renderRecovery = () => {
    if (hasRealStaffApp() || hasRecovery()) return;
    app.innerHTML = `
      <main class="gc-boot-watchdog" dir="rtl">
        <section class="gc-boot-watchdog-card">
          <div class="gc-rescue-mark">GC</div>
          <div class="gc-rescue-eyebrow">STAFF OPERATING SYSTEM · V5</div>
          <h1>پەڕەی ستاف بە تەواوی بار نەبوو</h1>
          <p>وەڵامی خزمەتی چوونەژوورەوە یان فایلێکی سیستەم دوا کەوتووە. هیچ داتایەک نەسڕاوەتەوە؛ پەڕەکە دووبارە بار بکەرەوە، یان Staff Gateway بکەرەوە.</p>
          <div class="gc-boot-watchdog-actions">
            <button class="primary" type="button" id="gcBootRetry">دووبارە بارکردنەوە</button>
            <a href="/management.html">کردنەوەی Staff Gateway</a>
          </div>
          <p style="font-size:11px;margin-top:14px">ئەگەر ئەم دۆخە دووبارە بووەوە، پەیوەندی ئینتەرنێت و cache ـی براوزەر بپشکنە.</p>
        </section>
      </main>`;
    app.querySelector('#gcBootRetry')?.addEventListener('click', () => location.reload(), { once: true });
  };

  let timer = window.setTimeout(renderRecovery, 16000);
  const observer = new MutationObserver(() => {
    if (hasRealStaffApp() || hasRecovery()) {
      window.clearTimeout(timer);
      observer.disconnect();
    }
  });
  observer.observe(app, { childList: true, subtree: true });
  window.addEventListener('pagehide', () => {
    window.clearTimeout(timer);
    observer.disconnect();
  }, { once: true });
})();
