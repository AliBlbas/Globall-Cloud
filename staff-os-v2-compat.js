(() => {
  'use strict';
  if (window.__gcStaffV2Compat) return;
  window.__gcStaffV2Compat = true;

  const WAIT_MS = 15000;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function getActiveTabButton(tab) {
    return [...document.querySelectorAll('[data-tab]')].find((el) => el.dataset.tab === tab) || null;
  }

  async function waitForStaffApp() {
    const started = Date.now();
    while (Date.now() - started < WAIT_MS) {
      if (getActiveTabButton('customers') || document.querySelector('.gc-shell')) return true;
      await sleep(100);
    }
    return false;
  }

  function clickTab(tab) {
    const button = getActiveTabButton(tab);
    if (!button) throw new Error(`Staff tab نەدۆزرایەوە: ${tab}`);
    button.click();
    return true;
  }

  // Backward-compatible API for the older V2 snippet, mapped to the real V5 UI.
  window.loadTab = async (tab) => {
    await waitForStaffApp();
    clickTab(tab === 'dashboard' ? 'overview' : tab);
    closeMobileNavigation();
  };
  window.renderCustomers = () => window.loadTab('customers');
  window.renderShipments = () => window.loadTab('shipments');
  window.renderPrices = () => window.loadTab('pricing');
  window.renderWarehouses = () => window.loadTab('warehouses');

  // Never pretend to send WhatsApp from a fake API endpoint. Open the real WhatsApp
  // conversation instead; server-side messaging remains behind the approved provider layer.
  window.sendWhatsApp = async (phone, message = '') => {
    const digits = String(phone || '').replace(/[^0-9]/g, '');
    if (!digits) throw new Error('ژمارەی مۆبایل نەدراوە');
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(String(message || ''))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    return { ok: true, provider: 'whatsapp-web' };
  };

  function installErrorSurface() {
    const show = (message, kind = 'bad') => {
      let toast = document.getElementById('gcCompatToast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'gcCompatToast';
        toast.style.cssText = 'position:fixed;inset-inline-end:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:9999;max-width:min(520px,calc(100vw - 28px));padding:12px 14px;border:1px solid rgba(255,113,128,.28);border-radius:14px;background:#071727;color:#fff;box-shadow:0 22px 70px rgba(0,0,0,.45);font:700 11px Vazirmatn,system-ui,sans-serif;line-height:1.7';
        document.body.appendChild(toast);
      }
      toast.dataset.kind = kind;
      toast.textContent = String(message || 'هەڵەی نەناسراو ڕوویدا');
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => toast.remove(), 5000);
    };

    window.addEventListener('error', (event) => {
      const message = event?.error?.message || event?.message;
      if (message) show(`هەڵەی سیستەم: ${message}`);
    });
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event?.reason;
      const message = reason?.message || String(reason || '');
      if (message) show(`هەڵەی داواکاری: ${message}`);
    });
    window.gcStaffCompatToast = show;
  }

  let mobileDock = null;
  let mobileToggle = null;
  let mobileResizeObserver = null;

  function closeMobileNavigation() {
    const side = document.querySelector('.gc-side');
    if (side) side.classList.remove('gc-mobile-nav-open');
    if (mobileToggle) {
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.textContent = '☰';
      mobileToggle.setAttribute('aria-label', 'کردنەوەی لیستی بەشەکان');
    }
  }

  function syncMobileActiveState() {
    if (!mobileDock) return;
    const active = document.querySelector('.gc-side .nav-btn.active')?.dataset.tab || '';
    mobileDock.querySelectorAll('[data-gc-mobile-tab]').forEach((button) => {
      const selected = button.dataset.gcMobileTab === active;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-current', selected ? 'page' : 'false');
    });
  }

  function invokeStaffTab(tab) {
    const original = getActiveTabButton(tab);
    if (!original) {
      if (typeof window.loadTab === 'function') {
        window.loadTab(tab).catch((error) => window.gcStaffCompatToast?.(error.message || 'بەشەکە نەکرایەوە'));
      }
      return;
    }
    original.click();
    closeMobileNavigation();
    requestAnimationFrame(syncMobileActiveState);
  }

  function buildMobileDock() {
    if (!document.querySelector('.gc-shell') || document.getElementById('gcMobileDock')) return;

    const side = document.querySelector('.gc-side');
    const brandRow = side?.querySelector('.brand-row');
    const nav = side?.querySelector('.nav');
    if (!side || !brandRow || !nav) return;

    mobileToggle = document.createElement('button');
    mobileToggle.type = 'button';
    mobileToggle.className = 'gc-mobile-menu-toggle';
    mobileToggle.setAttribute('aria-expanded', 'false');
    mobileToggle.setAttribute('aria-controls', 'gcStaffNav');
    mobileToggle.setAttribute('aria-label', 'کردنەوەی لیستی بەشەکان');
    mobileToggle.textContent = '☰';
    brandRow.appendChild(mobileToggle);
    nav.id = 'gcStaffNav';

    mobileToggle.addEventListener('click', () => {
      const open = side.classList.toggle('gc-mobile-nav-open');
      mobileToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobileToggle.textContent = open ? '×' : '☰';
      mobileToggle.setAttribute('aria-label', open ? 'داخستنی لیستی بەشەکان' : 'کردنەوەی لیستی بەشەکان');
    });

    mobileDock = document.createElement('nav');
    mobileDock.id = 'gcMobileDock';
    mobileDock.className = 'gc-mobile-dock';
    mobileDock.setAttribute('aria-label', 'ناوبەری خێرای Staff OS');

    const primary = [
      ['overview', '⌂', 'سەرەکی'],
      ['shipments', '▣', 'بارەکان'],
      ['customers', '◎', 'کڕیاران'],
      ['warehouses', '⌂', 'کۆگا'],
      ['alerts', '!', 'ئاگاداری'],
    ];

    primary.forEach(([tab, icon, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'gc-mobile-dock-item';
      button.dataset.gcMobileTab = tab;
      button.innerHTML = `<span class="gc-mobile-dock-icon" aria-hidden="true">${icon}</span><span>${label}</span>`;
      button.addEventListener('click', () => invokeStaffTab(tab));
      mobileDock.appendChild(button);
    });

    document.body.appendChild(mobileDock);
    syncMobileActiveState();

    nav.addEventListener('click', () => {
      closeMobileNavigation();
      setTimeout(syncMobileActiveState, 0);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMobileNavigation();
    });

    document.addEventListener('pointerdown', (event) => {
      if (!side.classList.contains('gc-mobile-nav-open')) return;
      if (side.contains(event.target)) return;
      closeMobileNavigation();
    }, { passive: true });

    mobileResizeObserver = new ResizeObserver(syncMobileActiveState);
    mobileResizeObserver.observe(side);

    const observer = new MutationObserver(syncMobileActiveState);
    observer.observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }

  function installResponsiveEnhancements() {
    if (document.getElementById('gc-v2-compat-style')) return;
    const style = document.createElement('style');
    style.id = 'gc-v2-compat-style';
    style.textContent = `
      .gc-mobile-menu-toggle,.gc-mobile-dock{display:none}
      @media (max-width: 760px) {
        :root { --gc-mobile-dock-h: 70px; }
        html { scroll-padding-top: 86px; }
        body { padding: 6px 6px calc(var(--gc-mobile-dock-h) + env(safe-area-inset-bottom,0px) + 12px) !important; min-width: 320px !important; }
        .gc-shell { display:block !important; min-height:calc(100dvh - 12px) !important; }
        .gc-side {
          position:sticky !important;
          top:calc(env(safe-area-inset-top,0px) + 6px) !important;
          z-index:100 !important;
          height:auto !important;
          max-height:none !important;
          overflow:visible !important;
          border-radius:18px !important;
          padding:10px !important;
          margin-bottom:10px !important;
        }
        .gc-side .brand {
          padding:4px 2px 9px !important;
          margin:0 !important;
          border-bottom:1px solid var(--line2) !important;
        }
        .gc-side .brand-row { align-items:center !important; min-width:0 !important; }
        .gc-side .brand-logo { width:40px !important; height:40px !important; border-radius:13px !important; flex:0 0 auto !important; }
        .gc-side .brand b { font-size:15px !important; }
        .gc-side .brand small { font-size:8px !important; }
        .gc-mobile-menu-toggle {
          display:grid !important;
          place-items:center !important;
          flex:0 0 42px !important;
          width:42px !important;
          height:42px !important;
          margin-inline-start:auto !important;
          border:1px solid rgba(139,234,246,.18) !important;
          border-radius:12px !important;
          background:rgba(255,255,255,.04) !important;
          color:var(--cyan2) !important;
          font-size:23px !important;
          line-height:1 !important;
        }
        .gc-side .nav {
          display:none !important;
          grid-template-columns:repeat(2,minmax(0,1fr)) !important;
          gap:5px !important;
          padding-top:8px !important;
          max-height:min(52vh,420px) !important;
          overflow:auto !important;
          overscroll-behavior:contain !important;
        }
        .gc-side.gc-mobile-nav-open .nav { display:grid !important; }
        .gc-side .nav-btn {
          min-height:46px !important;
          padding:8px 7px !important;
          justify-content:center !important;
          text-align:center !important;
          gap:5px !important;
          font-size:11px !important;
          border-radius:12px !important;
        }
        .gc-side .nav-icon { width:auto !important; font-size:9px !important; }
        .gc-side .side-foot { display:none !important; }
        .gc-main { width:100% !important; min-width:0 !important; padding-bottom:4px !important; }
        .topbar {
          position:sticky !important;
          top:calc(env(safe-area-inset-top,0px) + 6px) !important;
          z-index:80 !important;
          margin-bottom:10px !important;
          padding:9px 10px !important;
          border-radius:16px !important;
        }
        .top-title strong { font-size:16px !important; }
        .top-title span { font-size:9px !important; }
        .top-actions { gap:5px !important; }
        .top-actions .status { padding:6px 8px !important; font-size:8px !important; }
        .top-actions .btn { min-height:38px !important; padding:8px 9px !important; font-size:10px !important; }
        .view {
          min-height:0 !important;
          padding:10px !important;
          border-radius:18px !important;
        }
        .section-head { gap:9px !important; margin-bottom:10px !important; }
        .section-head h1 { font-size:20px !important; }
        .section-head p { font-size:10px !important; line-height:1.65 !important; }
        .grid-kpi { grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:7px !important; }
        .kpi { padding:11px !important; border-radius:15px !important; }
        .kpi strong { font-size:17px !important; }
        .two-col,.three-col,.chat-layout,.qr-wrap,.form-grid { grid-template-columns:1fr !important; }
        .photo-grid { grid-template-columns:repeat(2,1fr) !important; }
        .table-wrap { width:100% !important; overflow-x:auto !important; -webkit-overflow-scrolling:touch !important; }
        .table { min-width:720px !important; }
        .modal-backdrop { padding:8px !important; }
        .modal { width:100% !important; max-width:100% !important; max-height:calc(100dvh - 16px) !important; border-radius:18px !important; padding:12px !important; }
        .field { min-height:46px !important; font-size:16px !important; }
        .btn { min-height:44px !important; }
        .actions,.toolbar,.modal-foot { gap:6px !important; }
        .actions .btn,.toolbar .btn,.modal-foot .btn { flex:1 1 auto !important; }
        .gc-mobile-dock {
          position:fixed !important;
          left:8px !important;
          right:8px !important;
          bottom:calc(6px + env(safe-area-inset-bottom,0px)) !important;
          z-index:300 !important;
          display:grid !important;
          grid-template-columns:repeat(5,minmax(0,1fr)) !important;
          gap:4px !important;
          padding:6px !important;
          border:1px solid rgba(139,234,246,.16) !important;
          border-radius:18px !important;
          background:rgba(3,16,29,.92) !important;
          backdrop-filter:blur(18px) !important;
          -webkit-backdrop-filter:blur(18px) !important;
          box-shadow:0 18px 60px rgba(0,0,0,.48) !important;
        }
        .gc-mobile-dock-item {
          min-width:0 !important;
          min-height:54px !important;
          display:flex !important;
          flex-direction:column !important;
          align-items:center !important;
          justify-content:center !important;
          gap:2px !important;
          border:1px solid transparent !important;
          border-radius:13px !important;
          background:transparent !important;
          color:#91aec8 !important;
          font:800 9px/1.25 Vazirmatn,system-ui,sans-serif !important;
          white-space:nowrap !important;
        }
        .gc-mobile-dock-item.active {
          color:#f5fbff !important;
          background:linear-gradient(145deg,rgba(24,201,232,.18),rgba(168,160,255,.10)) !important;
          border-color:rgba(139,234,246,.18) !important;
        }
        .gc-mobile-dock-icon { font:900 17px/1 JetBrains Mono,ui-monospace,monospace !important; color:#7fe8f5 !important; }
        @media (max-width:420px) {
          .gc-side .brand small { display:none !important; }
          .top-actions .status { display:none !important; }
          .grid-kpi { gap:6px !important; }
          .kpi strong { font-size:15px !important; }
          .gc-mobile-dock { left:5px !important; right:5px !important; }
          .gc-mobile-dock-item { min-height:52px !important; font-size:8px !important; }
        }
      }
    `;
    document.head.appendChild(style);
  }

  function installSystemMonitor() {
    const root = document.documentElement;
    const update = () => {
      const status = document.getElementById('systemStatus');
      if (!status) return;
      const sessionState = window.gcSupabase?.auth?.getSession;
      if (!window.gcSupabase || typeof sessionState !== 'function') {
        status.textContent = 'Supabase · Waiting';
        status.classList.add('warn');
        return;
      }
      status.textContent = 'Supabase · Secure';
      status.classList.remove('warn', 'bad');
    };
    new MutationObserver(update).observe(root, { childList: true, subtree: true });
    setInterval(update, 5000);
    update();
  }

  async function boot() {
    installErrorSurface();
    installResponsiveEnhancements();
    await waitForStaffApp().catch(() => false);
    buildMobileDock();
    installSystemMonitor();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  const appObserver = new MutationObserver(() => {
    if (document.querySelector('.gc-shell')) buildMobileDock();
  });
  appObserver.observe(document.documentElement, { childList: true, subtree: true });
})();
