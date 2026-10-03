/* Quick Quote Calculator advanced interaction layer — no backend contract changes. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const modes = { air: { divisor: 167, name: 'Air' }, sea: { divisor: 1, name: 'Sea' }, land: { divisor: 333, name: 'Land' } };
  const routes = { china: { label: 'چین · گوانگژۆ', value: 'guangzhou' }, dubai: { label: 'دوبەی · Jebel Ali', value: 'dubai' }, usa: { label: 'ئەمریکا · Miami', value: 'miami' } };
  const boot = () => {
    const panel = $('.gc-rate-panel'); if (!panel || $('#gcRateAdvanced')) return;
    const advanced = document.createElement('div'); advanced.id = 'gcRateAdvanced'; advanced.className = 'gc-rate-advanced';
    advanced.innerHTML = `<div class="gc-advanced-head"><span>ADVANCED CARGO PROFILE</span><small>بۆ تخمینێکی وردتر</small></div><div class="gc-advanced-route"><div class="gc-advanced-label">کۆری Origin</div><div class="gc-route-options" role="group" aria-label="هەڵبژاردنی کۆری سەرچاوە"><button type="button" class="active" data-quote-route="china">چین</button><button type="button" data-quote-route="dubai">دوبەی</button><button type="button" data-quote-route="usa">ئەمریکا</button></div></div><div class="gc-advanced-fields"><label><span>قەبارە (CBM)</span><input id="gcRateVolume" type="number" min="0" max="1000" step="0.01" value="0" inputmode="decimal"><small>ئەگەر بەردەستە</small></label><div><span class="gc-advanced-label">ئاستی خزمەت</span><div class="gc-service-levels" role="group" aria-label="ئاستی خزمەت"><button type="button" class="active" data-quote-service="standard">Standard</button><button type="button" data-quote-service="express">Express</button><button type="button" data-quote-service="priority">Priority</button></div></div></div><div class="gc-rate-insight" id="gcRateInsight"><i>✦</i><span>کێشی بار بنووسە بۆ profile ـێکی زیندوو.</span></div>`;
    const weight = $('#gcRateWeight'); weight?.closest('label')?.after(advanced);
    const routeLabel = $('.gc-rate-route div:first-child strong');
    const routeHidden = $('#reqOrigin');
    const getMode = () => $('.gc-rate-mode.active')?.dataset.rateMode || 'air';
    const updateInsight = () => { const mode = getMode(); const kg = Math.max(1, Number(weight?.value) || 10); const volume = Math.max(0, Number($('#gcRateVolume')?.value) || 0); const chargeable = volume ? Math.max(kg, Math.round(volume * (modes[mode]?.divisor || 167))) : kg; const service = $('.gc-service-levels button.active')?.dataset.quoteService || 'standard'; const label = service === 'priority' ? 'Priority lane' : service === 'express' ? 'Express lane' : 'Standard lane'; const el = $('#gcRateInsight span'); if (el) el.textContent = `${modes[mode]?.name || 'Air'} · ${chargeable} KG chargeable profile · ${label}`; };
    advanced.querySelectorAll('[data-quote-route]').forEach(button => button.addEventListener('click', () => { advanced.querySelectorAll('[data-quote-route]').forEach(x => x.classList.toggle('active', x === button)); const route = routes[button.dataset.quoteRoute]; if (routeLabel && route) routeLabel.textContent = route.label; if (routeHidden && route) routeHidden.value = route.value; updateInsight(); }));
    advanced.querySelectorAll('[data-quote-service]').forEach(button => button.addEventListener('click', () => { advanced.querySelectorAll('[data-quote-service]').forEach(x => x.classList.toggle('active', x === button)); updateInsight(); }));
    $('#gcRateVolume')?.addEventListener('input', updateInsight); weight?.addEventListener('input', updateInsight);
    document.querySelectorAll('[data-rate-mode]').forEach(button => button.addEventListener('click', updateInsight));
    updateInsight();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 150), {once:true}); else setTimeout(boot, 150);
})();
