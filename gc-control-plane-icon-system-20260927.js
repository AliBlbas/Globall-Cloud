(() => {
  'use strict';
  const icons = {
    overview:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    shipments:'<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
    packages:'<path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z"/><path d="M12 11v10"/>',
    customs:'<path d="M4 20V5h16v15M4 9h16M8 5V3h8v2M8 13h8M8 17h5"/>',
    consolidations:'<rect x="4" y="5" width="7" height="14" rx="1"/><rect x="13" y="5" width="7" height="14" rx="1"/><path d="M11 12h2"/>',
    finance:'<circle cx="12" cy="12" r="8"/><path d="M12 7v10M15 9.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1.3 2 3 2 3 .8 3 2-1.3 2-3 2c-1.3 0-2.3-.3-3-1"/>',
    exceptions:'<path d="M12 4v9"/><path d="M12 17v1"/><path d="M10.3 3h3.4l7.3 16H3z"/>',
    quotes:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    documents:'<path d="M6 3h9l4 4v14H6zM15 3v5h4M9 12h6M9 16h6"/>',
    movements:'<path d="M5 7h13l-3-3M19 17H6l3 3"/><path d="M18 4v3M6 17v3"/>',
    route_legs:'<path d="M4 18c4-8 7-8 10-8 2.5 0 3.5-1 5-4"/><path d="m16 6 3 0 0 3"/>',
    outbox:'<path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/>',
    data_hub:'<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>'
  };
  const apply = () => document.querySelectorAll('.sidebar .nav[data-view]').forEach(btn => {
    if (btn.dataset.gcIconSystem === '1') return;
    const key = btn.dataset.view; if (!icons[key]) return;
    const old = btn.querySelector('span');
    const icon = document.createElement('span'); icon.className='gc-cp-icon'; icon.setAttribute('aria-hidden','true');
    icon.innerHTML = `<svg viewBox="0 0 24 24">${icons[key]}</svg>`;
    if (old) old.replaceWith(icon); else btn.prepend(icon);
    btn.dataset.gcIconSystem='1';
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, {once:true}); else apply();
})();
