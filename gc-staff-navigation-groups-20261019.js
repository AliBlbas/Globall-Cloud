(() => {
  'use strict';

  // Organize existing Staff OS links without replacing their original buttons,
  // click handlers, permissions, or data routes.
  const GROUPS = [
    { title: 'سەرەکی و بار', tabs: ['overview', 'shipments', 'warehouses'] },
    { title: 'کڕیار و داواکاری', tabs: ['customers', 'customer-chat', 'requests'] },
    { title: 'بازرگانی و دارایی', tabs: ['pricing', 'finance'] },
    { title: 'ئاگاداری و بەڕێوەبردن', tabs: ['alerts', 'staff-chat', 'activity', 'settings'] }
  ];

  function organizeNavigation() {
    const nav = document.querySelector('body.gc-staff-os-shell #app nav.nav');
    if (!nav || nav.dataset.gcNavGrouped === '1') return Boolean(nav);

    const buttons = Array.from(nav.querySelectorAll(':scope > .nav-btn'));
    if (!buttons.length) return Boolean(nav.querySelector('.nav-group'));

    const byTab = new Map(buttons.map((button) => [button.dataset.tab, button]));
    const used = new Set();
    const groups = GROUPS.map((definition) => {
      const section = document.createElement('section');
      section.className = 'nav-group';
      section.setAttribute('aria-label', definition.title);

      const heading = document.createElement('div');
      heading.className = 'nav-group-title';
      heading.textContent = definition.title;
      section.appendChild(heading);

      definition.tabs.forEach((tab) => {
        const button = byTab.get(tab);
        if (!button) return;
        used.add(tab);
        section.appendChild(button);
      });
      return section;
    }).filter((section) => section.querySelector('.nav-btn'));

    const remaining = buttons.filter((button) => !used.has(button.dataset.tab));
    if (remaining.length) {
      const section = document.createElement('section');
      section.className = 'nav-group nav-group-more';
      section.setAttribute('aria-label', 'بەشەکانی تر');
      const heading = document.createElement('div');
      heading.className = 'nav-group-title';
      heading.textContent = 'بەشەکانی تر';
      section.appendChild(heading);
      remaining.forEach((button) => section.appendChild(button));
      groups.push(section);
    }

    nav.replaceChildren(...groups);
    nav.dataset.gcNavGrouped = '1';
    return true;
  }

  function start() {
    const app = document.getElementById('app');
    if (!app) return;
    organizeNavigation();
    const observer = new MutationObserver(() => { organizeNavigation(); });
    observer.observe(app, { childList: true, subtree: true });
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
