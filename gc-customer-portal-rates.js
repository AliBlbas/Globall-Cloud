(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const rates = {
    chinaAir: { normal: [9, 'Normal cargo'], screen: [12, 'Screen / LCD'], battery: [14, 'Battery cargo'] },
    chinaSea: { sea: [300, 'Sea cargo'] }, usaAir: { usa: [13, 'USA air cargo'] },
    dubaiAir: { usedPhone: [15, 'Used iPhone / Android'], newPhone: [22, 'iPhone 17 / S25–S26'], laptop: [10.5, 'Laptop'], accessory: [8.25, 'Accessories'] },
    dubaiLand: { clothes: [1.5, 'Clothes / Shein'], cosmetic: [4, 'Cosmetics / electronics'], perfume: [12, 'Perfume / iHerb'] },
  };
  const options = {
    chinaAir: [['normal','Normal cargo — $9/kg'],['screen','Screen / LCD — $12/kg'],['battery','Battery cargo — $14/kg']],
    chinaSea: [['sea','Sea cargo — $300/CBM']], usaAir: [['usa','USA air — $13/kg']],
    dubaiAir: [['usedPhone','Used iPhone / Android — $15/item'],['newPhone','iPhone 17 / S25–S26 — $22/item'],['laptop','Laptop — $10.50/item'],['accessory','Accessories — $8.25/item']],
    dubaiLand: [['clothes','Clothes / Shein — $1.50/kg'],['cosmetic','Cosmetics / electronics — $4/kg'],['perfume','Perfume / iHerb — $12/kg']],
  };
  const labels = {chinaAir:'China Air',chinaSea:'China Sea',usaAir:'USA Air',dubaiAir:'Dubai Air',dubaiLand:'Dubai Land'};
  const transit = {chinaAir:'7–10 days',chinaSea:'60 days',usaAir:'10–15 days',dubaiAir:'3–7 days',dubaiLand:'14–25 days'};
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fillCategories = () => { const route = $('rateRoute'), category = $('rateCategory'); if (!route || !category) return; category.innerHTML = (options[route.value] || []).map(([v,t]) => `<option value="${v}">${t}</option>`).join(''); };
  const calculate = () => {
    const route = $('rateRoute')?.value || 'chinaAir', category = $('rateCategory')?.value || 'normal';
    const amount = Number($('rateAmount')?.value || 0), volume = Number($('rateVolume')?.value || 0), items = Number($('rateItems')?.value || 0);
    const config = rates[route]?.[category]; if (!config) return;
    let total = 0, basis = '';
    if (route === 'chinaSea') { total = volume * config[0]; basis = `${volume || 0} CBM × $${config[0]}`; }
    else if (route === 'dubaiAir') { total = items * config[0]; basis = `${items || 0} item × $${config[0]}`; }
    else { const rate = route === 'dubaiLand' && category === 'clothes' && amount > 100 ? 1.25 : config[0]; total = amount * rate; basis = `${amount || 0} kg × $${rate}`; }
    $('rateResult').innerHTML = `<strong>$${total.toLocaleString('en-US',{maximumFractionDigits:2})}</strong><span>${esc(labels[route])} · ${esc(config[1])}</span><small>${esc(basis)} · Transit: ${esc(transit[route])}</small>`;
    $('rateMinimum').textContent = amount > 0 && amount < 1 ? 'Minimum charge: 5,000 IQD for shipments under 1kg.' : 'Minimum rule: shipments under 1kg are charged at 5,000 IQD.';
  };
  const render = () => {
    const rateCards = $('rateCards'); if (rateCards) rateCards.innerHTML = Object.entries(options).map(([route, rows]) => `<article class="rate-card"><span>${esc(labels[route])}</span><strong>${esc(transit[route])}</strong><div>${rows.map(([,label]) => `<small>${esc(label)}</small>`).join('')}</div></article>`).join('');
    const delivery = $('deliveryOptions'); if (delivery) delivery.innerHTML = [['office','Office pickup','New Erbil, behind Gasha Institute','Free pickup'],['taxi-erbil','Taxi Erbil','Delivery inside Erbil','Customer pays taxi price'],['hyper-post','Hyper Post','Sulaymaniyah, Duhok and other cities','Customer pays delivery']].map(([id,title,desc,note]) => `<article class="delivery-card"><b>${esc(title)}</b><span>${esc(desc)}</span><small>${esc(note)}</small></article>`).join('');
    fillCategories(); calculate();
  };
  document.addEventListener('DOMContentLoaded', () => { render(); $('rateRoute')?.addEventListener('change', () => { fillCategories(); calculate(); }); ['rateCategory','rateAmount','rateVolume','rateItems'].forEach((id) => $(id)?.addEventListener('input', calculate)); });
})();
