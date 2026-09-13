(() => {
  'use strict';

  const VERSION = '20260913-5';
  const CORE = `/gc-csp-scripts/index-inline-2.js?recovery=${VERSION}`;
  let coreLoadStarted = false;

  const addCoreScript = () => {
    if (coreLoadStarted) return;
    if (typeof window.route === 'function' && typeof window.applyI18n === 'function') return;
    if (document.querySelector('script[data-gc-core-recovery]')) return;
    coreLoadStarted = true;
    const script = document.createElement('script');
    script.src = CORE;
    script.dataset.gcCoreRecovery = '1';
    script.defer = true;
    document.head.appendChild(script);
  };

  const ensureIconSprite = () => {
    const ids = {
      'i-search':'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/>',
      'i-box':'<path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 7v9l8 4 8-4V7M12 11v9"/>',
      'i-chat':'<path d="M20 11a8 8 0 0 1-8 8 9.7 9.7 0 0 1-3.9-.8L4 20l1.6-3.6A8 8 0 1 1 20 11Z"/>',
      'i-user':'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
      'i-card':'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h5"/>',
      'i-warehouse':'<path d="m3 10 9-6 9 6v10H3Z"/><path d="M7 20v-6h10v6M8 10h8M12 10v2"/>',
      'i-clock':'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
      'i-arrow':'<path d="M5 12h13M13 6l6 6-6 6"/>',
      'i-check':'<path d="m5 12 4 4L19 6"/>',
      'i-shield':'<path d="M12 3 19 6v5c0 4.5-3 7.6-7 10-4-2.4-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/>',
      'i-eye':'<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
      'i-plane':'<path d="m3 13 8-2 3-7 2 .8-1.7 6.5 6.7 2.6c1 .4 1.2 1.5.3 2l-7.2 4-1.2-1.2 2.1-3.6-7.1 1.2-2.4-1.1.8-2.2Z"/>',
      'i-ship':'<path d="M4 14h16l-2 4H6l-2-4Z"/><path d="M8 14V7h8v7M10 7V4h4v3M3 20c1.5 1.2 3 1.2 4.5 0 1.5 1.2 3 1.2 4.5 0 1.5 1.2 3 3 0 4.5-1.2 3 0-1.5-3-3-4.5-1.2Z"/>',
      'i-route':'<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3c3 0 3-2 3-4s0-4 3-4h1"/>',
      'i-clipboard':'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/>',
      'i-truck':'<path d="M3 6h11v10H3Z"/><path d="M14 10h4l3 3v3h-7Z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
      'i-moon':'<path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5Z"/>',
      'i-sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      'i-settings':'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.6 1.6-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.6-1.6.1-.1A1.7 1.7 0 0 0 8.6 15a1.7 1.7 0 0 0-1.5-1H6.9v-2.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.6-1.6.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.6 1.6-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z"/>',
      'i-download':'<path d="M12 3v11"/><path d="m8 10 4 4 4-4"/><path d="M5 20h14"/>',
      'i-copy':'<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
      'i-phone':'<path d="M7 3h3l1 5-2 1.5a13 13 0 0 0 5.5 5.5L16 13l5 1v3c0 1.1-.9 2-2 2C11.3 19 5 12.7 5 5a2 2 0 0 1 2-2Z"/>',
      'i-pin':'<path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/>',
      'i-trash':'<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
      'i-camera':'<path d="M5 7h3l1.5-2h5L16 7h3v11H5V7Z"/><circle cx="12" cy="12.5" r="3.2"/>',
      'i-x':'<path d="m6 6 12 12M18 6 6 18"/>',
      'i-chevron-down':'<path d="m6 9 6 6 6-6"/>',
      'i-eye-off':'<path d="m3 3 18 18M10.6 10.6A2 2 0 0 0 13.4 13.4M9.8 5.1A10.7 10.7 0 0 1 12 4.8c6 0 9.5 7.2 9.5 7.2a17 17 0 0 1-3.6 4.4M6.2 6.2C3.8 8.1 2.5 12 2.5 12S6 19.2 12 19.2c1.2 0 2.3-.2 3.3-.6"/>',
      'i-whatsapp':'<path d="M19.6 4.4A9.4 9.4 0 0 0 4.7 16.3L3.7 20l3.8-1a9.4 9.4 0 0 0 12.1-14.6Z"/><path d="M8.2 8.1c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.8c.1.2.1.4 0 .6l-.5.7c.8 1.5 2 2.5 3.6 3.2l.6-.8c.2-.2.4-.3.7-.2l1.8.8c.3.1.4.3.3.6-.2.8-.8 1.5-1.6 1.7-2.2.4-7.1-2.4-8.2-6.2-.2-.8.3-1.7.9-2.2Z"/>',
    };

    let sprite = document.getElementById('gcIconRecoverySprite');
    if (!sprite) {
      sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      sprite.id = 'gcIconRecoverySprite';
      sprite.setAttribute('aria-hidden', 'true');
      sprite.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
      document.body.prepend(sprite);
    }

    Object.entries(ids).forEach(([id, body]) => {
      if (document.getElementById(id)) return;
      const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
      symbol.id = id;
      symbol.setAttribute('viewBox', '0 0 24 24');
      symbol.setAttribute('fill', 'none');
      symbol.setAttribute('stroke', 'currentColor');
      symbol.setAttribute('stroke-width', '1.9');
      symbol.setAttribute('stroke-linecap', 'round');
      symbol.setAttribute('stroke-linejoin', 'round');
      symbol.innerHTML = body;
      sprite.appendChild(symbol);
    });
  };

  const routeFallback = (id) => {
    const paths = {
      home:'/', about:'/about', services:'/services', track:'/#track', request:'/quote', portal:'/dashboard', contact:'/contact', staff:'/staff'
    };
    const href = paths[id] || '/';
    if (id === 'track') window.location.href = href;
    else if (id === 'staff') window.location.href = href;
    else window.location.href = href;
  };

  const installInteractionFallback = () => {
    if (window.__gcPublicRecoveryInteractions) return;
    window.__gcPublicRecoveryInteractions = true;

    document.addEventListener('click', (event) => {
      const link = event.target.closest?.('[data-gc-route], [data-gc-onclick]');
      if (!link) return;

      const routeId = link.dataset.gcRoute;
      if (routeId && typeof window.route !== 'function') {
        event.preventDefault();
        event.stopPropagation();
        routeFallback(routeId);
        return;
      }

      const raw = String(link.getAttribute('data-gc-onclick') || '');
      const match = raw.match(/^route\(\s*["']([a-z-]+)["']\s*\)$/i);
      if (match && typeof window.route !== 'function') {
        event.preventDefault();
        event.stopPropagation();
        routeFallback(match[1]);
      }
    }, true);
  };

  const recover = () => {
    ensureIconSprite();
    installInteractionFallback();
    if (!document.querySelector('.page.active') && document.querySelector('#page-home')) {
      const home = document.getElementById('page-home');
      home.classList.add('active');
      home.hidden = false;
    }
  };

  const boot = () => {
    recover();
    window.setTimeout(() => { addCoreScript(); recover(); }, 900);
    window.setTimeout(() => recover(), 1800);
    window.setTimeout(() => recover(), 3200);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
