import { supabase } from '../supabase.js';
import { initLayout } from '../layout.js';
import '/assets/js/auth-guard.js';

const $ = (id) => document.getElementById(id);
const urlInput = $('productUrl');
const priceInput = $('priceUsd');
const shipInput = $('shippingUsd');
const qtyInput = $('quantity');
const quoteBox = $('quoteBox');
const orderBtn = $('orderBtn');
let currentQuote = null;
let quoteTimer = null;
let requestSerial = 0;

await initLayout('shein');

function validSheinUrl(value) {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' && /(^|\.)shein\.[a-z]{2,}$/i.test(u.hostname);
  } catch { return false; }
}

function clearQuote() {
  currentQuote = null;
  quoteBox.hidden = true;
  orderBtn.disabled = true;
  orderBtn.textContent = 'Order Now';
}

async function refreshQuote() {
  const price = Number(priceInput.value);
  const shipping = Number(shipInput.value || 0);
  const quantity = Math.max(1, Number(qtyInput?.value || 1));
  if (!(price > 0) || shipping < 0 || !validSheinUrl(urlInput.value)) { clearQuote(); return; }

  const serial = ++requestSerial;
  orderBtn.disabled = true;
  orderBtn.textContent = 'حیسابکردن...';
  const { data, error } = await supabase.rpc('get_shein_quote', {
    p_product_price_usd: price,
    p_shipping_usd: shipping,
    p_quantity: quantity
  });
  if (serial !== requestSerial) return;
  if (error) { console.error('[SHEIN quote]', error); clearQuote(); return; }

  currentQuote = data;
  quoteBox.hidden = false;
  $('totalUsd').textContent = `$${Number(data.total_usd).toFixed(2)}`;
  $('exRate').textContent = `${Number(data.exchange_rate).toLocaleString()} IQD`;
  $('marginText').textContent = Number(data.margin_percent).toString();
  $('marginAmount').textContent = `${Number(data.margin_iqd).toLocaleString()} IQD`;
  $('finalIqd').textContent = `${Number(data.final_price_iqd).toLocaleString()} IQD`;
  orderBtn.textContent = `Order Now - ${Number(data.final_price_iqd).toLocaleString()} IQD`;
  orderBtn.disabled = false;
}

function scheduleQuote() {
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(refreshQuote, 250);
}
[urlInput, priceInput, shipInput, qtyInput].filter(Boolean).forEach((el) => el.addEventListener('input', scheduleQuote));

orderBtn.addEventListener('click', async () => {
  if (!currentQuote || !validSheinUrl(urlInput.value)) return;
  orderBtn.disabled = true;
  orderBtn.textContent = 'دروستکردنی داواکاری...';
  const idempotencyKey = crypto.randomUUID();
  const { data, error } = await supabase.rpc('create_shein_order', {
    p_product_url: urlInput.value.trim(),
    p_product_price_usd: Number(priceInput.value),
    p_product_shipping_usd: Number(shipInput.value || 0),
    p_quantity: Math.max(1, Number(qtyInput?.value || 1)),
    p_variant_info: null,
    p_idempotency_key: idempotencyKey
  });
  if (error) {
    console.error('[SHEIN order]', error);
    alert(error.message || 'نەتوانرا داواکاری دروست بکرێت.');
    orderBtn.disabled = false;
    orderBtn.textContent = `Order Now - ${Number(currentQuote.final_price_iqd).toLocaleString()} IQD`;
    return;
  }
  window.location.href = `/payment-checkout.html?invoice_id=${encodeURIComponent(data.invoice_id)}`;
});
