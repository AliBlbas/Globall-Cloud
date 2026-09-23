(() => {
  'use strict';
  if (window.__gcOnboarding20260923) return;
  window.__gcOnboarding20260923 = true;

  const KEY = 'gc.welcome.seen.v1';
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const style = document.createElement('style');
  style.textContent = `
    .gc-welcome-backdrop{position:fixed;inset:0;z-index:99990;background:rgba(3,12,24,.72);backdrop-filter:blur(14px);display:grid;place-items:center;padding:20px;opacity:0;transition:opacity .22s ease}
    .gc-welcome-backdrop.is-open{opacity:1}
    .gc-welcome{width:min(980px,100%);max-height:min(760px,calc(100vh - 40px));overflow:auto;background:linear-gradient(145deg,#0b2035,#071727 72%);border:1px solid rgba(116,226,235,.18);border-radius:28px;box-shadow:0 32px 90px rgba(0,0,0,.48);color:#eef8ff;padding:28px}
    .gc-welcome-top{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:24px}
    .gc-welcome-kicker{font:700 11px/1.2 JetBrains Mono,monospace;letter-spacing:.12em;color:#74e2eb;text-transform:uppercase}
    .gc-welcome h2{font-size:clamp(28px,4vw,46px);line-height:1.08;margin:10px 0 10px;font-weight:900}
    .gc-welcome p{margin:0;color:#b9cddd;line-height:1.9;max-width:720px}
    .gc-welcome-close{width:42px;height:42px;border-radius:13px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font-size:20px}
    .gc-welcome-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
    .gc-welcome-card{display:flex;flex-direction:column;min-height:250px;padding:20px;border-radius:22px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045);transition:transform .2s ease,border-color .2s ease,background .2s ease}
    .gc-welcome-card:hover{transform:translateY(-3px);border-color:rgba(116,226,235,.35);background:rgba(116,226,235,.07)}
    .gc-welcome-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:rgba(116,226,235,.1);font-size:22px;margin-bottom:18px}
    .gc-welcome-card h3{font-size:20px;margin:0 0 8px}.gc-welcome-card p{font-size:14px;line-height:1.8}
    .gc-welcome-card a{margin-top:auto;padding-top:18px;color:#74e2eb;font-weight:800;text-decoration:none}
    .gc-welcome-foot{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-top:22px;padding-top:18px;border-top:1px solid rgba(255,255,255,.08);color:#8fa8bb;font-size:13px}
    .gc-welcome-foot button{border:0;background:none;color:#74e2eb;cursor:pointer;font:inherit;font-weight:700}
    @media(max-width:760px){.gc-welcome{padding:20px;border-radius:22px}.gc-welcome-grid{grid-template-columns:1fr}.gc-welcome-card{min-height:0}.gc-welcome-top{margin-bottom:18px}}
    @media(prefers-reduced-motion:reduce){.gc-welcome-backdrop,.gc-welcome-card{transition:none}}
  `;
  document.head.appendChild(style);

  const close = (el) => {
    el.classList.remove('is-open');
    setTimeout(() => el.remove(), reduced ? 0 : 220);
    try { localStorage.setItem(KEY, '1'); } catch (_) {}
  };

  const build = () => {
    const backdrop = document.createElement('div');
    backdrop.className = 'gc-welcome-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'gcWelcomeTitle');
    backdrop.innerHTML = `
      <section class="gc-welcome">
        <div class="gc-welcome-top">
          <div>
            <div class="gc-welcome-kicker">WELCOME TO GLOBALL CLOUD · LOGISTICS OS</div>
            <h2 id="gcWelcomeTitle">یەک پلاتفۆرم بۆ هەموو گواستنەوەکەت.</h2>
            <p>Globall Cloud بۆ بەڕێوەبردنی بارەکانە: داواکاری نرخ، وەرگرتنی بار، کۆگا، گواستنەوەی Air / Sea / Land، شوێنکەوتن، بەڵگەنامە و دابەزاندن تا گەیشتن بە کڕیار.</p>
          </div>
          <button class="gc-welcome-close" type="button" aria-label="داخستن">×</button>
        </div>
        <div class="gc-welcome-grid">
          <article class="gc-welcome-card">
            <div class="gc-welcome-icon">◉</div>
            <h3>من تازە هاتووم</h3>
            <p>بزانە Globall Cloud چییە و چۆن بارەکەت لە سەرچاوەوە تا شوێنی گەیاندن بەدواداچوون دەکەیت.</p>
            <a href="/services">بینینی خزمەتگوزارییەکان →</a>
          </article>
          <article class="gc-welcome-card">
            <div class="gc-welcome-icon">▣</div>
            <h3>من کڕیارم</h3>
            <p>هەژماری تایبەتی خۆت دروست بکە بۆ بارەکان، tracking، invoice، payment، بەڵگەنامە و ئاگادارییەکان.</p>
            <a href="/dashboard">چوونە ناو هەژماری کڕیار →</a>
          </article>
          <article class="gc-welcome-card">
            <div class="gc-welcome-icon">⌘</div>
            <h3>من ستافم</h3>
            <p>کۆنسۆڵی ستاف بۆ کارگێڕی shipment، کۆگا، دارایی، بەڵگەنامە، notification، analytics و audit trail ـە.</p>
            <a href="/staff">چوونە ناو Staff Console →</a>
          </article>
        </div>
        <div class="gc-welcome-foot"><span>دەتوانیت هەر کاتێک بێ هەژمار tracking بکەیت.</span><button type="button" data-gc-welcome-skip>تێپەڕاندن</button></div>
      </section>`;

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) close(backdrop);
      if (event.target.closest('.gc-welcome-close,[data-gc-welcome-skip]')) close(backdrop);
    });
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('is-open'));
  };

  const init = () => {
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    let seen = false;
    try { seen = localStorage.getItem(KEY) === '1'; } catch (_) {}
    if (!seen) build();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
