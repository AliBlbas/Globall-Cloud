/* Globall Cloud — customer-only settings center.
   Login/logout are delegated to the existing customer auth controls; language and
   theme changes are delegated to the customer dashboard controller. */
(() => {
  'use strict';
  const LANG_KEY = 'gc-language';
  const THEME_KEY = 'gc-theme';
  const labels = {
    ckb: { dir:'rtl', title:'ڕێکخستن', language:'زمان', theme:'دۆخی نمایش', dark:'تاریک', light:'ڕووناک', account:'هەژمار و چوونەژوورەوە', login:'چوونەژوورەوە', logout:'دەرچوون', profile:'پڕۆفایل و پاراستن', payments:'بەڵگە و پارەدان', support:'پشتیوانی', close:'داخستن', saved:'گۆڕانکارییەکانی زمان و دۆخی نمایش لەسەر هەمان هەژمار بەکاردێن.' },
    ar: { dir:'rtl', title:'الإعدادات', language:'اللغة', theme:'المظهر', dark:'داكن', light:'فاتح', account:'الحساب وتسجيل الدخول', login:'تسجيل الدخول', logout:'تسجيل الخروج', profile:'الملف الشخصي والأمان', payments:'المستندات والمدفوعات', support:'الدعم', close:'إغلاق', saved:'يتم تطبيق اللغة والمظهر في مساحة العميل.' },
    en: { dir:'ltr', title:'Settings', language:'Language', theme:'Appearance', dark:'Dark', light:'Light', account:'Account & sign-in', login:'Sign in', logout:'Sign out', profile:'Profile & security', payments:'Documents & payments', support:'Support', close:'Close', saved:'Language and appearance are applied to the customer workspace.' }
  };
  const validLang = value => Object.prototype.hasOwnProperty.call(labels, value) ? value : 'ckb';
  const getLang = () => validLang(window.localStorage?.getItem(LANG_KEY) || document.documentElement.lang);
  const getTheme = () => document.documentElement.dataset.gcTheme || window.localStorage?.getItem(THEME_KEY) || 'dark';
  const applyLanguage = value => {
    const next = validLang(value);
    const copy = labels[next];
    document.documentElement.lang = next;
    document.documentElement.dir = copy.dir;
    try { window.localStorage?.setItem(LANG_KEY, next); } catch (_) {}
    document.querySelectorAll('[data-gc-settings-label]').forEach(el => {
      const key = el.dataset.gcSettingsLabel;
      if (copy[key]) el.textContent = copy[key];
    });
    document.querySelectorAll('[data-gc-settings-aria-label]').forEach(el => {
      const key = el.dataset.gcSettingsAriaLabel;
      if (copy[key]) el.setAttribute('aria-label', copy[key]);
    });
    const select = document.querySelector('[data-gc-settings-language]');
    if (select) select.value = next;
    if (document.body?.classList.contains('gc-customer-app') && typeof window.gcDashboardSetLanguage === 'function') {
      window.gcDashboardSetLanguage(next);
    }
    syncAuthAction();
  };
  const applyTheme = value => {
    const next = value === 'light' ? 'light' : 'dark';
    try { window.localStorage?.setItem(THEME_KEY, next); } catch (_) {}
    if (document.body?.classList.contains('gc-customer-app') && typeof window.gcDashboardSetTheme === 'function') {
      window.gcDashboardSetTheme(next);
    } else if (typeof window.gcSetTheme === 'function') {
      window.gcSetTheme(next);
    } else {
      document.documentElement.dataset.gcTheme = next;
      document.documentElement.dataset.theme = next === 'light' ? 'light' : '';
      document.documentElement.style.colorScheme = next;
    }
    const select = document.querySelector('[data-gc-settings-theme]');
    if (select) select.value = next;
  };
  let panel = null;
  let trigger = null;
  let authAction = null;
  let observer = null;
  const setOpen = open => {
    if (!panel || !trigger) return;
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('gc-settings-open', Boolean(open));
    if (open) panel.querySelector('[data-gc-settings-language]')?.focus();
  };
  const syncAuthAction = () => {
    if (!authAction) return;
    const loginButton = document.getElementById('loginBtn');
    const logoutButton = document.getElementById('logoutBtn');
    const isLoggedIn = Boolean(loginButton?.classList.contains('hidden') && !logoutButton?.classList.contains('hidden'));
    const copy = labels[getLang()];
    authAction.dataset.action = isLoggedIn ? 'logout' : 'login';
    authAction.textContent = isLoggedIn ? copy.logout : copy.login;
    authAction.setAttribute('aria-label', authAction.textContent);
  };
  const mount = () => {
    // Settings belong to the customer console, not the public homepage.
    if (!document.body?.classList.contains('gc-customer-app')) return;
    if (document.querySelector('[data-gc-settings-root]')) return;
    const copy = labels[getLang()];
    const root = document.createElement('div');
    root.dataset.gcSettingsRoot = '1';
    root.innerHTML =
      '<button type="button" class="gc-settings-trigger" data-gc-settings-trigger aria-expanded="false" aria-controls="gcSettingsPanel" data-gc-settings-aria-label="title" aria-label="' + copy.title + '"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19 13.5a7.5 7.5 0 0 0 0-3l2-1.2-2-3.4-2.2.8a7.4 7.4 0 0 0-2.5-1.4L14 3h-4l-.3 2.3a7.4 7.4 0 0 0-2.5 1.4L5 5.9 3 9.3 5 10.5a7.5 7.5 0 0 0 0 3l-2 1.2 2 3.4 2.2-.8a7.4 7.4 0 0 0 2.5 1.4L10 21h4l.3-2.3a7.4 7.4 0 0 0 2.5-1.4l2.2.8 2-3.4-2-1.2Z"></path></svg></button>' +
      '<aside class="gc-settings-panel" id="gcSettingsPanel" hidden role="dialog" aria-modal="false" aria-labelledby="gcSettingsTitle">' +
        '<div class="gc-settings-head"><div><strong id="gcSettingsTitle" data-gc-settings-label="title">' + copy.title + '</strong><small>GLOBALL CLOUD · CUSTOMER</small></div>' +
          '<button type="button" class="gc-settings-close" data-gc-settings-close data-gc-settings-aria-label="close" aria-label="' + copy.close + '">×</button></div>' +
        '<div class="gc-settings-group"><label data-gc-settings-label="language" for="gcSettingsLanguage">زمان</label>' +
          '<select id="gcSettingsLanguage" data-gc-settings-language data-gc-settings-aria-label="language" aria-label="' + copy.language + '">' +
            '<option value="ckb">کوردی</option><option value="ar">العربية</option><option value="en">English</option></select></div>' +
        '<div class="gc-settings-group"><label data-gc-settings-label="theme" for="gcSettingsTheme">دۆخی نمایش</label>' +
          '<select id="gcSettingsTheme" data-gc-settings-theme data-gc-settings-aria-label="theme" aria-label="' + copy.theme + '">' +
            '<option value="dark" data-gc-settings-label="dark">تاریک</option><option value="light" data-gc-settings-label="light">ڕووناک</option></select></div>' +
        '<div class="gc-settings-account"><span data-gc-settings-label="account">' + copy.account + '</span>' +
          '<button type="button" class="gc-settings-auth-action" data-gc-settings-auth-action></button>' +
          '<a href="#gcAccountSettings" data-gc-settings-jump data-gc-settings-label="profile">' + copy.profile + '</a>' +
          '<a href="#records" data-gc-settings-jump data-gc-settings-label="payments">' + copy.payments + '</a>' +
          '<a href="#support" data-gc-settings-jump data-gc-settings-label="support">' + copy.support + '</a></div>' +
        '<p class="gc-settings-saved" data-gc-settings-label="saved">' + copy.saved + '</p>' +
      '</aside>';
    document.body.appendChild(root);
    panel = root.querySelector('#gcSettingsPanel');
    trigger = root.querySelector('[data-gc-settings-trigger]');
    authAction = root.querySelector('[data-gc-settings-auth-action]');
    root.querySelector('[data-gc-settings-close]')?.addEventListener('click', () => setOpen(false));
    trigger.addEventListener('click', () => setOpen(panel.hidden));
    authAction.addEventListener('click', () => {
      const action = authAction.dataset.action;
      setOpen(false);
      const target = document.getElementById(action === 'logout' ? 'logoutBtn' : 'loginBtn');
      if (target) target.click();
    });
    root.querySelector('[data-gc-settings-language]')?.addEventListener('change', event => applyLanguage(event.target.value));
    root.querySelector('[data-gc-settings-theme]')?.addEventListener('change', event => applyTheme(event.target.value));
    root.querySelectorAll('[data-gc-settings-jump]').forEach(link => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
    document.addEventListener('click', event => { if (!root.contains(event.target) && !event.target.closest?.('[data-dock-tab="settings"]')) setOpen(false); });
    window.addEventListener('gc:customer-loaded', syncAuthAction);
    const loginButton = document.getElementById('loginBtn');
    const logoutButton = document.getElementById('logoutBtn');
    if ('MutationObserver' in window && (loginButton || logoutButton)) {
      observer = new MutationObserver(syncAuthAction);
      [loginButton, logoutButton].filter(Boolean).forEach(button => observer.observe(button, { attributes:true, attributeFilter:['class'] }));
    }
    applyLanguage(getLang());
    applyTheme(getTheme());
    syncAuthAction();
    window.gcOpenSettings = () => setOpen(true);
    window.gcCloseSettings = () => setOpen(false);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once:true });
  else mount();
})();
