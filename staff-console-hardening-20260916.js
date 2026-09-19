(() => {
  'use strict';
  const isStaff = /\/staff(?:\/|$)/.test(location.pathname) || /staff-os-v5\.html/.test(location.pathname);
  if (!isStaff) return;

  const showRuntimeIssue = (message) => {
    const view = document.getElementById('view');
    if (!view || !document.querySelector('.gc-shell')) return;
    const existing = document.getElementById('gcStaffRuntimeIssue');
    if (existing) return;
    const box = document.createElement('div');
    box.id = 'gcStaffRuntimeIssue';
    box.dir = 'rtl';
    box.style.cssText = 'margin:10px 0;padding:14px 16px;border-radius:16px;border:1px solid rgba(245,158,11,.35);background:rgba(245,158,11,.08);color:#f8fafc;font:600 13px/1.8 Vazirmatn,Noto Sans Arabic,system-ui,sans-serif';
    box.innerHTML = `<strong style="display:block;color:#fbbf24;margin-bottom:4px">سیستەمی ستاف بە تەواوی وەڵام نادات</strong><span>${String(message || 'هەڵەیەکی کاتی ڕوویدا.').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span><button id="gcStaffRuntimeRetry" type="button" style="display:block;margin-top:10px;border:0;border-radius:10px;padding:9px 13px;background:#22d3ee;color:#03101f;font-weight:800">دووبارە هەوڵدانەوە</button>`;
    view.prepend(box);
    document.getElementById('gcStaffRuntimeRetry')?.addEventListener('click', () => location.reload());
  };

  window.addEventListener('unhandledrejection', event => {
    const message = event?.reason?.message || event?.reason;
    if (message && document.querySelector('.gc-shell')) showRuntimeIssue(message);
  });

  window.addEventListener('error', event => {
    if (document.querySelector('.gc-shell') && event?.message) showRuntimeIssue(event.message);
  });

  const ensureMobileViewport = () => {
    if (!document.querySelector('.gc-shell')) return;
    document.documentElement.style.setProperty('--gc-mobile-bottom-space', '86px');
    document.body.classList.add('gc-staff-mobile-ready');
  };

  const observer = new MutationObserver(ensureMobileViewport);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  setTimeout(ensureMobileViewport, 500);
  setTimeout(ensureMobileViewport, 1800);
})();
