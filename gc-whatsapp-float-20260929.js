/* Globall Cloud — WhatsApp contact CTA. Uses wa.me handoff; no secret API token is exposed. */
(() => {
  'use strict';
  const NUMBER = '9647507577137';
  const DEFAULT_TEXT = 'سڵاو Globall Cloud 👋 دەمەوێت یارمەتی بەدواداچوون';
  const path = `${location.pathname}${location.search}`;
  const isTracking = /tracking|track/i.test(path);
  const text = isTracking
    ? 'سڵاو Globall Cloud 👋 دەمەوێت یارمەتی بەدواداچوونی بارەکەم وەربگرم.'
    : DEFAULT_TEXT;
  if (document.getElementById('gcWhatsAppFloat')) return;
  const a = document.createElement('a');
  a.id = 'gcWhatsAppFloat';
  a.className = 'gc-whatsapp-float';
  a.href = `https://wa.me/${NUMBER}?text=${encodeURIComponent(text)}`;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', 'پەیوەندی بە Globall Cloud لە WhatsApp');
  a.title = 'پەیوەندی بە Globall Cloud لە WhatsApp';
  a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .4 5.2.4 11.7c0 2.1.6 4.1 1.7 5.9L.3 23.8l6.4-1.7a11.7 11.7 0 0 0 5.4 1.3h.1c6.4 0 11.7-5.2 11.7-11.7 0-3.1-1.2-6-3.4-8.2ZM12.1 21.3c-1.7 0-3.3-.5-4.8-1.3l-.3-.2-3.8 1 1-3.7-.2-.4a9.6 9.6 0 1 1 8.1 4.6Zm5.3-7.2c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2l-.8 1c-.2.2-.4.3-.7.1-2-.9-3.3-1.7-4.6-3.9-.4-.6.4-.6 1.1-2 0-.2 0-.4-.1-.6l-.6-1.5c-.2-.4-.4-.4-.7-.4h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.4c.2.2 2.4 3.7 5.8 5.1 2.1.9 2.9 1 3.9.8.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.1-1.4-.1-.1-.3-.2-.6-.3Z"/></svg><span>WhatsApp</span>';
  const style = document.createElement('style');
  style.textContent = `.gc-whatsapp-float{position:fixed;inset-inline-start:18px;bottom:22px;z-index:4800;display:inline-flex;align-items:center;gap:8px;padding:0 15px 0 12px;height:52px;border:1px solid rgba(212,175,55,.6);border-radius:999px;background:linear-gradient(135deg,#f3d27a,#d4af37);color:#101a2d;text-decoration:none;font:900 12px/1 Vazirmatn,system-ui,sans-serif;box-shadow:0 16px 35px rgba(0,0,0,.35),0 0 0 5px rgba(212,175,55,.08);transition:transform .18s ease,box-shadow .18s ease}.gc-whatsapp-float svg{width:25px;height:25px;fill:currentColor}.gc-whatsapp-float:hover{transform:translateY(-3px);box-shadow:0 20px 42px rgba(0,0,0,.42),0 0 0 6px rgba(212,175,55,.13)}.gc-whatsapp-float:active{transform:scale(.97)}@media(max-width:760px){.gc-whatsapp-float{bottom:calc(116px + env(safe-area-inset-bottom));inset-inline-start:12px;height:48px;padding-inline:11px;font-size:11px}}@media(max-width:430px){.gc-whatsapp-float{width:48px;padding:0;justify-content:center}.gc-whatsapp-float span{display:none}}@media(prefers-reduced-motion:reduce){.gc-whatsapp-float{transition:none}}`;
  document.head.appendChild(style);
  document.body.appendChild(a);
})();
