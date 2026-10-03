/* Globall Cloud — one-purpose controls and separated premium service icons. */
(() => {
  'use strict';
  const svg = {
    air:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13.5 21 4l-5.5 17-3.2-6.2L3 13.5Z"/><path d="m12.3 14.8 5.3-5.3"/></svg>',
    sea:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15h18l-2 4H5l-2-4Z"/><path d="M7 15V6h8v9M10 6V3h4v3M3 21c2 .9 3.8.9 5.5 0 1.7-.9 3.5-.9 5.2 0 1.7.9 3.5.9 5.3 0 1.7-.9 2.9-.9 4 0"/></svg>',
    land:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>',
    warehouse:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-6 9 6v10H3V10Z"/><path d="M7 20v-6h10v6M7 10h10"/></svg>',
    customs:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.5-3 7.6-7 10-4-2.4-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
    track:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="m12 4 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"/></svg>',
    support:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/></svg>'
  };
  const classFor = (text) => {
    const t = String(text || '').toLowerCase();
    if (/air|ئاسمانی|ئاسمان|✈/.test(t)) return 'air';
    if (/sea|دەریایی|دەریا|🚢/.test(t)) return 'sea';
    if (/land|وشکانی|وشکان|🚚|🚛/.test(t)) return 'land';
    if (/warehouse|کۆگا|کۆگاداری|🏭/.test(t)) return 'warehouse';
    if (/custom|گومرگ|بەڵگە|🛃/.test(t)) return 'customs';
    if (/track|شوێنکەوت|📍|🔎/.test(t)) return 'track';
    if (/support|پشتیوان|پەیوەند|💬/.test(t)) return 'support';
    return 'track';
  };
  const polishCards = () => {
    document.querySelectorAll('.service-icon,.hub-icon,.gc-service-icon,.feature-card .service-icon').forEach((node) => {
      if (node.dataset.gcIconNormalized === '1') return;
      const card = node.closest('.service-card,.hub-card,.feature-card,.gc-service,.gc-platform-card') || node.parentElement;
      const source = `${node.textContent} ${card?.textContent || ''}`;
      const kind = classFor(source);
      node.dataset.gcIconNormalized = '1';
      node.classList.add('gc-clean-icon', `gc-clean-icon-${kind}`);
      node.innerHTML = svg[kind];
      node.setAttribute('aria-hidden','true');
      card?.classList.add('gc-icon-separated', `gc-card-${kind}`);
    });
  };
  const removeDuplicateControls = () => {
    const path = location.pathname.toLowerCase();
    if (path === '/' || path === '/index.html') {
      document.querySelectorAll('.gc-public-mobile-actions,.gc-vx-cmd').forEach((node) => node.remove());
      document.querySelectorAll('a[href^="https://wa.me"]').forEach((node) => {
        if (node.id !== 'gcWhatsAppFloat' && !node.closest('.gc-whatsapp-float')) node.remove();
      });
      document.querySelectorAll('[data-dock="settings"]').forEach((node) => node.remove());
    }
    const whatsapp = [...document.querySelectorAll('#gcWhatsAppFloat')];
    whatsapp.slice(1).forEach((node) => node.remove());
  };
  const boot = () => { removeDuplicateControls(); polishCards(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
  new MutationObserver(boot).observe(document.documentElement, { childList:true, subtree:true });
})();
