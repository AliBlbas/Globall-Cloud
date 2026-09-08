/* Globall Cloud Staff OS — shell polish + navigation affordances */
(() => {
  'use strict';
  if (window.__gcStaffShellPolish) return;
  window.__gcStaffShellPolish = true;

  function addBackLink() {
    const actions = document.querySelector('.top-actions');
    if (!actions || document.getElementById('gcBackToSite')) return;
    const a = document.createElement('a');
    a.id = 'gcBackToSite';
    a.className = 'btn ghost';
    a.href = '/';
    a.textContent = '↩ گەڕانەوە بۆ سایت';
    a.setAttribute('aria-label','گەڕانەوە بۆ سایت');
    actions.insertBefore(a, actions.firstChild);
  }

  function addLoginBack() {
    const card = document.querySelector('.login-card');
    if (!card || document.getElementById('gcLoginBack')) return;
    const a = document.createElement('a');
    a.id = 'gcLoginBack';
    a.href = '/';
    a.textContent = '← گەڕانەوە بۆ ماڵپەڕ';
    a.style.cssText = 'display:flex;justify-content:center;margin-top:12px;color:#8facbf;font-size:10px;font-weight:800;';
    card.appendChild(a);
  }

  function labelPage() {
    const title = document.getElementById('pageTitle');
    if (!title) return;
    title.setAttribute('aria-live','polite');
  }

  function install(){
    addBackLink();
    addLoginBack();
    labelPage();
  }

  const observer = new MutationObserver(install);
  observer.observe(document.body,{subtree:true,childList:true});
  install();
  window.setTimeout(()=>observer.disconnect(),120000);
})();
