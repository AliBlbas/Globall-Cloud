/* Globall Cloud — dashboard controls, icons, language, and theme bridge. */
(() => {
  'use strict';
  const LANG_KEY = 'gc-language';
  const THEME_KEY = 'gc-theme';
  const icons = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-7 8 7v10H4z"/><path d="M9 20v-6h6v6"/></svg>',
    shipments: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18v13H3z"/><path d="M7 7V4h10v3"/><path d="M7 12h10"/></svg>',
    quote: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    rates: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-8M22 19H2"/></svg>',
    support: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/></svg>',
    sales: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/><path d="m15 16 2 2 4-4"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.4A8.5 8.5 0 0 1 8.6 4 8.5 8.5 0 1 0 20 15.4Z"/></svg>',
    language: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9c-2.2-2.4-3.3-5.4-3.3-9S9.8 5.4 12 3Z"/></svg>'
  };
  const copy = {
    ckb: { dir: 'rtl', labels: { home: 'سەرەتا', shipments: 'بارەکان', quote: 'داواکاری', rates: 'نرخەکان', support: 'پشتیوانی', sales: 'فرۆشتن و نرخ', theme: 'دۆخی ڕووناکی', language: 'زمان', dark: 'تاریک', light: 'ڕووناک' } },
    ar: { dir: 'rtl', labels: { home: 'الرئيسية', shipments: 'الشحنات', quote: 'طلب سعر', rates: 'الأسعار', support: 'الدعم', sales: 'المبيعات والأسعار', theme: 'المظهر', language: 'اللغة', dark: 'داكن', light: 'فاتح' } },
    en: { dir: 'ltr', labels: { home: 'Home', shipments: 'Shipments', quote: 'New quote', rates: 'Rates', support: 'Support', sales: 'Sales & rates', theme: 'Appearance', language: 'Language', dark: 'Dark', light: 'Light' } }
  };
  const validLang = (lang) => copy[lang] ? lang : 'ckb';
  const currentLang = () => validLang(localStorage.getItem(LANG_KEY) || document.documentElement.lang || 'ckb');
  const currentTheme = () => localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  const syncAppTheme = (theme) => {
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
    applyTheme(currentTheme());
  };
  const mountIcons = () => {
    document.querySelectorAll('[data-dash-icon]').forEach((el) => {
      const key = el.dataset.dashIcon;
      if (icons[key]) el.innerHTML = icons[key];
    });
  };
  const mount = () => {
    mountIcons();
    document.querySelector('[data-dashboard-theme]')?.addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
    document.querySelector('[data-dashboard-language]')?.addEventListener('change', (event) => applyLanguage(event.target.value));
    applyLanguage(currentLang());
    applyTheme(currentTheme());
    window.gcDashboardSetLanguage = applyLanguage;
    window.gcDashboardSetTheme = applyTheme;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
