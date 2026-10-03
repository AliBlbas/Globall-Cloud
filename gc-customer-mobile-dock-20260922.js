(() => {
  'use strict';
  let dock = null;

  const go = (key) => {
    const routes = {home:'#home',shipments:'#shipments',quotes:'#quotes',account:'#account'};
    if (key === 'track') { location.href = '/track'; return; }
    if (routes[key]) history.pushState({tab:key},'',`/customer-portal${routes[key]}`);
    const targets = {home:'.hero',shipments:'#shipments',quotes:'#quoteForm',account:'#gcAccountSettings'};
    document.querySelector(targets[key])?.scrollIntoView({behavior:'smooth',block:'start'});
    sync();
  };

  const icon = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7"></path><path d="M5 10v10h14V10"></path></svg>',
    shipments: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M7 7V4h10v3"></path></svg>',
    quotes: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 7h8M8 11h2m2 0h2m2 0h0M8 15h2m2 0h2m2 0h0M8 18h8"></path></svg>',
    track: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="2"></circle><path d="m12 4 2 6 6 2-6 2-2 6-2-6-6-2 6-2z"></path></svg>',
    account: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20a7 7 0 0 1 14 0"></path></svg>'
  };

  const labels = {
    home: 'سەرەکی',
    shipments: 'بارەکان',
    quotes: 'نرخ',
    track: 'Tracking',
    account: 'هەژمار'
  };

  const sync = () => {
    if (!dock) return;
    const y = window.scrollY + window.innerHeight * 0.45;
    const hash = String(location.hash || '').replace(/^#/,'');
    let active = ['home','shipments','quotes','account'].includes(hash) ? hash : 'home';
    if (!hash) {
      const sections = [['shipments','shipments'],['quotes','quoteForm'],['track','trackBtn'],['account','gcAccountSettings']];
      for (const [key,id] of sections) {
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top + window.scrollY <= y) active = key;
      }
    }
    dock.querySelectorAll('[data-dock]').forEach((b) => {
      const isActive = b.dataset.dock === active;
      b.classList.toggle('active', isActive);
      if (isActive) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    });
  };

  const install = () => {
    if (dock || !document.body) return;
    const finalIconLayer = document.createElement('link');
    finalIconLayer.rel = 'stylesheet';
    finalIconLayer.href = '/gc-customer-dashboard-icons-20260928.css?v=3';
    document.head.appendChild(finalIconLayer);
    dock = document.createElement('nav');
    dock.className = 'gc-customer-mobile-dock';
    dock.setAttribute('aria-label', 'Customer quick navigation');
    dock.innerHTML = Object.keys(labels).map((key) =>
      '<button type="button" data-dock="' + key + '" aria-label="' + labels[key] + '">' +
      '<span class="dock-icon">' + icon[key] + '</span><span class="dock-label">' + labels[key] + '</span></button>'
    ).join('');
    document.body.appendChild(dock);
    dock.addEventListener('click', (event) => {
      const button = event.target.closest('[data-dock]');
      if (button) go(button.dataset.dock);
    });
    window.addEventListener('scroll', sync, {passive:true});
    window.addEventListener('resize', sync, {passive:true});
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    sync();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
