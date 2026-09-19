import { supabase } from './supabase.js';

export async function initLayout(activePage) {
  if (document.querySelector('.gc-sidebar')) return;
  const sidebarHTML = `<aside class="sidebar gc-sidebar"><a href="/" class="logo">Global Cloud</a><nav><a href="/" data-page="dashboard">🚚 Logistics</a><a href="/shipments.html" data-page="shipments">📦 Shipments</a><a href="/shop/" data-page="shop" class="section">🛍️ Shop</a><a href="/shop/shein.html" data-page="shein" class="sub">SHEIN — Active</a><span class="nav-item sub disabled">Amazon — Soon</span><span class="nav-item sub disabled">1688 — Soon</span><a href="/shop/orders.html" data-page="orders">📋 My Orders</a><a href="/admin/shopping-orders.html" data-page="admin" id="adminLink" class="hidden">👑 Admin Orders</a></nav></aside>`;
  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
  document.querySelector(`[data-page="${activePage}"]`)?.classList.add('active');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  if (!error && isAdmin) document.getElementById('adminLink')?.classList.remove('hidden');
}
