(() => {
  'use strict';
  if (!/^\/staff(?:-os)?(?:\.html)?\/?$/.test(location.pathname)) return;

  const started = Date.now();
  let shown = false;
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
  const appIsRendered = () => Boolean(document.querySelector('.gc-shell, .login'));
  const appIsEmpty = () => {
    const app = document.getElementById('app');
    return Boolean(app && !app.innerHTML.trim());
  };
  const canRecover = () => !shown && !appIsRendered() && appIsEmpty() && (Date.now() - started < 18000);

  const showRecovery = (reason = '') => {
    if (!canRecover()) return;
    shown = true;
    document.documentElement.style.background = '#020912';
    document.body.style.cssText = 'margin:0;min-height:100vh;background:#020912;color:#f5fbff;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;display:grid;place-items:center;padding:20px;box-sizing:border-box;direction:rtl';
    document.body.innerHTML = `<main style="width:min(520px,100%);padding:24px;border:1px solid rgba(139,234,246,.2);border-radius:22px;background:#061727;box-shadow:0 25px 80px rgba(0,0,0,.45);text-align:center"><div style="font-size:34px;font-weight:900;color:#8beaf6">GC</div><h1 style="margin:14px 0 8px;font-size:22px">Staff OS ــ پەیوەندیی شاشەکە</h1><p style="margin:0;color:#9ab5cf;font-size:13px;line-height:1.9">سیستەمی Staff بە شێوەی دروست ڕەنەکەوت. cache ـی کۆن یان JavaScript ـێک ڕێگری لە بارکردنی شاشەکە کردووە.</p>${reason ? `<div style="margin-top:12px;padding:10px;border:1px solid rgba(255,113,128,.22);border-radius:12px;color:#ffc6cc;font-size:11px;word-break:break-word">${esc(reason)}</div>` : ''}<button id="gcEmergencyReset" type="button" style="margin-top:16px;width:100%;min-height:46px;border:0;border-radius:12px;background:linear-gradient(135deg,#8beaf6,#18c9e8);color:#02161c;font-weight:900;font-size:13px">پاککردنەوەی cache و دووبارەکردنەوە</button></main>`;
    document.getElementById('gcEmergencyReset').onclick = async () => {
      try { const regs = await navigator.serviceWorker?.getRegistrations?.() || []; await Promise.all(regs.map(r => r.unregister())); } catch (_) {}
      try { const keys = await caches?.keys?.() || []; await Promise.all(keys.map(k => caches.delete(k))); } catch (_) {}
      const u = new URL(location.href); u.searchParams.set('gc_reset', String(Date.now())); location.replace(u.toString());
    };
  };

  window.addEventListener('error', (event) => {
    if (!canRecover()) return;
    const msg = event?.error?.message || event?.message || 'JavaScript runtime error';
    if (/staff|supabase|syntax|undefined|null|is not a function|failed to load/i.test(String(msg))) {
      setTimeout(() => showRecovery(String(msg)), 50);
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    if (!canRecover()) return;
    const msg = event?.reason?.message || event?.reason || 'Unhandled promise rejection';
    setTimeout(() => showRecovery(String(msg)), 50);
  });

  const probe = () => {
    if (!canRecover()) return;
    if (Date.now() - started > 12000) showRecovery('Staff UI ـەکە بار نەکرا.');
  };

  const timer = setInterval(() => {
    probe();
    if (Date.now() - started > 20000) clearInterval(timer);
  }, 1000);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', probe, { once: true });
  else probe();
})();
