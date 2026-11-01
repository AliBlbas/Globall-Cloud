(() => {
  'use strict';
  let dock = null;

  const go = (key) => {
    if (key === 'home') { location.href = '/'; return; }
    if (key === 'shipments') { document.getElementById('shipments')?.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    if (key === 'quotes') { document.getElementById('quoteForm')?.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    if (key === 'chat') {
      const target = document.getElementById('gcAssistButton');
      if (target) { target.click(); return; }
      location.href = '/contact';
      return;
    }
    if (key === 'account') {
      const target = document.getElementById('gcAccountSettings');
      if (target) { target.scrollIntoView({behavior:'smooth',block:'start'}); return; }
      document.getElementById('loginBtn')?.click();
    }
  };

  const icon = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7"></path><path d="M5 10v10h14V10"></path></svg>',
    shipments: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"></rect><path d="M7 7V4h10v3"></path></svg>',
    quotes: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 7h8M8 11h2m2 0h2m2 0h0M8 15h2m2 0h2m2 0h0M8 18h8"></path></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-5.5 4v-4.8A2.5 2.5 0 0 1 4 12.5z"></path><path d="M8 8h8M8 11h5"></path></svg>',
    account: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20a7 7 0 0 1 14 0"></path></svg>'
  };

  const labels = {
    home: 'سەرەکی',
    shipments: 'بارەکان',
    quotes: 'حاسیبە',
    chat: 'چات',
    account: 'هەژمار'
  };

  const sync = () => {
    if (!dock) return;
    const y = window.scrollY + window.innerHeight * 0.45;
    const sections = [
      ['shipments','shipments'],
      ['quotes','quoteForm'],
      ['account','gcAccountSettings']
    ];
    let active = 'home';
    for (const [key,id] of sections) {
      const node = document.getElementById(id);
      if (node && node.getBoundingClientRect().top + window.scrollY <= y) active = key;
    }
    dock.querySelectorAll('[data-dock]').forEach((b) => b.classList.toggle('active', b.dataset.dock === active));
  };

  const install = () => {
    if (dock || !document.body) return;
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
    sync();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
