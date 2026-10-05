/* Route helper for the homepage quote form. Rate and billable units come from the live catalog. */
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const routes = { china: { label: 'چین', value: 'guangzhou' }, dubai: { label: 'دوبەی', value: 'dubai' }, usa: { label: 'ئەمریکا', value: 'usa' } };
  const boot = () => {
    const panel = $('.gc-rate-panel');
    if (!panel || $('#gcRateAdvanced')) return;
    const helper = document.createElement('div');
    helper.id = 'gcRateAdvanced';
    helper.className = 'gc-rate-advanced';
    helper.innerHTML = `<div class="gc-advanced-head"><span>ROUTE SELECTION</span><small>نرخەکان لە کاتالۆگی چالاک وەردەگیرێن</small></div><div class="gc-advanced-route"><div class="gc-advanced-label">سەرچاوە</div><div class="gc-route-options" role="group" aria-label="هەڵبژاردنی سەرچاوە"><button type="button" class="active" data-quote-route="china">چین</button><button type="button" data-quote-route="dubai">دوبەی</button><button type="button" data-quote-route="usa">ئەمریکا</button></div></div><p class="gc-rate-insight" id="gcRateInsight" role="status">خەمڵاندنی نرخ لە catalog ـی چالاک وەردەگیرێت؛ کۆتایی لەلایەن ستاف پشتڕاست دەکرێتەوە.</p>`;
    const weight = $('#gcRateWeight');
    weight?.closest('label')?.after(helper);
    const routeLabel = $('.gc-rate-route div:first-child strong');
    const routeInput = $('#reqOrigin');
    helper.querySelectorAll('[data-quote-route]').forEach((button) => button.addEventListener('click', () => {
      helper.querySelectorAll('[data-quote-route]').forEach((item) => item.classList.toggle('active', item === button));
      const route = routes[button.dataset.quoteRoute];
      if (routeLabel) routeLabel.textContent = route.label;
      if (routeInput) routeInput.value = route.value;
    }));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 150), { once: true });
  else setTimeout(boot, 150);
})();
