/* Globall Cloud — universal settings and account hub. */
(() => {
  'use strict';
  const LANG_KEY = 'gc-language';
  const labels = {
    ckb: { name: 'کوردی', dir: 'rtl', title: 'ڕێکخستن', language: 'زمان', theme: 'دۆخی نمایش', dark: 'تاریک', light: 'ڕووناک', account: 'هەژمار و پاراستن', login: 'چوونەژوورەوە', register: 'دانانی هەژمار', profile: 'پڕۆفایل و پاراستن', close: 'داخستن', workspace: 'شوێنی کار و دەستگەیشتن', customer: 'هەژماری کڕیار', staff: 'کۆنسۆڵی ستاف', saved: 'ڕێکخستنەکان لە هەموو سایتەکەدا پاشەکەوت کران.' },
    ar: { name: 'العربية', dir: 'rtl', title: 'الإعدادات', language: 'اللغة', theme: 'المظهر', dark: 'داكن', light: 'فاتح', account: 'الحساب والأمان', login: 'تسجيل الدخول', register: 'إنشاء حساب', profile: 'الملف الشخصي والأمان', close: 'إغلاق', workspace: 'مساحات العمل والوصول', customer: 'حساب العميل', staff: 'لوحة الموظفين', saved: 'تم حفظ الإعدادات في جميع صفحات الموقع.' },
    en: { name: 'English', dir: 'ltr', title: 'Settings', language: 'Language', theme: 'Appearance', dark: 'Dark', light: 'Light', account: 'Account & security', login: 'Sign in', register: 'Create account', profile: 'Profile & security', close: 'Close', workspace: 'Workspaces & access', customer: 'Customer account', staff: 'Staff console', saved: 'Settings are saved across the site.' }
  };
  const validLang = value => Object.prototype.hasOwnProperty.call(labels, value) ? value : 'ckb';
  const getLang = () => validLang(window.localStorage?.getItem(LANG_KEY));
  const applyLanguage = (lang) => {
    const next = validLang(lang);
    const copy = labels[next];
    document.documentElement.lang = next;
    document.documentElement.dir = copy.dir;
    window.localStorage?.setItem(LANG_KEY, next);
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
  };
  const getTheme = () => document.documentElement.dataset.gcTheme || window.localStorage?.getItem('gc-theme') || 'dark';
  const applyTheme = (theme) => {
    if (typeof window.gcSetTheme === 'function') window.gcSetTheme(theme);
    else {
      const next = theme === 'light' ? 'light' : 'dark';
      document.documentElement.dataset.gcTheme = next;
      window.localStorage?.setItem('gc-theme', next);
    }
    const select = document.querySelector('[data-gc-settings-theme]');
    if (select) select.value = theme === 'light' ? 'light' : 'dark';
  };
  const mount = () => {
    if (document.querySelector('[data-gc-settings-root]')) return;
    const lang = getLang();
    const copy = labels[lang];
    const root = document.createElement('div');
    root.dataset.gcSettingsRoot = '1';
    root.innerHTML = `<button type="button" class="gc-settings-trigger" data-gc-settings-trigger aria-expanded="false" aria-controls="gcSettingsPanel" data-gc-settings-aria-label="title" aria-label="${copy.title}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4"/><circle cx="12" cy="12" r="4"/></svg></button><aside class="gc-settings-panel" id="gcSettingsPanel" hidden><div class="gc-settings-head"><div><strong data-gc-settings-label="title">${copy.title}</strong><small>Globall Cloud</small></div><button type="button" class="gc-settings-close" data-gc-settings-close data-gc-settings-aria-label="close" aria-label="${copy.close}">×</button></div><div class="gc-settings-group"><label data-gc-settings-label="language">${copy.language}</label><select data-gc-settings-language data-gc-settings-aria-label="language" aria-label="${copy.language}"><option value="ckb">کوردی</option><option value="ar">العربية</option><option value="en">English</option></select></div><div class="gc-settings-group"><label data-gc-settings-label="theme">${copy.theme}</label><select data-gc-settings-theme data-gc-settings-aria-label="theme" aria-label="${copy.theme}"><option value="dark" data-gc-settings-label="dark">${copy.dark}</option><option value="light" data-gc-settings-label="light">${copy.light}</option></select></div><div class="gc-settings-account"><span data-gc-settings-label="account">${copy.account}</span><a href="/customer-portal.html#auth" data-gc-settings-label="login">${copy.login}</a><a href="/customer-portal.html#register" data-gc-settings-label="register">${copy.register}</a><a href="/customer-portal.html#gcAccountSettings" data-gc-settings-label="profile">${copy.profile}</a></div><div class="gc-settings-account gc-settings-workspaces"><span data-gc-settings-label="workspace">${copy.workspace}</span><a href="/dashboard" data-gc-settings-label="customer">${copy.customer}</a><a href="/staff" data-gc-settings-label="staff">${copy.staff}</a></div><p class="gc-settings-saved" data-gc-settings-label="saved">${copy.saved}</p></aside>`;
    document.body.appendChild(root);
    const panel = root.querySelector('[data-gc-settings-panel]') || root.querySelector('#gcSettingsPanel');
    const trigger = root.querySelector('[data-gc-settings-trigger]');
    const close = root.querySelector('[data-gc-settings-close]');
    const setOpen = open => { panel.hidden = !open; trigger.setAttribute('aria-expanded', String(open)); if (open) panel.querySelector('select')?.focus(); };
    trigger.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
    document.addEventListener('click', event => { if (!root.contains(event.target)) setOpen(false); });
    root.querySelector('[data-gc-settings-language]').addEventListener('change', event => applyLanguage(event.target.value));
    root.querySelector('[data-gc-settings-theme]').addEventListener('change', event => applyTheme(event.target.value));
    applyLanguage(lang);
    applyTheme(getTheme());
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
