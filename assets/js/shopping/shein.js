import { supabase } from '../supabase.js';
import { calculateFinalPrice } from './pricing.js';

const $ = (id) => document.getElementById(id);
const urlInput = $('productUrl'), priceInput = $('priceUsd'), shipInput = $('shippingUsd');
const quoteBox = $('quoteBox'), orderBtn = $('orderBtn');
let exchangeRate = 1320, marginPercent = 15, currentQuote = null;

async function loadRates() {
  const { data: ex } = await supabase.from('exchange_rates').select('rate').eq('from_currency','USD').eq('to_currency','IQD').order('created_at',{ascending:false}).limit(1).maybeSingle();
  const { data: pr } = await supabase.from('pricing_rates').select('margin_percent').eq('service','shopping').limit(1).maybeSingle();
  if (ex?.rate) exchangeRate = Number(ex.rate);
  if (pr?.margin_percent != null) marginPercent = Number(pr.margin_percent);
  $('exRate').textContent = `${exchangeRate.toLocaleString()} IQD`;
  $('marginText').textContent = marginPercent;
  recalc();
}
function recalc() {
  const p = Number(priceInput.value), s = Number(shipInput.value || 0);
  const validUrl = /^https?:\/\/(www\.)?shein\.[^/]+\//i.test(urlInput.value.trim());
  if (!(p > 0) || !validUrl || !(exchangeRate > 0)) { quoteBox.classList.add('hidden'); orderBtn.disabled = true; currentQuote = null; return; }
  const result = calculateFinalPrice({productPriceUSD:p, shippingUSD:s, quantity:1, usdToIqdRate:exchangeRate, marginPercent});
  quoteBox.classList.remove('hidden');
  $('totalUsd').textContent = `$${result.totalUSD.toFixed(2)}`;
  $('marginAmount').textContent = `${Math.ceil(result.margin).toLocaleString()} IQD`;
  $('finalIqd').textContent = `${result.final.toLocaleString()} IQD`;
  orderBtn.textContent = `Order Now - ${result.final.toLocaleString()} IQD`;
  orderBtn.disabled = false; currentQuote = result;
}
[urlInput,priceInput,shipInput].forEach(el => el.addEventListener('input', recalc));
orderBtn.addEventListener('click', async () => {
  if (!currentQuote) return;
  orderBtn.disabled = true; orderBtn.textContent = 'دروستکردنی داواکاری...';
  const { data, error } = await supabase.rpc('create_shein_order', { p_product_url:urlInput.value.trim(), p_product_price_usd:Number(priceInput.value), p_product_shipping_usd:Number(shipInput.value || 0), p_quantity:1 });
  if (error) { console.error(error); alert('نەتوانرا داواکاری دروست بکرێت. تکایە Login بکە و دووبارە هەوڵ بدە.'); orderBtn.disabled=false; recalc(); return; }
  window.location.href = `/payment.html?session_id=${encodeURIComponent(data.payment_session_id)}`;
});
loadRates();
