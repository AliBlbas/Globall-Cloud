/* Globall Cloud — dashboard controls, icons, language, and theme bridge. */
(() => {
  'use strict';
  const LANG_KEY = 'gc-language';
  const THEME_KEY = 'gc-theme';
  const icons = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-7 8 7v10H4z"/><path d="M9 20v-6h6v6"/></svg>',
    shipments: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="M4 7v9l8 4 8-4V7M12 11v9"/></svg>',
    quote: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
    rates: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-8M22 19H2"/></svg>',
    support: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/></svg>',
    request: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/><path d="m15 17 2 2 4-4"/></svg>',
    notifications: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1 1.4 1.1-1.7 3-1.7-.7a7.8 7.8 0 0 1-1.5.9l-.3 1.8h-3.4l-.3-1.8a7.8 7.8 0 0 1-1.5-.9l-1.7.7-1.7-3L6.5 15a7.7 7.7 0 0 1 0-2l-1.4-1.1 1.7-3 1.7.7a7.8 7.8 0 0 1 1.5-.9l.3-1.8h3.4l.3 1.8a7.8 7.8 0 0 1 1.5.9l1.7-.7 1.7 3-1.4 1.1a7.7 7.7 0 0 1-.1 2Z"/></svg>',
    sales: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/><path d="m15 16 2 2 4-4"/></svg>',
    records: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.4A8.5 8.5 0 0 1 8.6 4 8.5 8.5 0 1 0 20 15.4Z"/></svg>',
    language: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z"/></svg>',
    documents: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 9"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"/></svg>',
    moving: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h12v10H3zM15 10h4l3 4v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>',
    route: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a3 3 0 0 0 3-3v-3a3 3 0 0 1 3-3"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 18-8-7 18-3-7-8-3Z"/><path d="m11 14 5-5"/></svg>',
    track: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M15 14h3"/></svg>',
    warehouse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-6 9 6v10H3V10Z"/><path d="M7 20v-6h10v6M7 10h10"/></svg>'
  };
  const copy = {
    ckb: { dir: 'rtl', labels: { home: 'سەرەکی', shipments: 'بارەکان', quote: 'داواکاری', request: 'داواکاری', notifications: 'ئاگاداری', records: 'بەڵگە', settings: 'ڕێکخستن', rates: 'نرخەکان', support: 'پشتیوانی', sales: 'فرۆشتن و نرخ', theme: 'دۆخی ڕووناکی', language: 'زمان', dark: 'تاریک', light: 'ڕووناک' } },
    ar: { dir: 'rtl', labels: { home: 'الرئيسية', shipments: 'الشحنات', quote: 'طلب سعر', request: 'الطلبات', notifications: 'الإشعارات', records: 'المستندات', settings: 'الإعدادات', rates: 'الأسعار', support: 'الدعم', sales: 'المبيعات والأسعار', theme: 'المظهر', language: 'اللغة', dark: 'داكن', light: 'فاتح' } },
    en: { dir: 'ltr', labels: { home: 'Home', shipments: 'Shipments', quote: 'New quote', request: 'Requests', notifications: 'Notifications', records: 'Records', settings: 'Settings', rates: 'Rates', support: 'Support', sales: 'Sales & rates', theme: 'Appearance', language: 'Language', dark: 'Dark', light: 'Light' } }
  };
  const validLang = (lang) => copy[lang] ? lang : 'ckb';
  const currentLang = () => validLang(localStorage.getItem(LANG_KEY) || document.documentElement.lang || 'ckb');
  const currentTheme = () => localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  const syncAppTheme = (theme) => {
    if (document.body?.classList.contains('gc-customer-app')) {
      document.body.style.setProperty('background-image', theme === 'light' ? 'radial-gradient(900px 500px at 78% -12%,rgba(88,229,239,.18),transparent 64%)' : 'radial-gradient(900px 500px at 78% -12%,rgba(38,126,151,.22),transparent 64%),radial-gradient(700px 500px at -8% 45%,rgba(47,80,157,.14),transparent 60%)', 'important');
      document.body.style.setProperty('background-color', theme === 'light' ? '#f3f8fa' : '#071421', 'important');
      document.body.style.setProperty('color', theme === 'light' ? '#102b43' : '#f2fbfd', 'important');
    }
    let style = document.getElementById('gcCustomerAppThemeStyle');
    if (!style) { style = document.createElement('style'); style.id = 'gcCustomerAppThemeStyle'; document.head.appendChild(style); }
    style.textContent = theme === 'light'
      ? 'html[data-gc-theme="light"] body.gc-customer-app{background-image:radial-gradient(900px 500px at 78% -12%,rgba(88,229,239,.18),transparent 64%)!important;background-color:#f3f8fa!important;color:#102b43!important}html[data-gc-theme="light"] body.gc-customer-app .metric-card,html[data-gc-theme="light"] body.gc-customer-app .metric-card strong,html[data-gc-theme="light"] body.gc-customer-app .surface-card,html[data-gc-theme="light"] body.gc-customer-app .surface-card h2,html[data-gc-theme="light"] body.gc-customer-app .surface-card h3,html[data-gc-theme="light"] body.gc-customer-app .surface-card strong{color:#102b43!important}html[data-gc-theme="light"] body.gc-customer-app .metric-card>div>span,html[data-gc-theme="light"] body.gc-customer-app .muted{color:#668092!important}'
      : 'html[data-gc-theme="dark"] body.gc-customer-app{background-color:#071421!important;color:#f2fbfd!important}html[data-gc-theme="dark"] body.gc-customer-app .metric-card,html[data-gc-theme="dark"] body.gc-customer-app .surface-card{color:#f2fbfd!important}';
  };
  const applyTheme = (theme) => {
    const next = theme === 'light' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    if (typeof window.gcSetTheme === 'function') window.gcSetTheme(next);
    else {
      document.documentElement.dataset.gcTheme = next;
      document.documentElement.dataset.theme = next === 'light' ? 'light' : '';
      document.documentElement.style.colorScheme = next;
    }
    syncAppTheme(next);
    const button = document.querySelector('[data-dashboard-theme]');
    if (button) {
      button.innerHTML = icons[next === 'dark' ? 'sun' : 'moon'] + `<span>${copy[currentLang()].labels[next === 'dark' ? 'light' : 'dark']}</span>`;
      button.setAttribute('aria-label', copy[currentLang()].labels[next === 'dark' ? 'light' : 'dark']);
    }
  };
  const applyLanguage = (lang) => {
    const next = validLang(lang);
    const labels = copy[next].labels;
    localStorage.setItem(LANG_KEY, next);
    document.documentElement.lang = next;
    document.documentElement.dir = copy[next].dir;
    document.querySelectorAll('[data-dash-i18n]').forEach((el) => {
      const key = el.dataset.dashI18n;
      if (labels[key]) el.textContent = labels[key];
    });
    const select = document.querySelector('[data-dashboard-language]');
    if (select) select.value = next;
    document.querySelectorAll('body.gc-customer-app .mobile-dock [data-dock-tab]').forEach((item) => {
      const key = item.dataset.dockTab === 'requests' ? 'request' : item.dataset.dockTab;
      if (labels[key]) item.setAttribute('aria-label', labels[key]);
    });
    applyTheme(currentTheme());
  };
  const mountIcons = (root = document) => {
    root.querySelectorAll('[data-dash-icon]').forEach((node) => {
      const key = node.dataset.dashIcon;
      if (!icons[key] || node.dataset.gcDashIconReady === key) return;
      node.innerHTML = icons[key];
      node.dataset.gcDashIconReady = key;
    });
  };

  const initMobileDock = () => {
    const dock = document.querySelector('#gcCustomerWorkspace .mobile-dock, body.gc-customer-app .mobile-dock');
    const main = document.querySelector('#gcCustomerWorkspace .app-main, body.gc-customer-app .app-main');
    if (!dock || !main || dock.dataset.gcDockReady === '1') return;
    dock.dataset.gcDockReady = '1';
    const items = [...dock.querySelectorAll('[data-dock-tab]')];
    const allSections = () => [...main.querySelectorAll(':scope > section')];
    const viewGroups = {
      home: ['workspace-toolbar', 'overview', 'homeMetrics', 'gcCustomerRouteOverview'],
      shipments: ['shipmentsSection', 'records'],
      requests: ['quotesPanel', 'commercial', 'newRequest'],
      notifications: ['activity'],
      settings: ['gcAccountSettings'],
    };
    const hashToTab = {
      '#overview':'home', '#homeMetrics':'home', '#gcCustomerRouteOverview':'home', '#auth':'home', '#register':'home',
      '#shipmentsSection':'shipments', '#shipments':'shipments',
      '#newRequest':'requests', '#quoteForm':'requests', '#commercial':'requests', '#quotesPanel':'requests',
      '#activity':'notifications', '#notifications':'notifications',
      '#records':'shipments', '#payments':'shipments',
      '#gcAccountSettings':'settings', '#settings':'settings', '#support':'requests'
    };
    const viewHash = {
      home:'#overview', shipments:'#shipmentsSection', requests:'#newRequest',
      notifications:'#activity', settings:'#gcAccountSettings'
    };
    const activate = (requestedKey, options = {}) => {
      const key = requestedKey === 'support' ? 'requests' : (viewGroups[requestedKey] ? requestedKey : 'home');
      const nextHash = options.hash || (requestedKey === 'support' ? '#support' : (viewHash[key] || '#overview'));
      if (options.enterMode === true && !document.body.classList.contains('gc-customer-app') && typeof window.gcEnterCustomerMode === 'function') {
        window.gcEnterCustomerMode({view:key, hash:nextHash});
      }
      const visible = new Set(nextHash === '#support' ? ['support'] : viewGroups[key]);
      allSections().forEach(section => {
        const show = visible.has(section.id) || visible.has(section.classList.contains('workspace-toolbar') ? 'workspace-toolbar' : '');
        section.classList.toggle('gc-customer-view-hidden', !show);
        section.setAttribute('aria-hidden', String(!show));
      });
      document.body.dataset.gcCustomerView = key;
      items.forEach(item => {
        const itemKey = key;
        const active = item.dataset.dockTab === itemKey;
        item.classList.toggle('active', active);
        if (active) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
      if (options.writeHash !== false) {
        if (nextHash && window.location.hash !== nextHash) history.pushState({gcCustomerView:key}, '', nextHash);
      }
      if (options.scroll !== false) window.scrollTo({top:0, behavior:'auto'});
      window.dispatchEvent(new CustomEvent('gc:customer-view-changed', {detail:{key}}));
    };
    const keyForHash = hash => hashToTab[hash] || 'home';

    // The dock is a set of separate application views, not scroll anchors.
    items.forEach(item => {
      item.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const key = item.dataset.dockTab || 'home';
        activate(key, {hash:viewHash[key], enterMode:true});
      });
    });

    // Preserve direct links and the desktop side-navigation, but show only one view.
    document.querySelectorAll('#gcCustomerWorkspace .app-side-nav a[href^="#"]').forEach(link => {
      link.addEventListener('click', event => {
        const hash = link.getAttribute('href') || '#overview';
        const key = keyForHash(hash);
        event.preventDefault();
        activate(key, {hash, enterMode:true});
      });
    });
    window.addEventListener('hashchange', () => activate(keyForHash(window.location.hash), {writeHash:false}));
    window.addEventListener('popstate', () => activate(keyForHash(window.location.hash), {writeHash:false}));
    window.gcSelectCustomerView = (key) => activate(key, {enterMode:true});

    // Keep unread counts on the Notifications tab, not on Home.
    const notificationsItem = items.find(item => item.dataset.dockTab === 'notifications');
    const iconWrap = notificationsItem?.querySelector('[data-dash-icon="notifications"]');
    let badge = notificationsItem?.querySelector('[data-dock-unread]');
    if (notificationsItem && iconWrap && !badge) {
      badge = document.createElement('span');
      badge.dataset.dockUnread = '1';
      badge.className = 'dock-unread-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.hidden = true;
      iconWrap.appendChild(badge);
    }
    const updateUnread = notifications => {
      const count = (Array.isArray(notifications) ? notifications : []).filter(item => !item?.read_at).length;
      if (badge) { badge.hidden = count < 1; badge.textContent = count > 9 ? '9+' : String(count); }
      if (notificationsItem) {
        const labels = copy[currentLang()].labels;
        const notificationsLabel = labels.notifications || 'Notifications';
        notificationsItem.setAttribute('aria-label', count ? notificationsLabel + ', ' + count + ' unread' : notificationsLabel);
      }
    };
    window.addEventListener('gc:customer-loaded', event => updateUnread(event.detail?.notifications));
    updateUnread(window.__customerNotifications || []);
    activate(keyForHash(window.location.hash), {writeHash:false, scroll:false});
  };
  const mount = () => {
    mountIcons();
    initMobileDock();
    document.querySelector('[data-dashboard-theme]')?.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
    document.querySelector('[data-dashboard-language]')?.addEventListener('change', (event) => applyLanguage(event.target.value));
    applyLanguage(currentLang());
    applyTheme(currentTheme());
    window.gcDashboardSetLanguage = applyLanguage;
    window.gcDashboardSetTheme = applyTheme;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
