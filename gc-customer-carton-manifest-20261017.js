(() => {
  'use strict';
  const BUILD = '2026-10-17.1';
  if (window.__gcCustomerCartonManifest === BUILD) return;
  window.__gcCustomerCartonManifest = BUILD;

  const dateLabel = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    try {
      return new Intl.DateTimeFormat('ckb-IQ', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Baghdad'
      }).format(date);
    } catch {
      return date.toLocaleString();
    }
  };
  const statusLabel = (value) => ({
    received: 'لە کۆگا وەرگیراوە',
    stored: 'لە کۆگا هەڵگیراوە',
    in_transit: 'لە ڕێگایە',
    delivered: 'گەیشتووە',
    on_hold: 'وەستێنراوە',
    damaged: 'زیانی پێگەیشتووە',
    lost: 'ون بووە',
    cancelled: 'هەڵوەشێنراوە'
  })[String(value || '')] || String(value || '—');

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function draw(detail) {
    const dashboardReceipts = Array.isArray(detail?.receipts)
      ? detail.receipts
      : (Array.isArray(window.__customerRelated?.receipts) ? window.__customerRelated.receipts : []);
    if (!dashboardReceipts.length) return;

    const cards = [...document.querySelectorAll('#receipts [data-receipt-id]')];
    for (const card of cards) {
      if (card.querySelector(':scope > .warehouse-carton-manifest')) continue;
      const receipt = dashboardReceipts.find((item) => String(item.id) === String(card.dataset.receiptId));
      const cartons = Array.isArray(receipt?.cartons) ? receipt.cartons : [];
      if (!cartons.length) continue;

      const section = element('section', 'warehouse-carton-manifest');
      section.setAttribute('aria-label', 'کۆدی تاکەکارتۆنەکان');
      const header = element('div', 'warehouse-carton-manifest-header');
      header.append(
        element('strong', '', 'کۆدی هەر کارتۆن'),
        element('span', 'warehouse-carton-count', String(cartons.length))
      );
      section.appendChild(header);

      const list = element('div', 'warehouse-carton-list');
      for (const carton of cartons) {
        const row = element('div', 'warehouse-carton-row');
        const info = element('div', 'warehouse-carton-info');
        info.append(
          element('strong', 'warehouse-carton-code', carton.carton_code || '—'),
          element('small', 'warehouse-carton-meta',
            String(carton.carton_index || '—') + ' / ' +
            String(carton.carton_total || cartons.length) + ' · ' +
            String(carton.warehouse_location || receipt?.location || '—'))
        );
        const right = element('div', 'warehouse-carton-side');
        right.append(
          element('span', 'warehouse-carton-status', statusLabel(carton.status)),
          element('small', 'warehouse-carton-time', dateLabel(carton.received_at || receipt?.received_at))
        );
        row.append(info, right);
        list.appendChild(row);
      }
      section.appendChild(list);
      card.appendChild(section);
    }
  }

  window.addEventListener('gc:customer-loaded', (event) => draw(event.detail));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => draw(), { once: true });
  } else {
    draw();
  }
})();