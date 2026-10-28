/* Globall Cloud — keep one authoritative GC registration flow. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const mount = () => {
    const auth = $('#auth');
    const signIn = $('#signIn');
    if (!auth || !signIn || $('#gcCreateAccount')) return;
    const box = auth.querySelector('.box');
    if (!box) return;
    const link = document.createElement('a');
    link.id = 'gcCreateAccount';
    link.className = 'btn';
    link.href = '/register.html';
    link.textContent = 'دروستکردنی هەژماری نوێ';
    link.style.display = 'inline-flex';
    link.style.alignItems = 'center';
    link.style.justifyContent = 'center';
    link.style.marginTop = '10px';
    box.appendChild(link);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
