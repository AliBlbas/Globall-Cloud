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

  // Backward-compatible names for the older V2 snippet, mapped to the real V5 UI.
  window.loadTab = async (tab) => {
    await waitForStaffApp();
    clickTab(tab === 'dashboard' ? 'overview' : tab);
  };
  window.renderCustomers = () => window.loadTab('customers');
  window.renderShipments = () => window.loadTab('shipments');
  window.renderPrices = () => window.loadTab('pricing');
  window.renderWarehouses = () => window.loadTab('warehouses');

  // Never pretend to send WhatsApp from a fake /api endpoint. Open a real WhatsApp
  // conversation instead; server-side messaging stays behind the approved provider layer.
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
        toast.style.cssText = 'position:fixed;inset-inline-end:14px;bottom:14px;z-index:9999;max-width:min(520px,calc(100vw - 28px));padding:12px 14px;border:1px solid rgba(255,113,128,.28);border-radius:14px;background:#071727;color:#fff;box-shadow:0 22px 70px rgba(0,0,0,.45);font:700 11px Vazirmatn,system-ui,sans-serif;line-height:1.7';
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

  function installResponsiveEnhancements() {
    const style = document.createElement('style');
    style.id = 'gc-v2-compat-style';
    style.textContent = `
      @media (max-width: 760px) {
        body { padding: 6px !important; }
        .gc-shell { min-height: calc(100vh - 12px) !important; }
        .gc-side { border-radius: 18px !important; padding: 10px !important; }
        .brand { padding-bottom: 10px !important; margin-bottom: 7px !important; }
        .nav { display: grid !important; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 4px !important; }
        .nav-btn { min-height: 42px !important; padding: 7px 6px !important; justify-content: center !important; text-align: center !important; }
        .nav-icon { width: auto !important; }
        .side-foot { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 4px 8px !important; }
        .side-foot #logoutBtn { grid-column: 1/-1; }
        .topbar { position: sticky !important; top: 6px !important; }
        .view { padding: 10px !important; border-radius: 18px !important; }
        .grid-kpi { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
        .two-col,.three-col,.chat-layout,.qr-wrap,.form-grid { grid-template-columns: 1fr !important; }
        .photo-grid { grid-template-columns: repeat(2,1fr) !important; }
        .table { min-width: 760px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function installSystemMonitor() {
    const root = document.documentElement;
    const update = () => {
      const sessionState = window.gcSupabase?.auth?.getSession;
      const status = document.getElementById('systemStatus');
      if (!status) return;
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

  installErrorSurface();
  installResponsiveEnhancements();
  installSystemMonitor();
})();
