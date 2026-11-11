/* Staff Console appearance preferences — visual-only, backend-safe. */
(() => {
  'use strict';

  const THEME = 'gc-staff-theme';
  const readTheme = () => {
    try {
      return localStorage.getItem(THEME) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  };
  const saveTheme = (theme) => {
    try {
      localStorage.setItem(THEME, theme);
    } catch {
      // The current page still changes theme when storage is unavailable.
    }
  };
  const apply = (theme) => {
    const next = theme === 'light' ? 'light' : 'dark';
    const root = document.documentElement;
    saveTheme(next);
    // Older command-deck rules use data-staff-theme; newer theme layers use
    // data-gc-theme. Keep both attributes synchronized so every CSS layer flips.
    root.dataset.staffTheme = next;
    root.dataset.gcTheme = next;
    root.style.colorScheme = next;

    const button = document.querySelector('button[data-staff-theme]');
    if (button) {
      button.textContent = next === 'dark' ? '☼ ڕووناک' : '☾ تاریک';
      button.setAttribute('aria-label', next === 'dark' ? 'گۆڕین بۆ دۆخی ڕووناک' : 'گۆڕین بۆ دۆخی تاریک');
      button.setAttribute('aria-pressed', String(next === 'light'));
      button.title = next === 'dark' ? 'گۆڕین بۆ دۆخی ڕووناک' : 'گۆڕین بۆ دۆخی تاریک';
    }
  };

  const mount = () => {
    const shell = document.querySelector('.gc-shell');
    const top = shell?.querySelector('.top-actions');
    if (!top) return;

    let button = top.querySelector('button[data-staff-theme]');
    if (!button) {
      button = document.createElement('button');
      button.className = 'btn gc-global-theme-toggle';
      button.dataset.staffTheme = '1';
      button.type = 'button';
      top.insertBefore(button, top.firstChild);
    }

    if (button.dataset.themeBound !== '1') {
      button.dataset.themeBound = '1';
      button.addEventListener('click', () => {
        const current = document.documentElement.dataset.gcTheme || readTheme();
        apply(current === 'light' ? 'dark' : 'light');
      });
    }
    apply(readTheme());
  };

  const observer = new MutationObserver(mount);
  observer.observe(document.body, { childList: true, subtree: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
