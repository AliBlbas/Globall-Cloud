/* Globall Cloud — shared light/dark theme controller. */
(() => {
  'use strict';
  const STORAGE_KEY = 'gc-theme';
  const root = document.documentElement;
  const getTheme = () => {
    const saved = window.localStorage?.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  };
  const applyTheme = (theme) => {
    const next = theme === 'light' ? 'light' : 'dark';
    root.dataset.gcTheme = next;
    root.style.colorScheme = next;
    window.localStorage?.setItem(STORAGE_KEY, next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'light' ? '#f4f8fb' : '#061326');
    const button = document.querySelector('[data-gc-theme-toggle]');
    if (button) {
      button.textContent = next === 'light' ? '☾' : '☼';
      button.setAttribute('aria-label', next === 'light' ? 'گۆڕین بۆ دۆخی تاریک' : 'گۆڕین بۆ دۆخی ڕووناک');
      button.setAttribute('title', next === 'light' ? 'دۆخی تاریک' : 'دۆخی ڕووناک');
      button.dataset.theme = next;
    }
  };
  const mount = () => {
    let button = document.querySelector('[data-gc-theme-toggle]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.dataset.gcThemeToggle = '1';
      button.className = 'gc-global-theme-toggle';
      button.addEventListener('click', () => applyTheme(root.dataset.gcTheme === 'light' ? 'dark' : 'light'));
      (document.querySelector('.gc-nav-actions, .top-actions, .topin, .topbar, header') || document.body).appendChild(button);
    }
    applyTheme(root.dataset.gcTheme || getTheme());
  };
  root.dataset.gcTheme = getTheme();
  root.style.colorScheme = root.dataset.gcTheme;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
