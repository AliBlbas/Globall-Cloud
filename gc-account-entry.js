/* Globall Cloud — customer sign-in entry helper.
 * Customer provisioning is staff-only: this module intentionally does not expose
 * Supabase signUp or a public registration flow.
 */
(() => {
  'use strict';
  const mount = () => {
    const auth = document.querySelector('#auth');
    const signIn = document.querySelector('#signIn');
    if (!auth || !signIn) return;
    const email = document.querySelector('#email');
    if (email) {
      email.setAttribute('inputmode', 'text');
      email.setAttribute('autocomplete', 'username');
      email.setAttribute('placeholder', 'GC-833');
    }
    if (location.hash === '#auth' || location.hash === '#register') {
      auth.classList.remove('hidden');
      const message = document.querySelector('#msg');
      if (message) message.textContent = 'کۆدی GC و وشەی نهێنی لەلایەن ستافەوە پێت دەدرێت.';
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
