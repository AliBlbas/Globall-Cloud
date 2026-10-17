(() => {
  'use strict';
  if (window.__gcStaffCartonTools20261017) return;
  window.__gcStaffCartonTools20261017 = true;

  function node(doc, tag, className, text) {
    const item = doc.createElement(tag);
    if (className) item.className = className;
    if (text != null) item.textContent = String(text);
    return item;
  }

  function printLabels(card) {
    const rows = [...card.querySelectorAll('.warehouse-carton-row')].map((row) => {
      const code = row.querySelector('.mono')?.textContent?.trim() || '';
      const meta = [...row.querySelectorAll('small')].map((item) => item.textContent.trim()).filter(Boolean);
      return { code, meta: meta.join(' · ') };
    }).filter((item) => item.code);
    if (!rows.length) return;
    const popup = window.open('', '_blank');
    if (!popup) {
      const toast = document.getElementById('gcToast');
      if (toast) { toast.textContent = 'Pop-ups چالاک بکە بۆ چاپکردنی لیبێڵەکان'; toast.dataset.kind = 'bad'; }
      return;
    }
    const doc = popup.document;
    doc.open();
    doc.write('<!doctype html><html lang="ckb" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GC Carton Labels</title></head><body></body></html>');
    doc.close();
    const style = node(doc, 'style', '', 'body{font-family:Arial,sans-serif;margin:14px;color:#102638}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.label{border:1px solid #9cb7c8;border-radius:10px;padding:12px;break-inside:avoid;min-width:0}.brand{font-size:9px;letter-spacing:1px;color:#476a80}.gc{font-size:22px;font-weight:900;margin:8px 0}.code{display:block;font:800 12px monospace;overflow-wrap:anywhere}.meta{font-size:10px;margin-top:5px;color:#496578}svg{display:block;max-width:100%;height:64px;margin:5px auto}@media print{.grid{gap:7px}.label{border:1px solid #555}}');
    doc.head.appendChild(style);
    const root = node(doc, 'main', 'grid');
    rows.forEach((row, index) => {
      const label = node(doc, 'article', 'label');
      const gcCode = row.code.replace(/-[A-F0-9]{12}-C\\d+$/i, '');
      label.appendChild(node(doc, 'div', 'brand', 'GLOBALL CLOUD · WAREHOUSE'));
      label.appendChild(node(doc, 'div', 'gc', gcCode || 'GC'));
      const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'gc-carton-barcode-' + index;
      svg.setAttribute('aria-label', 'Carton barcode');
      label.appendChild(svg);
      label.appendChild(node(doc, 'strong', 'code', row.code));
      label.appendChild(node(doc, 'div', 'meta', row.meta));
      root.appendChild(label);
    });
    doc.body.appendChild(root);
    if (typeof window.JsBarcode === 'function') {
      rows.forEach((row, index) => {
        const svg = doc.getElementById('gc-carton-barcode-' + index);
        if (svg) { try { window.JsBarcode(svg, row.code, { format: 'CODE128', displayValue: false, height: 44, margin: 2, lineColor: '#142b3d' }); } catch (_) {} }
      });
    }
    popup.focus();
    setTimeout(() => popup.print(), 300);
  }

  function attach() {
    const card = document.querySelector('#gcModal .warehouse-carton-manifest-card');
    if (!card || card.dataset.gcCartonPrintBound === '1') return;
    const head = card.querySelector('.card-head');
    if (!head) return;
    const button = node(document, 'button', 'btn', 'چاپکردنی لیبێڵەکان');
    button.type = 'button';
    button.setAttribute('aria-label', 'چاپکردنی لیبێڵی هەر کارتۆن');
    button.addEventListener('click', () => printLabels(card));
    head.appendChild(button);
    card.dataset.gcCartonPrintBound = '1';
  }

  const observer = new MutationObserver(attach);
  observer.observe(document.body, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once: true });
  else attach();
})();