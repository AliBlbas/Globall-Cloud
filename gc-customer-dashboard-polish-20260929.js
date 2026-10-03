/* Customer Portal command deck — presentation layer only. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const bindSectionAnchors = () => {
    const heads = $$('.portal-section-heading');
    const ids = ['gcLiveSection', 'gcFinanceSection', 'gcRequestSection'];
    heads.forEach((head, i) => { const section = head.nextElementSibling; if (section && ids[i] && !section.id) section.id = ids[i]; });
  };
  const install = () => {
    if ($('#gcCustomerCommandDeck')) return;
    bindSectionAnchors();
    const status = $('#portalStatus'); if (!status) return;
    const deck = document.createElement('section'); deck.id = 'gcCustomerCommandDeck'; deck.className = 'gc-customer-command'; deck.setAttribute('aria-label', 'Customer command deck');
    deck.innerHTML = `<div class="gc-command-intro"><span class="gc-command-kicker">CUSTOMER COMMAND DECK</span><h2>هەموو شتێک لە یەک کۆنترۆڵ</h2><p>شوێنکەوتن، پارەدان و پشتیوانی بە workflow ـێکی ڕوون و خێرا.</p></div><nav class="gc-command-nav" aria-label="Customer dashboard navigation"><a href="#gcLiveSection"><i>⌁</i><span><b>Shipment control</b><small>شوێنکەوتن و ئاگاداری</small></span><strong>↗</strong></a><a href="#gcFinanceSection"><i>₿</i><span><b>Finance center</b><small>Invoice و payment</small></span><strong>↗</strong></a><a href="#gcRequestSection"><i>＋</i><span><b>New quote</b><small>نرخی نوێ داوا بکە</small></span><strong>↗</strong></a><a href="#gcAccountSettings"><i>◉</i><span><b>My account</b><small>پڕۆفایل و پاراستن</small></span><strong>↗</strong></a></nav><div class="gc-command-status"><i></i><span>PORTAL ONLINE</span><b id="gcCommandSync">READY</b></div>`;
    status.before(deck);
    const update = () => { const profile = window.__customerProfile; const name = profile?.full_name || profile?.name; const intro = $('.gc-command-intro h2', deck); if (name && intro) intro.textContent = `بەخێربێیت، ${name}`; const sync = $('#gcCommandSync'); if (sync) sync.textContent = window.__customerShipments ? 'SYNCED' : 'READY'; };
    update(); setInterval(update, 1800);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(install, 800), {once:true}); else setTimeout(install, 800);
})();
