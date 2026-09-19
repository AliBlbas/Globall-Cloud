export function calculateFinalPrice({ productPriceUSD, shippingUSD = 0, quantity = 1, usdToIqdRate, marginPercent, fixedFeeIqd = 0 }) {
  const product = Number(productPriceUSD) || 0;
  const shipping = Number(shippingUSD) || 0;
  const qty = Math.max(1, Number(quantity) || 1);
  const rate = Number(usdToIqdRate) || 0;
  const marginPct = Number(marginPercent) || 0;
  const totalUSD = (product + shipping) * qty;
  const totalIqd = totalUSD * rate;
  const margin = totalIqd * (marginPct / 100);
  const final = Math.ceil((totalIqd + margin + Number(fixedFeeIqd || 0)) / 250) * 250;
  return { final, totalUSD, totalIqd, margin };
}
